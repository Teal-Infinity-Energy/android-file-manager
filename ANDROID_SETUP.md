# OneTap - Native Android Setup

This document explains how to set up and test the OneTap app on your Android device.

## Prerequisites

- **Node.js** (v18 or later)
- **Android Studio** (with Android SDK)
- **An Android phone** (Android 12+) with Developer Mode enabled
- **USB cable** to connect your phone

## Step-by-Step Testing Instructions

### Step 1: Export to GitHub

1. In Lovable, click the **GitHub** button (top right)
2. Click **"Export to GitHub"** and create a new repository
3. Wait for the export to complete

### Step 2: Clone and Setup Locally

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Install dependencies
npm install

# Add Android platform
npx cap add android

# Build the web app
npm run build

# Sync to Android
npx cap sync android
```

### Step 3: Add Native Android Code

After running `npx cap sync`, you need to add native code for shortcut functionality:

#### 3a. Create ShortcutPlugin.kt

Create file: `android/app/src/main/java/app/onetap/shortcuts/plugins/ShortcutPlugin.kt`

```kotlin
package app.onetap.shortcuts.plugins

import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import androidx.annotation.RequiresApi
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "ShortcutPlugin")
class ShortcutPlugin : Plugin() {

    @PluginMethod
    fun createPinnedShortcut(call: PluginCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.resolve(JSObject().put("success", false))
            return
        }
        
        val context = context ?: run {
            call.resolve(JSObject().put("success", false))
            return
        }
        
        val shortcutManager = context.getSystemService(ShortcutManager::class.java)
        
        if (!shortcutManager.isRequestPinShortcutSupported) {
            call.resolve(JSObject().put("success", false))
            return
        }
        
        val id = call.getString("id") ?: return
        val label = call.getString("label") ?: return
        val intentAction = call.getString("intentAction") ?: "android.intent.action.VIEW"
        val intentData = call.getString("intentData") ?: return
        val intentType = call.getString("intentType")
        
        val intent = Intent(intentAction).apply {
            data = Uri.parse(intentData)
            intentType?.let { type = it }
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        
        val icon = createIcon(call)
        
        val shortcutInfo = ShortcutInfo.Builder(context, id)
            .setShortLabel(label)
            .setLongLabel(label)
            .setIcon(icon)
            .setIntent(intent)
            .build()
        
        shortcutManager.requestPinShortcut(shortcutInfo, null)
        
        call.resolve(JSObject().put("success", true))
    }
    
    @RequiresApi(Build.VERSION_CODES.O)
    private fun createIcon(call: PluginCall): Icon {
        val context = context!!
        
        call.getString("iconEmoji")?.let { emoji ->
            return createEmojiIcon(emoji)
        }
        
        call.getString("iconText")?.let { text ->
            return createTextIcon(text)
        }
        
        return Icon.createWithResource(context, android.R.drawable.ic_menu_add)
    }
    
    @RequiresApi(Build.VERSION_CODES.O)
    private fun createEmojiIcon(emoji: String): Icon {
        val size = 192
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        
        val bgPaint = Paint().apply {
            color = Color.parseColor("#2563EB")
            style = Paint.Style.FILL
        }
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, bgPaint)
        
        val textPaint = Paint().apply {
            textSize = size * 0.5f
            textAlign = Paint.Align.CENTER
        }
        val y = (size / 2f) - ((textPaint.descent() + textPaint.ascent()) / 2)
        canvas.drawText(emoji, size / 2f, y, textPaint)
        
        return Icon.createWithBitmap(bitmap)
    }
    
    @RequiresApi(Build.VERSION_CODES.O)
    private fun createTextIcon(text: String): Icon {
        val size = 192
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        
        val bgPaint = Paint().apply {
            color = Color.parseColor("#2563EB")
            style = Paint.Style.FILL
        }
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, bgPaint)
        
        val textPaint = Paint().apply {
            color = Color.WHITE
            textSize = size * 0.4f
            textAlign = Paint.Align.CENTER
            isFakeBoldText = true
        }
        val displayText = text.take(2).uppercase()
        val y = (size / 2f) - ((textPaint.descent() + textPaint.ascent()) / 2)
        canvas.drawText(displayText, size / 2f, y, textPaint)
        
        return Icon.createWithBitmap(bitmap)
    }
    
    @PluginMethod
    fun checkShortcutSupport(call: PluginCall) {
        val result = JSObject()
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val shortcutManager = context?.getSystemService(ShortcutManager::class.java)
            result.put("supported", true)
            result.put("canPin", shortcutManager?.isRequestPinShortcutSupported ?: false)
        } else {
            result.put("supported", false)
            result.put("canPin", false)
        }
        
        call.resolve(result)
    }
    
    @PluginMethod
    fun getSharedContent(call: PluginCall) {
        val activity = activity ?: run {
            call.resolve(null)
            return
        }
        
        val intent = activity.intent
        val action = intent.action
        val type = intent.type
        
        if (Intent.ACTION_SEND == action && type != null) {
            val result = JSObject()
            result.put("action", action)
            result.put("type", type)
            
            if (type.startsWith("text/")) {
                intent.getStringExtra(Intent.EXTRA_TEXT)?.let {
                    result.put("text", it)
                }
            } else {
                (intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM))?.let {
                    result.put("data", it.toString())
                }
            }
            
            call.resolve(result)
        } else {
            call.resolve(null)
        }
    }
}
```

#### 3b. Update MainActivity.kt

Edit `android/app/src/main/java/app/onetap/shortcuts/MainActivity.kt`:

```kotlin
package app.onetap.shortcuts

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import app.onetap.shortcuts.plugins.ShortcutPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(ShortcutPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
```

#### 3c. Update AndroidManifest.xml

Edit `android/app/src/main/AndroidManifest.xml` and add:

```xml
<!-- Inside <manifest> tag -->
<uses-permission android:name="com.android.launcher.permission.INSTALL_SHORTCUT" />

<!-- Inside <activity> tag for Share Sheet support -->
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="text/*" />
</intent-filter>
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="image/*" />
</intent-filter>
```

### Step 4: Enable Developer Mode on Your Phone

1. Go to **Settings → About Phone**
2. Tap **Build Number** 7 times
3. Go back to **Settings → Developer Options**
4. Enable **USB Debugging**

### Step 5: Connect and Run

```bash
# Connect your phone via USB
# Accept the "Allow USB debugging" prompt on your phone

# Run the app
npx cap run android
```

This will build and install the app directly on your phone!

### Alternative: Use Android Studio

```bash
# Open in Android Studio
npx cap open android
```

Then click the **Run** button (green play icon) in Android Studio.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Device not detected | Check USB cable, enable USB debugging |
| Build fails | Run `npx cap sync android` again |
| App crashes | Check Logcat in Android Studio for errors |
| Shortcuts not working | Ensure Android 8.0+ and launcher supports pinned shortcuts |

## Building a Release APK

1. Open in Android Studio: `npx cap open android`
2. Go to **Build → Generate Signed Bundle/APK**
3. Select **APK**
4. Create a new keystore or use existing
5. Build the signed APK
6. Find APK in `android/app/release/`
