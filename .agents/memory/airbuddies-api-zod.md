---
name: Airbuddies api-zod codegen conflict
description: After running Orval codegen, api-zod/src/index.ts causes duplicate export errors if it re-exports both generated files
---

# api-zod duplicate export fix

**Rule:** `lib/api-zod/src/index.ts` must only contain `export * from "./generated/api"` — never also export `./generated/types`.

**Why:** Orval generates two outputs: `api.ts` (Zod schemas with same names as types) and `types/` (TypeScript interfaces). Both export identical names like `GetFlightPassengersParams`. Re-exporting both causes TS2308 "already exported" errors.

**How to apply:** After every `pnpm --filter @workspace/api-spec run codegen` run, verify `lib/api-zod/src/index.ts` only exports `./generated/api`. If codegen overwrites it, restore the single-export version.
