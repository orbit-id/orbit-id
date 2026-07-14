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

const ACQUIRE_LUA = `
local prefix = KEYS[1]
local maxNode = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local quarantine = tonumber(ARGV[4])
local owner = ARGV[5]
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

const RENEW_LUA = `
local key = KEYS[1]
local owner = ARGV[1]
local now = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local quarantine = tonumber(ARGV[4])
if redis.call('HGET', key, 'owner') ~= owner then return 0 end
if redis.call('HGET', key, 'state') ~= 'held' then return 0 end
local expires = tonumber(redis.call('HGET', key, 'expires') or '0')
if expires <= now then return 0 end
redis.call('HSET', key, 'expires', tostring(now + ttl), 'state', 'held')
redis.call('PEXPIRE', key, ttl + quarantine)
return 1
`;

const RELEASE_LUA = `
local key = KEYS[1]
local owner = ARGV[1]
local now = tonumber(ARGV[2])
local quarantine = tonumber(ARGV[3])
if redis.call('HGET', key, 'owner') ~= owner then return 0 end
redis.call('HSET', key, 'state', 'quarantine', 'expires', tostring(now + quarantine), 'owner', '')
redis.call('PEXPIRE', key, quarantine)
return 1
`;

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
    const result = (await this.redis.eval(
      ACQUIRE_LUA,
      1,
      this.keyPrefix,
      String(params.maxNode),
      String(params.nowMs),
      String(params.ttlMs),
      String(params.quarantineMs),
      params.ownerToken,
    )) as string[] | null;
    if (!result || result.length < 3) return null;
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
    const key = `${this.keyPrefix}${params.nodeId}`;
    const ok = await this.redis.eval(
      RENEW_LUA,
      1,
      key,
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
    const key = `${this.keyPrefix}${params.nodeId}`;
    const ok = await this.redis.eval(
      RELEASE_LUA,
      1,
      key,
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
