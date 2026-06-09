import re, sys, os

PBXPROJ = "ios/Airbuddies.xcodeproj/project.pbxproj"
TEAM_ID = "72CS7BMND3"

# ── Patch pbxproj: Manual signing with Distribution identity ─────────────────
# We do NOT hardcode PROVISIONING_PROFILE_SPECIFIER — eas/run_fastlane installs
# the profile with the correct Apple UUID; Xcode auto-selects it by team + bundle ID.
print("=== Patching pbxproj for Manual Distribution signing ===")
with open(PBXPROJ) as f:
    content = f.read()

original = content

# 1. Switch to iPhone Distribution (ad hoc / app-store profile)
content = re.sub(r'CODE_SIGN_IDENTITY = "iPhone Developer";',
                 'CODE_SIGN_IDENTITY = "iPhone Distribution";', content)
content = re.sub(r'"CODE_SIGN_IDENTITY\[sdk=iphoneos\*\]" = "[^"]*";',
                 '"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "iPhone Distribution";', content)

# 2. Set development team
content = re.sub(r'DEVELOPMENT_TEAM = [^;]*;',
                 f'DEVELOPMENT_TEAM = {TEAM_ID};', content)
if TEAM_ID not in content:
    content = content.replace(
        'CODE_SIGN_IDENTITY = "iPhone Distribution";',
        f'CODE_SIGN_IDENTITY = "iPhone Distribution";\n\t\t\t\tDEVELOPMENT_TEAM = {TEAM_ID};'
    )

# 3. Remove or clear any hardcoded PROVISIONING_PROFILE_SPECIFIER so Xcode
#    auto-selects the installed profile matching our team/bundle-ID/identity.
content = re.sub(r'PROVISIONING_PROFILE_SPECIFIER = [^;]*;',
                 'PROVISIONING_PROFILE_SPECIFIER = "";', content)

# 4. Ensure CODE_SIGN_STYLE = Manual
content = re.sub(r'CODE_SIGN_STYLE = Automatic;',
                 'CODE_SIGN_STYLE = Manual;', content)

with open(PBXPROJ, "w") as f:
    f.write(content)

print(f"iPhone Distribution occurrences: {content.count('iPhone Distribution')}")
print(f"DEVELOPMENT_TEAM ({TEAM_ID}): {content.count(TEAM_ID)} occurrences")
print(f"CODE_SIGN_STYLE = Manual: {content.count('CODE_SIGN_STYLE = Manual')}")
print(f"PROVISIONING_PROFILE_SPECIFIER cleared: {'YES' if 'PROVISIONING_PROFILE_SPECIFIER = \"\";' in content else 'NO'}")
if content == original:
    print("WARNING: pbxproj unchanged — verify expo prebuild key names")
print("=== Done ===")
