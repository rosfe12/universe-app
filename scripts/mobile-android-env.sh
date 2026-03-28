#!/bin/zsh
set -euo pipefail

if [[ -z "${JAVA_HOME:-}" ]]; then
  for candidate in \
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
    "/Applications/Android Studio.app/Contents/jre/Contents/Home" \
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
    "$HOME/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home" \
    "$HOME/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home"
  do
    if [[ -d "$candidate" ]]; then
      export JAVA_HOME="$candidate"
      break
    fi
  done
fi

if [[ -z "${JAVA_HOME:-}" ]]; then
  detected_java_home="$(/usr/libexec/java_home 2>/dev/null || true)"
  if [[ -n "$detected_java_home" ]]; then
    export JAVA_HOME="$detected_java_home"
  fi
fi

if [[ -z "${ANDROID_HOME:-}" && -z "${ANDROID_SDK_ROOT:-}" ]]; then
  for candidate in \
    "/opt/homebrew/share/android-commandlinetools" \
    "$HOME/Library/Android/sdk" \
    "$HOME/Android/Sdk"
  do
    if [[ -d "$candidate" ]]; then
      export ANDROID_HOME="$candidate"
      export ANDROID_SDK_ROOT="$candidate"
      break
    fi
  done
fi

if [[ -z "${JAVA_HOME:-}" ]]; then
  echo "Missing JAVA_HOME" >&2
  exit 1
fi

if [[ -z "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ]]; then
  echo "Missing ANDROID_HOME" >&2
  exit 1
fi

export ANDROID_HOME="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
