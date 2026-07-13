# Orbit Type Registry

[日本語](../ja/type-registry.md)

Type represents a long-lived logical entity, not a physical table.
Do not encode implementation details such as state, permissions, roles, or table sharding into Type.

## Registry rules

- Valid values are `0..63`.
- Once assigned in a stable release, a value's meaning MUST NOT be changed or reused.
- Retired values remain reserved as `DEPRECATED`.
- Experimental assignments MUST NOT be persisted in stable data.
- Add a new Type only when there is a persistent identity boundary that existing Types cannot express.
- Record the rationale and migration impact for Type additions or changes in a pull request.

## Assigned values

Because v1 is still Draft, only `RESERVED` is an official assignment.

| Value | Name | Status | Description |
| ---: | --- | --- | --- |
| 0 | `RESERVED` | Reserved | Must not be issued. For unspecified / sentinel use |
| 1..63 | — | Unassigned | Reserved for future assignment |

## Initial proposal

The following are discussion starters only. Do not use them until promoted into the stable
specification.

| Proposed value | Name | Intended meaning |
| ---: | --- | --- |
| 1 | `ACCOUNT` | Account identity for a person or service |
| 2 | `TALENT` | Talent identity |
| 3 | `EVENT` | Event identity |
| 4 | `CONTENT` | Published or delivered content identity |
| 5 | `MEMBERSHIP` | Membership identity |
| 6 | `TRANSACTION` | Monetary / points transaction identity |
| 7 | `NOTIFICATION` | Notification identity |
| 8 | `AUDIT` | Audit event identity |
| 9 | `MEDIA` | Media asset identity |
| 10 | `ORGANIZATION` | Organization identity |

## Modeling guidance

If an `ACCOUNT` later gains talent privileges, do not change the Type of the existing Account ID.
If a separate Talent entity is required, issue a new Talent ID and relate the two in the data model.

Do not assign mutable roles such as `USER` / `ADMIN`, or states such as `ACTIVE` / `DELETED`, to Type.
