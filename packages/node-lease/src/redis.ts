import type { LeaseRecord, LeaseStore } from "./types.js";

/** Minimal Redis surface used by the lease store (compatible with ioredis). */
export type RedisLike = {
  eval(
    script: string,
    numKeys: number,
    ...args: (string | Buffer)[]
  ): Promise<unknown>;
  hgetall(key: string): Promise<Record<string, string>>;
};

/**
 * v1 path (`maxNode ≤ 127`): linear scan of per-node hashes (unchanged layout).
 * Refuses to run if this prefix was already switched to free-pool mode.
 */
const ACQUIRE_LUA_V1 = `
local prefix = KEYS[1]
local maxNode = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local quarantine = tonumber(ARGV[4])
local owner = ARGV[5]
if redis.call('GET', prefix .. 'mode') == 'free-pool' then
  return {'ERR_FREE_POOL_MODE'}
end
for node = 0, maxNode do
  local key = prefix .. node
  local held = redis.call('HGETALL', key)
  if #held == 0 then
    redis.call('HSET', key, 'owner', owner, 'expires', tostring(now + ttl), 'state', 'held')
    redis.call('PEXPIRE', key, ttl + quarantine)
    return {tostring(node), owner, tostring(now + ttl)}
  end
  local map = {}
  for i = 1, #held, 2 do map[held[i]] = held[i+1] end
  local state = map['state']
  local expires = tonumber(map['expires'] or '0')
  if state == 'quarantine' and expires <= now then
    redis.call('HSET', key, 'owner', owner, 'expires', tostring(now + ttl), 'state', 'held')
    redis.call('PEXPIRE', key, ttl + quarantine)
    return {tostring(node), owner, tostring(now + ttl)}
  end
  if state == 'held' and expires <= now then
    redis.call('HSET', key, 'owner', owner, 'expires', tostring(now + ttl), 'state', 'held')
    redis.call('PEXPIRE', key, ttl + quarantine)
    return {tostring(node), owner, tostring(now + ttl)}
  end
end
return nil
`;

/**
 * Wide-range path (`maxNode > 127`): O(1) free pool + bump allocator.
 * Keys: `{prefix}mode`, `{prefix}free`, `{prefix}next`, `{prefix}quarantine`,
 * `{prefix}held-exp`, plus per-node hashes `{prefix}{nodeId}`.
 * Do not share a prefix with an in-use v1 linear-scan deployment without a cutover.
 */
const ACQUIRE_LUA_V2 = `
local prefix = KEYS[1]
local maxNode = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local quarantine = tonumber(ARGV[4])
local owner = ARGV[5]
local freeKey = prefix .. 'free'
local nextKey = prefix .. 'next'
local qKey = prefix .. 'quarantine'
local heldExpKey = prefix .. 'held-exp'
local modeKey = prefix .. 'mode'
redis.call('SET', modeKey, 'free-pool')

local ready = redis.call('ZRANGEBYSCORE', qKey, '-inf', now)
for i = 1, #ready do
  local node = ready[i]
  redis.call('ZREM', qKey, node)
  redis.call('DEL', prefix .. node)
  redis.call('SADD', freeKey, node)
end

local expired = redis.call('ZRANGEBYSCORE', heldExpKey, '-inf', now)
for i = 1, #expired do
  local node = expired[i]
  local key = prefix .. node
  local state = redis.call('HGET', key, 'state')
  local expires = tonumber(redis.call('HGET', key, 'expires') or '0')
  redis.call('ZREM', heldExpKey, node)
  if not state then
    -- Hash already gone (PEXPIRE); return node to the free pool.
    redis.call('SADD', freeKey, node)
  elseif state == 'held' and expires <= now then
    -- Match MemoryLeaseStore / node-management: quarantine after lease expiry.
    redis.call('HSET', key, 'state', 'quarantine', 'expires', tostring(now + quarantine), 'owner', '')
    redis.call('PEXPIRE', key, quarantine)
    redis.call('ZADD', qKey, now + quarantine, node)
  end
end

local function claim(node)
  local key = prefix .. node
  local state = redis.call('HGET', key, 'state')
  local expires = tonumber(redis.call('HGET', key, 'expires') or '0')
  if state == 'held' and expires > now then
    return nil
  end
  if state == 'quarantine' and expires > now then
    return nil
  end
  local exp = now + ttl
  redis.call('HSET', key, 'owner', owner, 'expires', tostring(exp), 'state', 'held')
  redis.call('PEXPIRE', key, ttl + quarantine)
  redis.call('ZADD', heldExpKey, exp, node)
  return {node, owner, tostring(exp)}
end

local deferred = {}
while true do
  local node = redis.call('SPOP', freeKey)
  if not node then break end
  if tonumber(node) > maxNode then
    table.insert(deferred, node)
  else
    local claimed = claim(node)
    if claimed then
      for _, d in ipairs(deferred) do redis.call('SADD', freeKey, d) end
      return claimed
    end
  end
end
for _, d in ipairs(deferred) do redis.call('SADD', freeKey, d) end

local nextNode = tonumber(redis.call('GET', nextKey) or '0')
while nextNode <= maxNode do
  redis.call('SET', nextKey, nextNode + 1)
  local claimed = claim(tostring(nextNode))
  if claimed then return claimed end
  nextNode = nextNode + 1
end

return nil
`;

/** Renew: branch on durable `{prefix}mode` so process restarts stay correct. */
const RENEW_LUA = `
local prefix = KEYS[1]
local node = ARGV[1]
local owner = ARGV[2]
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])
local quarantine = tonumber(ARGV[5])
local mode = redis.call('GET', prefix .. 'mode')
local key = prefix .. node
if redis.call('HGET', key, 'owner') ~= owner then return 0 end
if redis.call('HGET', key, 'state') ~= 'held' then return 0 end
local expires = tonumber(redis.call('HGET', key, 'expires') or '0')
if expires <= now then return 0 end
local exp = now + ttl
redis.call('HSET', key, 'expires', tostring(exp), 'state', 'held')
redis.call('PEXPIRE', key, ttl + quarantine)
if mode == 'free-pool' then
  redis.call('ZADD', prefix .. 'held-exp', exp, node)
end
return 1
`;

/** Release: same durable mode branch. */
const RELEASE_LUA = `
local prefix = KEYS[1]
local node = ARGV[1]
local owner = ARGV[2]
local now = tonumber(ARGV[3])
local quarantine = tonumber(ARGV[4])
local mode = redis.call('GET', prefix .. 'mode')
local key = prefix .. node
if redis.call('HGET', key, 'owner') ~= owner then return 0 end
redis.call('HSET', key, 'state', 'quarantine', 'expires', tostring(now + quarantine), 'owner', '')
redis.call('PEXPIRE', key, quarantine)
if mode == 'free-pool' then
  redis.call('ZREM', prefix .. 'held-exp', node)
  redis.call('ZADD', prefix .. 'quarantine', now + quarantine, node)
end
return 1
`;

const V1_MAX_NODE = 127;

/** Redis-backed store. Uses Lua for atomic acquire / renew / release. */
export class RedisLeaseStore implements LeaseStore {
  constructor(
    private readonly redis: RedisLike,
    private readonly keyPrefix = "orbit:node-lease:",
    private readonly quarantineMsDefault = 120_000,
  ) {}

  async tryAcquire(params: {
    ownerToken: string;
    ttlMs: number;
    nowMs: number;
    maxNode: number;
    quarantineMs: number;
  }): Promise<LeaseRecord | null> {
    const useFreePool = params.maxNode > V1_MAX_NODE;
    const script = useFreePool ? ACQUIRE_LUA_V2 : ACQUIRE_LUA_V1;
    const result = (await this.redis.eval(
      script,
      1,
      this.keyPrefix,
      String(params.maxNode),
      String(params.nowMs),
      String(params.ttlMs),
      String(params.quarantineMs),
      params.ownerToken,
    )) as string[] | null;
    if (!result || result.length === 0) return null;
    if (result[0] === "ERR_FREE_POOL_MODE") {
      throw new Error(
        "NODE_LEASE_MODE: prefix is in free-pool mode; refuse linear-scan acquire (use maxNode > 127 or a new prefix)",
      );
    }
    if (result.length < 3) return null;
    return {
      nodeId: Number(result[0]),
      ownerToken: result[1]!,
      expiresAtMs: Number(result[2]),
    };
  }

  async renew(params: {
    nodeId: number;
    ownerToken: string;
    ttlMs: number;
    nowMs: number;
  }): Promise<boolean> {
    const ok = await this.redis.eval(
      RENEW_LUA,
      1,
      this.keyPrefix,
      String(params.nodeId),
      params.ownerToken,
      String(params.nowMs),
      String(params.ttlMs),
      String(this.quarantineMsDefault),
    );
    return Number(ok) === 1;
  }

  async release(params: {
    nodeId: number;
    ownerToken: string;
    nowMs: number;
    quarantineMs: number;
  }): Promise<boolean> {
    const ok = await this.redis.eval(
      RELEASE_LUA,
      1,
      this.keyPrefix,
      String(params.nodeId),
      params.ownerToken,
      String(params.nowMs),
      String(params.quarantineMs),
    );
    return Number(ok) === 1;
  }

  async get(nodeId: number): Promise<LeaseRecord | null> {
    const key = `${this.keyPrefix}${nodeId}`;
    const map = await this.redis.hgetall(key);
    if (!map || map.state !== "held" || !map.owner) return null;
    return {
      nodeId,
      ownerToken: map.owner,
      expiresAtMs: Number(map.expires),
    };
  }
}
