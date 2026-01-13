# OneTap - Complete Ubuntu VM Setup Guide

A comprehensive guide for setting up and testing the project from scratch on Ubuntu.

---

## Part 1: System Preparation

### 1.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Essential Tools

```bash
sudo apt install -y git curl wget unzip zip
```

---

## Part 2: Install Node.js (v18+)

```bash
# Install via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v    # Should show v20.x
npm -v     # Should show 10.x
```

---

## Part 3: Install JDK 17 (Recommended for Gradle Compatibility)

> **Important:** JDK 17 is recommended because Gradle wrappers in Capacitor projects often don't support JDK 21 out of the box.

```bash
# Install OpenJDK 17
sudo apt install -y openjdk-17-jdk

# Set as default (if multiple JDKs installed)
sudo update-alternatives --config java
# Select the java-17 option

sudo update-alternatives --config javac
# Select the javac-17 option

# Set JAVA_HOME
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
source ~/.bashrc

# Verify
java -version   # Should show 17.x
echo $JAVA_HOME # Should show /usr/lib/jvm/java-17-openjdk-amd64
```

### If You Must Use JDK 21

If you need JDK 21, you must update the Gradle wrapper after cloning:

```bash
cd android
./gradlew wrapper --gradle-version 8.4.2
cd ..
```

---

## Part 4: Install Android Studio & SDK

### 4.1 Download Android Studio

```bash
# Download (or get latest from https://developer.android.com/studio)
cd ~/Downloads
wget https://redirector.gvt1.com/edgedl/android/studio/ide-zips/2024.2.1.11/android-studio-2024.2.1.11-linux.tar.gz

# Extract
sudo tar -xzf android-studio-*.tar.gz -C /opt/

# Create launcher
echo '[Desktop Entry]
Name=Android Studio
Exec=/opt/android-studio/bin/studio.sh
Icon=/opt/android-studio/bin/studio.png
Type=Application
Categories=Development;IDE;' | sudo tee /usr/share/applications/android-studio.desktop
```

### 4.2 Run First-Time Setup

```bash
/opt/android-studio/bin/studio.sh
```

- Complete the setup wizard
- Install recommended SDK components
- Accept all licenses

### 4.3 Set Environment Variables

```bash
# Add to ~/.bashrc
echo '
# Android SDK
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator
' >> ~/.bashrc

source ~/.bashrc

# Verify
echo $ANDROID_HOME   # Should show /home/YOUR_USER/Android/Sdk
adb --version        # Should work
```

### 4.4 Accept SDK Licenses

```bash
yes | sdkmanager --licenses
```

---

## Part 5: Install Gradle (for wrapper generation)

```bash
sudo apt install -y gradle

# Verify
gradle -v
```

---

## Part 6: Fresh Project Clone

### 6.1 Remove Old Clone (if exists)

```bash
# CAREFUL: This deletes the old folder
rm -rf ~/old-project-folder
```

### 6.2 Clone Fresh

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git onetap
cd onetap
```

### 6.3 Install Dependencies

```bash
npm install
```

---

## Part 7: Add Android Platform

```bash
# Add Android platform
npx cap add android

# Build web assets
npm run build

# Sync to Android
npx cap sync android
```

---

## Part 8: Activate Native Code

The native Java files are commented out by default. You must uncomment them:

### 8.1 Uncomment Java Files

Open each file and remove the `/*` at the top and `*/` at the bottom:

```bash
# Open files (use your preferred editor)
gedit android/app/src/main/java/app/onetap/shortcuts/plugins/ShortcutPlugin.java &
gedit android/app/src/main/java/app/onetap/shortcuts/MainActivity.java &
gedit android/app/src/main/java/app/onetap/shortcuts/VideoProxyActivity.java &
```

### 8.2 Uncomment XML File

```bash
gedit android/app/src/main/res/xml/file_paths.xml &
```

Remove `<!--` and `-->` around the `<paths>` element.

### 8.3 Delete Kotlin File (if exists)

```bash
rm -f android/app/src/main/java/app/onetap/shortcuts/MainActivity.kt
```

---

## Part 9: Connect Your Android Phone

### 9.1 Enable Developer Options on Phone

1. Go to **Settings → About Phone**
2. Tap **Build Number** 7 times
3. Go back to **Settings → Developer Options**
4. Enable **USB Debugging**

### 9.2 Connect and Verify

```bash
# Connect phone via USB
adb devices
```

You should see your device listed. If it shows "unauthorized", check your phone for a permission prompt.

---

## Part 10: Run the App

```bash
npx cap run android
```

Select your device when prompted.

---

## Quick Reference: After Code Changes

Whenever you pull new code:

```bash
git pull
npm run build
npx cap sync android
npx cap run android
```

---

## Environment Verification Checklist

Run these commands to verify your setup:

```bash
echo "=== Node.js ===" && node -v
echo "=== npm ===" && npm -v
echo "=== Java ===" && java -version
echo "=== JAVA_HOME ===" && echo $JAVA_HOME
echo "=== Android SDK ===" && echo $ANDROID_HOME
echo "=== ADB ===" && adb devices
echo "=== Gradle ===" && gradle -v
```

Expected output:
- Node: v18+ or v20+
- Java: 17.x (recommended) or 21.x (requires Gradle 8.4+)
- JAVA_HOME: Set correctly
- ANDROID_HOME: Set correctly
- ADB: Shows connected devices

---

## Troubleshooting

### `spawn ./gradlew ENOENT`

```bash
cd android
gradle wrapper
cd ..
npx cap run android
```

### `Could not determine java version from '21.x'`

Either:
1. **Switch to JDK 17** (recommended)
2. **Or update Gradle wrapper:**
   ```bash
   cd android
   ./gradlew wrapper --gradle-version 8.4.2
   cd ..
   ```

### Device Not Detected

```bash
# Restart ADB
adb kill-server
adb start-server
adb devices
```

### Permission Denied on gradlew

```bash
chmod +x android/gradlew
```

### Clean Rebuild

If all else fails:

```bash
rm -rf android
npx cap add android
npm run build
npx cap sync android
# Re-uncomment native files (see Part 8)
npx cap run android
```

---

## Summary Flowchart

```
1. System Update
      ↓
2. Install: Node.js, JDK 17, Android Studio, Gradle
      ↓
3. Set Environment Variables (JAVA_HOME, ANDROID_HOME)
      ↓
4. Clone Repo → npm install
      ↓
5. npx cap add android → npm run build → npx cap sync android
      ↓
6. Uncomment Native Code (Java files + XML)
      ↓
7. Connect Phone (USB Debugging ON)
      ↓
8. npx cap run android
```
