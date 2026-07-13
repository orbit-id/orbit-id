# Orbit Type Registry

[日本語](../ja/type-registry.md)

Type represents a long-lived logical entity, not a physical table.
Do not encode implementation details such as state, permissions, roles, or table sharding into Type.

## Registry rules

- Valid values are `0..63`.
- Once assigned in a stable release, a value's meaning MUST NOT be changed or reused.
- Before stable v1, draft assignments MAY change only via a documented pull request with migration
  impact.
- Retired values remain reserved as `DEPRECATED`.
- Experimental assignments MUST NOT be persisted in stable data. Use a private / non-registry Type
  space only in disposable environments; do not ship those values in shared production data.
- Add a new Type only when there is a persistent identity boundary that existing Types cannot express.
- Record the rationale and migration impact for Type additions or changes in a pull request.

## Assigned values

The following values are the **draft-official** Orbit Type assignments for v1. They are the values
implementations and documentation SHOULD use. Meanings remain changeable until stable v1; after
stable v1 they follow the registry rules above.

| Value | Name | Status | Description |
| ---: | --- | --- | --- |
| 0 | `RESERVED` | Reserved | Must not be issued. For unspecified / sentinel use |
| 1 | `ACCOUNT` | Assigned (draft) | Account identity for a person or service |
| 2 | `TALENT` | Assigned (draft) | Talent identity |
| 3 | `EVENT` | Assigned (draft) | Event identity |
| 4 | `CONTENT` | Assigned (draft) | Published or delivered content identity |
| 5 | `MEMBERSHIP` | Assigned (draft) | Membership identity |
| 6 | `TRANSACTION` | Assigned (draft) | Monetary / points transaction identity |
| 7 | `NOTIFICATION` | Assigned (draft) | Notification identity |
| 8 | `AUDIT` | Assigned (draft) | Audit event identity |
| 9 | `MEDIA` | Assigned (draft) | Media asset identity |
| 10 | `ORGANIZATION` | Assigned (draft) | Organization identity |
| 11..63 | — | Unassigned | Reserved for future assignment |

## Modeling guidance

If an `ACCOUNT` later gains talent privileges, do not change the Type of the existing Account ID.
If a separate Talent entity is required, issue a new Talent ID and relate the two in the data model.

Do not assign mutable roles such as `USER` / `ADMIN`, or states such as `ACTIVE` / `DELETED`, to Type.
