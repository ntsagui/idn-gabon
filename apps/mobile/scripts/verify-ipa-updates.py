"""Verify the actual TestFlight binary's OTA configuration and record its runtime."""
import json
import os
import plistlib
import sys
import zipfile

archive_path, channel, record_path = sys.argv[1:]
with zipfile.ZipFile(archive_path) as archive:
    app_info = next(
        name for name in archive.namelist()
        if name.startswith("Payload/") and name.count("/") == 2 and name.endswith(".app/Info.plist")
    )
    app_dir = app_info.removesuffix("Info.plist")
    info = plistlib.loads(archive.read(app_info))
    updates = plistlib.loads(archive.read(app_dir + "Expo.plist"))

assert updates.get("EXUpdatesEnabled") is True, "Expo Updates is disabled in the binary"
assert updates.get("EXUpdatesURL") == "https://u.expo.dev/24b9c3f8-aefc-46ef-bf46-6615b83d0254", "Wrong update project"
assert updates.get("EXUpdatesRequestHeaders", {}).get("expo-channel-name") == channel, "Wrong update channel"
assert updates.get("EXUpdatesRuntimeVersion"), "Missing native runtime"
record = {
    "commit": os.environ["GITHUB_SHA"],
    "channel": channel,
    "platform": "ios",
    "version": info["CFBundleShortVersionString"],
    "buildNumber": info["CFBundleVersion"],
    "runtimeVersion": updates["EXUpdatesRuntimeVersion"],
    "updatesEnabled": True,
    "checkOnLaunch": updates.get("EXUpdatesCheckOnLaunch", "ALWAYS"),
}
with open(record_path, "w") as output:
    json.dump(record, output, indent=2)
print(json.dumps(record, indent=2))
