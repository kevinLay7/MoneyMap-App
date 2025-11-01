# Installation

This guide will help you set up WatermelonDB for React Native and web projects.

## React Native

### Step 1: Install WatermelonDB

```bash
yarn add @nozbe/watermelondb
# or
npm install @nozbe/watermelondb
```

### Step 2: Install Babel Plugin for Decorators

WatermelonDB uses decorators (like `@field`, `@relation`) which require Babel support:

```bash
yarn add --dev @babel/plugin-proposal-decorators
```

### Step 3: Configure Babel

Add the decorator plugin to your `babel.config.js`:

```javascript
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    // ... other plugins
  ],
};
```

### Step 4: iOS Setup

1. Install pods:

```bash
cd ios && pod install && cd ..
```

2. iOS should work automatically with CocoaPods linking.

### Step 5: Android Setup

Android should work automatically with auto-linking. If you're using a version of React Native that doesn't support auto-linking:

1. Edit `android/settings.gradle`:

```gradle
include ':watermelondb'
project(':watermelondb').projectDir = new File(rootProject.projectDir, '../node_modules/@nozbe/watermelondb/native/android')
```

2. Edit `android/app/build.gradle`:

```gradle
dependencies {
    // ...
    implementation project(':watermelondb')
}
```

3. Edit `MainApplication.java`:

```java
import com.nozbe.watermelondb.WatermelonDBPackage;

public class MainApplication extends Application implements ReactApplication {
    // ...
    @Override
    protected List<ReactPackage> getPackages() {
        return Arrays.<ReactPackage>asList(
            new MainReactPackage(),
            new WatermelonDBPackage()  // Add this line
        );
    }
}
```

## Web Setup

### Step 1: Install WatermelonDB

```bash
yarn add @nozbe/watermelondb
```

### Step 2: Install SQL.js (SQLite for web)

```bash
yarn add sql.js
```

### Step 3: Use LokiJSAdapter

For web, you need to use the LokiJS adapter. Install it:

```bash
yarn add lokijs
```

Then in your code:

```javascript
import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'

const adapter = new LokiJSAdapter({
  dbName: 'myapp',
  schema: mySchema,
})

const database = new Database({
  adapter,
  modelClasses: [Post, Comment],
})
```

## Next Steps

After installation:

1. [Define your Schema](Schema.md)
2. [Create Models](Models.md)
3. [Connect to Components](Components.md)

## Troubleshooting

### Decorators not working

Make sure:
- `@babel/plugin-proposal-decorators` is installed
- The plugin is configured with `{ legacy: true }`
- Your `babel.config.js` is in the root directory

### iOS build errors

- Clean build: `cd ios && xcodebuild clean && cd ..`
- Reinstall pods: `cd ios && pod install && cd ..`
- Clear Metro cache: `yarn start --reset-cache`

### Android build errors

- Clean build: `cd android && ./gradlew clean && cd ..`
- Invalidate caches in Android Studio
- Clear Metro cache: `yarn start --reset-cache`

