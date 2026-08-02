# @orbit-id/core

Reference implementation of Orbit ID for the monorepo.

- **v1** (default export): stable 64-bit wire format
- **v2** (`v2` namespace / `@orbit-id/core/v2`): Draft 128-bit layout (`v2.0.0-alpha`)

## API

```ts
import { encode, parse, OrbitGenerator, isValid } from "@orbit-id/core";
import * as v2 from "@orbit-id/core/v2";
// or: import { v2 } from "@orbit-id/core";

const v1Id = new OrbitGenerator({ node: 7 }).generate(1);
const v2Id = new v2.OrbitGeneratorV2({ node: 7 }).generate(1);
```

See [Library API](../../docs/en/library-api.md) and fixtures in [`spec/conformance/`](../../spec/conformance/).
