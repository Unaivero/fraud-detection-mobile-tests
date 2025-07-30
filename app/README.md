# Mobile App Binaries Guide

This directory contains the mobile application binaries required for fraud detection testing.

## Required Files

### Android
- **File**: `betting-app.apk`
- **Type**: Android Package (APK)
- **Purpose**: The Android version of the betting app to test against

### iOS
- **File**: `betting-app.app` 
- **Type**: iOS Application Bundle (directory)
- **Purpose**: The iOS version of the betting app to test against

## How to Obtain App Binaries

### Option 1: Download from App Distribution Platform

If your organization uses a mobile app distribution platform:

1. **Firebase App Distribution**:
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Login and download latest build
   firebase login
   firebase appdistribution:releases:list --app YOUR_APP_ID
   firebase appdistribution:releases:download --app YOUR_APP_ID --release-id RELEASE_ID
   ```

2. **App Center**:
   ```bash
   # Install App Center CLI
   npm install -g appcenter-cli
   
   # Login and download latest build
   appcenter login
   appcenter distribute releases list -a YOUR_ORG/YOUR_APP
   appcenter distribute releases download --id RELEASE_ID -a YOUR_ORG/YOUR_APP
   ```

### Option 2: Build from Source

If you have access to the app source code:

#### Android Build
```bash
# Navigate to Android project directory
cd /path/to/android/project

# Build debug APK
./gradlew assembleDebug

# Copy APK to test project
cp app/build/outputs/apk/debug/app-debug.apk /path/to/fraud-detection-mobile-tests/app/betting-app.apk
```

#### iOS Build
```bash
# Navigate to iOS project directory
cd /path/to/ios/project

# Build for simulator
xcodebuild -workspace YourApp.xcworkspace -scheme YourApp -sdk iphonesimulator -derivedDataPath ./build

# Copy app bundle to test project
cp -r build/Build/Products/Debug-iphonesimulator/YourApp.app /path/to/fraud-detection-mobile-tests/app/betting-app.app
```

### Option 3: Use Sample/Demo Apps

For initial setup and testing purposes, you can use sample betting apps:

#### Download Sample Android APK
```bash
# Create a sample APK download script
cat > download-sample-android.sh << 'EOF'
#!/bin/bash
echo "Downloading sample Android betting app..."

# This is a placeholder - replace with actual sample app URL
SAMPLE_APK_URL="https://github.com/your-org/sample-betting-app/releases/latest/download/betting-app.apk"

# Download the sample APK
curl -L -o betting-app.apk "$SAMPLE_APK_URL"

if [ -f "betting-app.apk" ]; then
    echo "✅ Sample Android app downloaded successfully"
    echo "File: betting-app.apk"
    echo "Size: $(ls -lh betting-app.apk | awk '{print $5}')"
else
    echo "❌ Failed to download sample Android app"
    echo "Please check the URL or download manually"
fi
EOF

chmod +x download-sample-android.sh
./download-sample-android.sh
```

#### Build Sample iOS App
```bash
# Clone sample iOS project
git clone https://github.com/your-org/sample-betting-ios-app.git
cd sample-betting-ios-app

# Install dependencies
pod install

# Build for simulator
xcodebuild -workspace BettingApp.xcworkspace -scheme BettingApp -sdk iphonesimulator

# Copy to test directory
cp -r build/Build/Products/Debug-iphonesimulator/BettingApp.app ../fraud-detection-mobile-tests/app/betting-app.app
```

## File Validation

Before running tests, validate your app binaries:

### Android APK Validation
```bash
# Check if APK is valid
aapt dump badging app/betting-app.apk

# Get app package and activity information
aapt dump badging app/betting-app.apk | grep package
aapt dump badging app/betting-app.apk | grep launchable-activity
```

### iOS App Validation
```bash
# Check if iOS app bundle is valid
ls -la app/betting-app.app/

# Get app bundle identifier
/usr/libexec/PlistBuddy -c "Print CFBundleIdentifier" app/betting-app.app/Info.plist
```

## Configuration

Update your `.env` file with the correct app information:

### Android Configuration
```bash
# App file path
APP_PATH=./app/betting-app.apk

# App package info (get from aapt command above)
APP_PACKAGE=com.example.bettingapp
APP_ACTIVITY=com.example.bettingapp.MainActivity
```

### iOS Configuration
```bash
# App file path
IOS_APP_PATH=./app/betting-app.app

# Bundle identifier (get from PlistBuddy command above)
BUNDLE_ID=com.example.bettingapp
```

## Troubleshooting

### Common Issues

1. **APK Installation Failed**
   ```bash
   # Check if APK is signed properly
   jarsigner -verify -verbose -certs app/betting-app.apk
   
   # Re-sign if needed (for testing only)
   jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore debug.keystore app/betting-app.apk androiddebugkey
   ```

2. **iOS App Won't Launch**
   ```bash
   # Check app bundle structure
   find app/betting-app.app -type f | head -20
   
   # Verify Info.plist
   plutil -lint app/betting-app.app/Info.plist
   ```

3. **Wrong Package/Bundle ID**
   - Update your `.env` file with correct identifiers
   - Use the validation commands above to get correct values

### App Requirements

Your betting app should have these features for comprehensive fraud testing:

1. **User Registration**: Sign-up form with validation
2. **User Login**: Authentication system
3. **Betting Interface**: Place bets on sporting events
4. **Bet History**: View previous bets
5. **Account Status**: Display account flags/warnings
6. **API Integration**: Backend communication for bets

### Security Considerations

- **Never commit real production apps** to version control
- Use **debug/development builds** for testing
- Ensure apps have **proper permissions** for testing
- Use **test accounts** only, never real user data

## Automated Setup Script

Create an automated setup script:

```bash
cat > setup-apps.sh << 'EOF'
#!/bin/bash

echo "🚀 Setting up mobile app binaries for fraud detection tests..."

# Create app directory if it doesn't exist
mkdir -p app

# Check if Android APK exists
if [ ! -f "app/betting-app.apk" ]; then
    echo "📱 Android APK not found. Please:"
    echo "1. Place your betting-app.apk in the app/ directory, or"
    echo "2. Run the download script for sample apps"
else
    echo "✅ Android APK found"
    aapt dump badging app/betting-app.apk | grep package | head -1
fi

# Check if iOS app exists
if [ ! -d "app/betting-app.app" ]; then
    echo "📱 iOS app bundle not found. Please:"
    echo "1. Place your betting-app.app directory in the app/ directory, or"
    echo "2. Build from source using the instructions above"
else
    echo "✅ iOS app bundle found"
    echo "Bundle ID: $(/usr/libexec/PlistBuddy -c "Print CFBundleIdentifier" app/betting-app.app/Info.plist 2>/dev/null || echo "Could not read")"
fi

echo ""
echo "📋 Next steps:"
echo "1. Copy .env.example to .env"
echo "2. Update .env with your app package/bundle identifiers"
echo "3. Start Appium server: npm run start"
echo "4. Run tests: npm test"

EOF

chmod +x setup-apps.sh
```

Run the setup script:
```bash
./setup-apps.sh
```
