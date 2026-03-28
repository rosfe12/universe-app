#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_PATH="${IOS_ARCHIVE_PATH:-$ROOT_DIR/build/CAMVERSE.xcarchive}"
EXPORT_OPTIONS_PLIST="${IOS_EXPORT_OPTIONS_PLIST:-$ROOT_DIR/ios/ExportOptions-AppStore.plist}"
EXPORT_PATH="${IOS_EXPORT_PATH:-$ROOT_DIR/build/export}"

if [[ ! -d "$ARCHIVE_PATH" ]]; then
  echo "Missing archive: $ARCHIVE_PATH" >&2
  exit 1
fi

if [[ ! -f "$EXPORT_OPTIONS_PLIST" ]]; then
  echo "Missing export options plist: $EXPORT_OPTIONS_PLIST" >&2
  exit 1
fi

mkdir -p "$EXPORT_PATH"
rm -rf "$EXPORT_PATH"/*

xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS_PLIST" \
  -exportPath "$EXPORT_PATH"
