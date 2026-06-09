import re, sys, os, base64, json, urllib.request

PBXPROJ = "ios/Airbuddies.xcodeproj/project.pbxproj"
PROFILE_UUID = "342d4c3b-313c-4394-bd51-ee3d245a490d"
TEAM_ID = "72CS7BMND3"
PROFILES_DIR = os.path.expanduser("~/Library/MobileDevice/Provisioning Profiles")

# ── 1. Download and install provisioning profile ──────────────────────────────
expo_token = os.environ.get("EXPO_TOKEN", "")
if not expo_token:
    print("ERROR: EXPO_TOKEN not set as EAS secret — cannot download provisioning profile")
    sys.exit(1)

print("=== Downloading provisioning profile from EAS ===")
query = '{ app { byFullName(fullName: "@trijman/airbuddies") { iosAppCredentials(filter: {}) { iosAppBuildCredentialsList { provisioningProfile { provisioningProfile } } } } } }'
req = urllib.request.Request(
    "https://api.expo.dev/graphql",
    data=json.dumps({"query": query}).encode(),
    headers={"Authorization": f"Bearer {expo_token}", "Content-Type": "application/json"},
)
with urllib.request.urlopen(req, timeout=30) as r:
    data = json.loads(r.read())

profile_b64 = data["data"]["app"]["byFullName"]["iosAppCredentials"][0]["iosAppBuildCredentialsList"][0]["provisioningProfile"]["provisioningProfile"]
profile_data = base64.b64decode(profile_b64)

os.makedirs(PROFILES_DIR, exist_ok=True)
profile_path = os.path.join(PROFILES_DIR, f"{PROFILE_UUID}.mobileprovision")
with open(profile_path, "wb") as f:
    f.write(profile_data)
print(f"Installed profile to: {profile_path} ({len(profile_data)} bytes)")

# ── 2. Patch pbxproj for Manual signing with this profile ─────────────────────
print("=== Patching pbxproj ===")
with open(PBXPROJ) as f:
    content = f.read()

original = content

content = re.sub(r'CODE_SIGN_IDENTITY = "iPhone Developer";',
                 'CODE_SIGN_IDENTITY = "iPhone Distribution";', content)
content = re.sub(r'"CODE_SIGN_IDENTITY\[sdk=iphoneos\*\]" = "[^"]*";',
                 '"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "iPhone Distribution";', content)
content = re.sub(r'DEVELOPMENT_TEAM = [^;]*;',
                 f'DEVELOPMENT_TEAM = {TEAM_ID};', content)
if TEAM_ID not in content:
    content = content.replace(
        'CODE_SIGN_IDENTITY = "iPhone Distribution";',
        f'CODE_SIGN_IDENTITY = "iPhone Distribution";\n\t\t\t\tDEVELOPMENT_TEAM = {TEAM_ID};'
    )

content = re.sub(r'PROVISIONING_PROFILE_SPECIFIER = [^;]*;',
                 f'PROVISIONING_PROFILE_SPECIFIER = "{PROFILE_UUID}";', content)
if "PROVISIONING_PROFILE_SPECIFIER" not in content:
    content = content.replace(
        f'DEVELOPMENT_TEAM = {TEAM_ID};',
        f'DEVELOPMENT_TEAM = {TEAM_ID};\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "{PROFILE_UUID}";'
    )

with open(PBXPROJ, "w") as f:
    f.write(content)

print(f"CODE_SIGN_IDENTITY (Distribution): {content.count('iPhone Distribution')} occurrences")
print(f"PROVISIONING_PROFILE_SPECIFIER ({PROFILE_UUID}): {'YES' if PROFILE_UUID in content else 'NO'}")
if content == original:
    print("WARNING: pbxproj unchanged — verify expo prebuild key names")
print("=== Done ===")
