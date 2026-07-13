# Security Policy

[English](../en/security.md)

## Supported versions

Orbit ID はまだ Draft であり、サポート対象の stable release はありません。

## Reporting a vulnerability

公開 issue に詳細を書く前に、GitHub の Security Advisories（Private vulnerability reporting が有効な
場合）から報告してください。利用できない場合は、機密情報を含まない issue で非公開の連絡方法を
問い合わせてください。

報告には、影響する仕様・実装、再現条件、重複が起こり得る Timestamp / Node / Sequence、想定される
影響範囲を含めてください。

## Security properties

Orbit ID が提供する主な性質は、仕様の前提を満たした generator による ID の一意性です。
次の性質は提供しません。

- confidentiality / unpredictability
- authentication / authorization
- tamper detection
- proof of origin
- protection against insecure direct object references (IDOR)

外部入力の ID を信頼して認可判断を行わず、必ず対象 resource へのアクセス権を別途検証してください。
