# Modern Android React Native Calculator (Expo)

A sleek, dark-mode mobile calculator app built with **React Native** and **Expo**, fully optimized for modern Android devices and ready for APK compilation with **EAS Build**.

---

## 📱 Features

- **Sleek Dark Mode UI:** OLED-friendly `#121212` aesthetic with Android elevation shadows and touch opacity feedback.
- **Two-Line Dynamic Display:** Upper line shows the active arithmetic expression; lower line computes a real-time live preview.
- **Safe Calculation Engine:** Custom non-`eval` arithmetic parser handling full operator precedence ($*$, $/$, $+$, $-$), sign flipping ($\pm$), percentage calculations ($\%$), and divide-by-zero protection.
- **Android-Optimized Layout:** Flexbox grid with responsive button dimensions based on screen width, dynamic font sizing for large expressions, and notch/status bar spacing.
- **APK & EAS Ready:** Configured with portrait lock, custom Android package identifier, and EAS preview profile for standalone APK generation.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Expo Development Server
```bash
npx expo start
```
- Press `a` in the terminal to open on a connected Android device / emulator.
- Or scan the QR code using the **Expo Go** app on your Android phone.

---

## 📦 Building the Standalone APK (EAS Build)

To build a standalone installable `.apk` file without going through the Google Play Store:

### 1. Install EAS CLI globally (if not already installed)
```bash
npm install -g eas-cli
```

### 2. Log in to your Expo account
```bash
eas login
```

### 3. Initialize EAS project (first time only)
```bash
eas project:init
```

### 4. Build the Android APK
```bash
eas build -p android --profile preview
```

When the build finishes, EAS will provide a direct download link and QR code in your terminal to install the `.apk` file directly on any Android device.
