# Orbit Type Registry

[日本語](../ja/type-registry.md)

Type represents a long-lived logical entity, not a physical table.
Do not encode implementation details such as state, permissions, roles, or table sharding into Type.

## Registry rules

- Valid values are `0..63`.
- Once assigned in a stable release, a value's meaning MUST NOT be changed or reused.
- New assignments after stable v1 MUST be additive (unassigned values only) and recorded in a
  pull request with rationale and migration impact.
- Retired values remain reserved as `DEPRECATED`.
- Experimental assignments MUST NOT be persisted in stable data. Use a private / non-registry Type
  space only in disposable environments; do not ship those values in shared production data.
- Add a new Type only when there is a persistent identity boundary that existing Types cannot express.
- Record the rationale and migration impact for Type additions or changes in a pull request.

## Assigned values

The following values are the **official** Orbit Type assignments for stable v1. Implementations and
documentation SHOULD use these values. Meanings MUST NOT change within v1 (see registry rules above).

| Value | Name | Status | Description |
| ---: | --- | --- | --- |
| 0 | `RESERVED` | Reserved | Must not be issued. For unspecified / sentinel use |
| 1 | `ACCOUNT` | Assigned | Account identity for a person or service |
| 2 | `TALENT` | Assigned | Talent identity |
| 3 | `EVENT` | Assigned | Event identity |
| 4 | `CONTENT` | Assigned | Published or delivered content identity |
| 5 | `MEMBERSHIP` | Assigned | Membership identity |
| 6 | `TRANSACTION` | Assigned | Monetary / points transaction identity |
| 7 | `NOTIFICATION` | Assigned | Notification identity |
| 8 | `AUDIT` | Assigned | Audit event identity |
| 9 | `MEDIA` | Assigned | Media asset identity |
| 10 | `ORGANIZATION` | Assigned | Organization identity |
| 11..63 | — | Unassigned | Reserved for future assignment |

## Modeling guidance

If an `ACCOUNT` later gains talent privileges, do not change the Type of the existing Account ID.
If a separate Talent entity is required, issue a new Talent ID and relate the two in the data model.

Do not assign mutable roles such as `USER` / `ADMIN`, or states such as `ACTIVE` / `DELETED`, to Type.
