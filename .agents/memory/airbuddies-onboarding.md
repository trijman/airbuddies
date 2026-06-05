---
name: Airbuddies onboarding routing
description: How first-launch onboarding detection and routing works in the Airbuddies Expo app
---

# Onboarding routing pattern

**Rule:** New users are redirected to `/onboarding` before reaching the tabs.

**How:**
- `AppContext` checks `AsyncStorage.getItem("onboarding_done_v1")` in `loadData()`.
- Exposes `onboardingComplete: boolean | null` (null = still loading) and `completeOnboarding(profile)`.
- `RootLayoutNav` in `_layout.tsx` uses `useEffect` watching `onboardingComplete`: if `false`, calls `router.replace("/onboarding")`.
- After wizard completes, `completeOnboarding()` sets `onboarding_done_v1 = "1"` and calls `router.replace("/(tabs)")`.

**Why:** Expo Router is file-based so the Stack always renders; the redirect happens imperatively after context loads. A `<Redirect>` component won't work without a rendered Stack parent.

**How to apply:** Any future first-launch feature (e.g. permissions prompt) should follow this same pattern — check a separate AsyncStorage key, expose state from AppContext, redirect from RootLayoutNav.
