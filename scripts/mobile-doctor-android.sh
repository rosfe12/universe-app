#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

source "$ROOT_DIR/scripts/mobile-android-env.sh"

echo "JAVA_HOME=$JAVA_HOME"
echo "ANDROID_HOME=$ANDROID_HOME"

java -version

if [[ -x "$ROOT_DIR/android/gradlew" ]]; then
  cd "$ROOT_DIR/android"
  ./gradlew -v
fi
