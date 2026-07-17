# Security Policy

Canonical English: [docs/en/security.md](docs/en/security.md)  
日本語: [docs/ja/security.md](docs/ja/security.md)

## Supported versions

| Version | Supported |
| --- | --- |
| `v1.1.x` | Yes |
| `v1.0.x` | Yes |

## Reporting a vulnerability

Before posting details in a public issue, report via GitHub Security Advisories (when Private
vulnerability reporting is enabled). If that is unavailable, open an issue without sensitive details
and ask for a private contact channel.

Include the affected specification or implementation, reproduction conditions, Timestamp / Node /
Sequence values that could collide, and the expected impact.

## Security properties

The main property Orbit ID provides is uniqueness from generators that follow the specification
assumptions. It does not provide:

- confidentiality / unpredictability
- authentication / authorization
- tamper detection
- proof of origin
- protection against insecure direct object references (IDOR)

Do not authorize based on trusting an externally supplied ID alone. Always verify access rights to
the target resource separately.
