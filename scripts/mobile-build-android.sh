#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

source "$ROOT_DIR/scripts/mobile-android-env.sh"
node "$ROOT_DIR/scripts/generate-android-google-services.mjs"

cd "$ROOT_DIR/android"
./gradlew assembleDebug
