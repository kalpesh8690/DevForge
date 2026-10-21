# DevForge Android

React Native + Expo companion app for DevForge Desktop. This is a separate mobile application under `mobile/`; it does not attempt to run Electron on Android.

## Requirements

- Node.js 22.13+ (Node.js 24 recommended)
- Android phone with Expo Go compatible with the selected SDK, or Android Studio for a native build
- An Expo/EAS account for cloud APK/AAB builds

## Run on Android

From the repository root:

```bash
cd mobile
npm install
npx expo install --fix
npx expo start
```

Scan the QR code with the compatible Expo Go app, or use an Android emulator. For a native local build, install Android Studio/SDK and run:

```bash
npx expo run:android
```

## Create an APK / Play Store bundle

Install and sign in to EAS CLI, then initialize the EAS project and replace the placeholder project ID in `app.json`:

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
```

The preview profile creates an installable APK; production creates an Android App Bundle (AAB). Cloud builds require EAS setup and have not been run from this repository yet.

## Current mobile features

- Mobile-first code editor with JavaScript, TypeScript, Python, Java, Go, Rust, C/C++, HTML, CSS, SQL and JSON starter snippets.
- Local developer tools: JSON format/minify, JSON-to-CSV, Base64 and URL transforms, text stats, line comparison, and JWT payload decoding.
- OpenAI-compatible AI chat with configurable endpoint/model, opt-in code context, and API key stored with Expo SecureStore.
- Dark mobile UI, tab navigation, and local in-memory editor state.

## Deliberate limitations

- This is an early mobile MVP, not feature parity with the desktop application.
- Android does not include Node/Python/Java/C++ toolchains by default. Multi-language code execution must use a properly secured remote execution service or a separately installed runtime; the app does not pretend local compilers exist.
- The AI provider receives prompts and code only when the user sends them. Review the selected provider's data policy. A provider API key stored on the device is protected by Android secure storage, but direct mobile-to-provider requests still expose the key to the device owner and should be reviewed before a public release.
- File-system project browsing, Git remote operations, terminal/debugger, full syntax highlighting, tests, and a release APK remain future work.
