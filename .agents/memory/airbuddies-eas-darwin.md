---
name: Airbuddies EAS darwin overrides
description: Removing darwin binary overrides from pnpm-workspace.yaml is required for cold EAS macOS builds to succeed
---

# Darwin binary overrides must be absent for EAS builds

`pnpm-workspace.yaml` originally excluded all darwin (macOS) platform binaries for esbuild, lightningcss, rollup, @tailwindcss/oxide, and @expo/ngrok-bin via pnpm `overrides`. These exclusions were designed to save disk space in Replit's Linux dev environment.

EAS builds iOS on macOS workers. With those darwin overrides in place, `pnpm install` fails on the macOS worker ("Install dependencies" phase error) unless EAS happens to reuse a cached node_modules fingerprint from a prior successful build. Any fingerprint-busting change (new package, lockfile update) will expose the failure.

**Fix applied:** All darwin-specific overrides were removed from `pnpm-workspace.yaml`. The remaining overrides (freebsd, android, win32, etc.) are harmless on macOS workers — pnpm skips them via `os`/`cpu` guards in those packages' manifests.

**Why it's safe on Replit:** pnpm naturally skips installing non-Linux optional packages on Linux. The explicit `-` override for darwin was redundant safety that backfired on macOS EAS workers.

**How to apply:** Do NOT re-add darwin overrides to `pnpm-workspace.yaml`. If you want to add a new platform-optional package exclusion, only add non-darwin platforms (win32, freebsd, android, etc.) or verify that EAS workers won't need those binaries.

**eas.json:** The preview profile uses `"pnpm": "10.10.0"` to match the lockfile format generated locally by pnpm v10. Do not downgrade below 9.4.0 (minimumReleaseAge feature boundary) or to a version incompatible with lockfileVersion 9.0.
