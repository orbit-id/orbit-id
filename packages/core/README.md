# @orbit-id/core

Reference implementation of Orbit ID for the monorepo.

- **v2** (default export / `@orbit-id/core/v2`): Stable 128-bit wire format
- **v1** (`v1` namespace / `@orbit-id/core/v1`): Stable 64-bit wire format

Until package major `2.0.0` is cut on registries, treat this root swap as the in-tree API for the
promotion train ([#203](https://github.com/orbit-id/orbit-id/issues/203)).

## API

```ts
import { encode, parse, OrbitGeneratorV2, isValid, v1 } from "@orbit-id/core";
import * as v2 from "@orbit-id/core/v2"; // alias of root

const v2Id = new OrbitGeneratorV2({ node: 7 }).generate(1);
const v1Id = new v1.OrbitGenerator({ node: 7 }).generate(1);
```

See [Library API](../../docs/en/library-api.md) and fixtures in [`spec/conformance/`](../../spec/conformance/).
