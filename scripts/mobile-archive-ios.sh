#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_PATH="$ROOT_DIR/ios/App/App.xcodeproj"
SCHEME="${IOS_SCHEME:-App}"
ARCHIVE_PATH="${IOS_ARCHIVE_PATH:-$ROOT_DIR/build/CAMVERSE.xcarchive}"
CODE_SIGNING_ALLOWED_VALUE="${IOS_CODE_SIGNING_ALLOWED:-NO}"
DEVELOPMENT_TEAM_VALUE="${IOS_TEAM_ID:-T7568AP66M}"
ALLOW_PROVISIONING_UPDATES_VALUE="${IOS_ALLOW_PROVISIONING_UPDATES:-}"

mkdir -p "$(dirname "$ARCHIVE_PATH")"
rm -rf "$ARCHIVE_PATH"

xcodebuild_args=(
  -project "$PROJECT_PATH"
  -scheme "$SCHEME"
  -configuration Release
  -destination 'generic/platform=iOS'
  CODE_SIGNING_ALLOWED="$CODE_SIGNING_ALLOWED_VALUE"
  archive
  -archivePath "$ARCHIVE_PATH"
)

if [[ -n "$DEVELOPMENT_TEAM_VALUE" ]]; then
  xcodebuild_args+=(
    DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM_VALUE"
  )
fi

if [[ "$CODE_SIGNING_ALLOWED_VALUE" == "YES" || -n "$ALLOW_PROVISIONING_UPDATES_VALUE" ]]; then
  xcodebuild_args+=(
    -allowProvisioningUpdates
  )
fi

xcodebuild "${xcodebuild_args[@]}"
