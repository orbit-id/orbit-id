# Type field guidance

[日本語](../ja/type-registry.md)

Type is a 6-bit field (`0..63`) naming a long-lived **logical entity kind**, not a physical table.
Do not encode implementation details such as state, permissions, roles, or table sharding into Type.

## Ownership

**Orbit ID does not define a global catalog of entity names.**

Each deployer / organization chooses which numeric values mean what. Whether to publish that map
is up to them.

Wire-format interoperability does not require a shared vocabulary of Type names — only that encoded
values stay in `0..63` and that a given deployment never reassigns a meaning once IDs exist in
durable storage.

## Spec rules (public)

- Valid values are `0..63`.
- Value `0` is **reserved**. Implementations MUST reject `generate(0)`. Use it only as a sentinel /
  “unspecified” marker outside issued IDs if needed.
- Values `1..63` are available for application assignment.
- Once a value has been used in durable / shared data for a deployment, its meaning MUST NOT be
  changed or reused in that deployment. Prefer retiring a value as unused rather than repurposing it.
- Experimental assignments MUST NOT be mixed into shared production data from another Type map.
- Add a new Type only when there is a persistent identity boundary that existing Types in **your**
  map cannot express.
- Do not assign mutable roles such as `USER` / `ADMIN`, or states such as `ACTIVE` / `DELETED`, to
  Type.

## Modeling guidance

If an entity later gains new privileges or roles, do not change the Type of existing IDs. If a
separate logical entity is required, issue a new ID under a different Type value and relate the two
in the data model.

Libraries treat Type as an integer. Named constants belong in application code, not in this
specification.
