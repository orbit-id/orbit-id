# @orbit-id/core

Reference implementation of Orbit ID for the monorepo.

- **v2** (default export / `@orbit-id/core/v2`): Stable 128-bit wire format
- **v1** (`v1` namespace / `@orbit-id/core/v1`): Stable 64-bit wire format

Consumer migration: [1.x → 2.0.0](../../docs/en/migration-1x-to-2.0.0.md). Registry `2.0.0` cut is slice J of the [promotion plan](../../docs/en/v2-package-2.0.0.md).

## API

```ts
import { encode, parse, OrbitGeneratorV2, isValid, v1 } from "@orbit-id/core";
import * as v2 from "@orbit-id/core/v2"; // alias of root

const v2Id = new OrbitGeneratorV2({ node: 7 }).generate(1);
const v1Id = new v1.OrbitGenerator({ node: 7 }).generate(1);
```

See [Library API](../../docs/en/library-api.md) and fixtures in [`spec/conformance/`](../../spec/conformance/).
