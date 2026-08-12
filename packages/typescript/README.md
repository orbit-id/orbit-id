# @orbit-id/typescript

TypeScript package for Orbit ID. Re-exports [`@orbit-id/core`](../core/).

- **v2** (default export / `@orbit-id/typescript/v2`): Stable 128-bit wire format
- **v1** (`v1` namespace / `@orbit-id/typescript/v1`): Stable 64-bit wire format

## API

```ts
import { encode, parse, OrbitGeneratorV2, isValid, v1 } from "@orbit-id/typescript";
import * as v2 from "@orbit-id/typescript/v2"; // alias of root

const v2Id = new OrbitGeneratorV2({ node: 7 }).generate(1);
const v1Id = new v1.OrbitGenerator({ node: 7 }).generate(1);
```

See [Library API](../../docs/en/library-api.md) and fixtures in [`spec/conformance/`](../../spec/conformance/).
