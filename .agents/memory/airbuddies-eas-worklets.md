---
name: Airbuddies EAS build – worklets peer dep
description: react-native-worklets must stay in package.json; it is a required peer of react-native-reanimated 4.x
---

# react-native-worklets must stay

`react-native-reanimated@~4.1.x` declares `react-native-worklets@"0.5 - 0.8"` as a peer dependency. Removing worklets from `artifacts/airbuddies/package.json` causes a peer resolution warning locally and "Install dependencies" failures on EAS workers that don't have a cached node_modules.

**Why:** A previous task removed worklets thinking it caused a crash. The actual culprit was `react-native-keyboard-controller`, which has since been fully removed. Worklets is needed by reanimated and must stay.

**How to apply:** If you see a pnpm peer-dep warning about react-native-worklets being missing, do NOT remove it — check if reanimated is still at v4.x. If you need to drop worklets, you must simultaneously downgrade reanimated to v3.x (which bundles its own worklet runtime).
