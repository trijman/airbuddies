import re, sys

PBXPROJ = "ios/Airbuddies.xcodeproj/project.pbxproj"
PROFILE_UUID = "342d4c3b-313c-4394-bd51-ee3d245a490d"
TEAM_ID = "72CS7BMND3"

with open(PBXPROJ) as f:
    content = f.read()

original = content

# 1. Replace any CODE_SIGN_IDENTITY value with iPhone Distribution
content = re.sub(
    r'CODE_SIGN_IDENTITY = "iPhone Developer";',
    'CODE_SIGN_IDENTITY = "iPhone Distribution";',
    content
)
content = re.sub(
    r'"CODE_SIGN_IDENTITY\[sdk=iphoneos\*\]" = "[^"]*";',
    '"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "iPhone Distribution";',
    content
)

# 2. Ensure DEVELOPMENT_TEAM is set
content = re.sub(
    r'DEVELOPMENT_TEAM = [^;]*;',
    f'DEVELOPMENT_TEAM = {TEAM_ID};',
    content
)
# If DEVELOPMENT_TEAM was missing entirely, add it near CODE_SIGN_IDENTITY
if TEAM_ID not in content:
    content = content.replace(
        'CODE_SIGN_IDENTITY = "iPhone Distribution";',
        f'CODE_SIGN_IDENTITY = "iPhone Distribution";\n\t\t\t\tDEVELOPMENT_TEAM = {TEAM_ID};'
    )

# 3. Set PROVISIONING_PROFILE_SPECIFIER to exact UUID
content = re.sub(
    r'PROVISIONING_PROFILE_SPECIFIER = [^;]*;',
    f'PROVISIONING_PROFILE_SPECIFIER = "{PROFILE_UUID}";',
    content
)
# If not present, add after DEVELOPMENT_TEAM
if "PROVISIONING_PROFILE_SPECIFIER" not in content:
    content = content.replace(
        f'DEVELOPMENT_TEAM = {TEAM_ID};',
        f'DEVELOPMENT_TEAM = {TEAM_ID};\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "{PROFILE_UUID}";'
    )

with open(PBXPROJ, "w") as f:
    f.write(content)

print("=== Signing patch applied ===")
print(f"CODE_SIGN_IDENTITY (Distribution): {content.count('iPhone Distribution')} occurrences")
print(f"DEVELOPMENT_TEAM ({TEAM_ID}): {content.count(TEAM_ID)} occurrences")
print(f"PROVISIONING_PROFILE_SPECIFIER ({PROFILE_UUID}): {'YES' if PROFILE_UUID in content else 'NO'}")
if content == original:
    print("WARNING: pbxproj unchanged — check if expo prebuild uses different key names")
