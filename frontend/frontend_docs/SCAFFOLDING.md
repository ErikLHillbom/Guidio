# Guideo Frontend — Scaffolding Guide

Recreate the project structure from scratch using this guide. No application-specific code is included — only the framework, tooling, and configuration.

---

## Prerequisites

- **Node.js** — version pinned via `.nvmrc` to `25.2.1`
- **Expo CLI** — installed globally or invoked via `npx`

---

## 1. Initialize the Expo Project

```bash
npx create-expo-app Guideo --template blank-typescript
cd Guideo
```

Set the Node version:

```bash
echo "25.2.1" > .nvmrc
```

---

## 2. Install Dependencies

### Runtime

```bash
npx expo install \
  @react-navigation/native @react-navigation/native-stack \
  @supabase/supabase-js \
  @expo-google-fonts/silkscreen \
  expo-blur \
  expo-constants \
  expo-font \
  expo-glass-effect \
  expo-linear-gradient \
  expo-status-bar \
  react-native-marquee \
  react-native-safe-area-context \
  react-native-screens \
  react-native-text-ticker
```

### Dev

```bash
npm install --save-dev @babel/core babel-preset-expo typescript @types/react
```

### Expected `package.json` shape

```jsonc
{
  "name": "Guideo",
  "version": "1.0.0",
  "main": "expo/AppEntry.js",
  "private": true,
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "@expo-google-fonts/silkscreen": "^0.4.2",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/native-stack": "^6.9.17",
    "@supabase/supabase-js": "^2.39.3",
    "expo": "~54.0.31",
    "expo-blur": "^15.0.8",
    "expo-constants": "~18.0.13",
    "expo-font": "~14.0.10",
    "expo-glass-effect": "^0.1.8",
    "expo-linear-gradient": "^15.0.8",
    "expo-status-bar": "~3.0.9",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "react-native-marquee": "^0.5.0",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-text-ticker": "^1.15.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~19.1.10",
    "babel-preset-expo": "~54.0.9",
    "typescript": "^5.1.3"
  }
}
```

---

## 3. Configuration Files

### `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "jsx": "react-native"
  }
}
```

### `babel.config.js`

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

### `app.config.js`

Expo config with environment variables surfaced via `extra`:

```javascript
export default {
  expo: {
    name: 'Guideo',
    slug: 'Guideo',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    assetBundlePatterns: ['**/*'],
    plugins: ['expo-font'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.Guideo.app',
    },
    android: {
      package: 'com.Guideo.app',
    },
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      userId: process.env.USER_ID,
      serverUrl: process.env.SERVER_URL || 'http://localhost:8080',
    },
  },
};
```

### `.env`

Create a `.env` file (git-ignored) with these variables:

```
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
USER_ID=<your-user-id>
SERVER_URL=http://localhost:8080
```

---

## 4. Directory Structure

```
Guideo/
├── App.tsx                  # Single entry component
├── app.config.js            # Expo config (replaces app.json)
├── babel.config.js          # Babel preset
├── tsconfig.json            # TypeScript config
├── package.json
├── .nvmrc                   # Node version pin
├── .env                     # Environment variables (git-ignored)
├── .gitignore
├── lib/
│   └── supabase.ts          # Supabase client initialization
└── resources/
    └── (static assets)      # Images, icons, etc.
```

---

## 5. Entry Point — `App.tsx`

No expo-router or file-based routing. The app uses a traditional single-file entry via `expo/AppEntry.js` which loads `App.tsx`:

```tsx
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Silkscreen_400Regular } from '@expo-google-fonts/silkscreen';

function MainContent() {
  // Application UI goes here
  return null;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Silkscreen_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <MainContent />
    </SafeAreaProvider>
  );
}
```

---

## 6. Supabase Client — `lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key in app config.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 7. `.gitignore`

```gitignore
# Dependencies
node_modules/
npm-debug.*
yarn-debug.*
yarn-error.*
.pnp
.pnp.js

# Expo
.expo/
.expo-shared/
dist/
web-build/

# Native
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Android
*.apk
*.ap_
*.aab
.gradle/
local.properties
*.iml
.idea/
*.hprof
.cxx/
*.keystore
!debug.keystore

# iOS
*.pbxuser
!default.pbxuser
*.mode1v3
!default.mode1v3
*.mode2v3
!default.mode2v3
*.perspectivev3
!default.perspectivev3
xcuserdata/
*.xccheckout
*.moved-aside
DerivedData
*.hmap
*.ipa
*.xcuserstate
ios/Pods/
ios/.xcode.env.local
project.xcworkspace/

# macOS
.DS_Store
._*

# Windows
Thumbs.db
[Dd]esktop.ini
$RECYCLE.BIN/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log
npm-debug.log*

# Testing
coverage/

# Build
build/
*.tgz
*.tar.gz

# Misc
*.pem
.cache/
.temp/
.tmp/
```

---

## Architecture Summary

| Layer              | Choice                                                                 |
|--------------------|------------------------------------------------------------------------|
| **Framework**      | Expo SDK 54, React 19.1, React Native 0.81.5                          |
| **Language**       | TypeScript (strict mode)                                               |
| **Entry / Routing**| `expo/AppEntry.js` → `App.tsx`. No expo-router, no file-based routing. |
| **Navigation**     | `@react-navigation/native` + `native-stack` (installed, not yet wired) |
| **State**          | Local `useState` / `useRef` — no global state library                  |
| **Styling**        | `StyleSheet.create()` — no Tailwind/NativeWind                         |
| **Backend Client** | `@supabase/supabase-js` via `lib/supabase.ts`                         |
| **API Server**     | Custom HTTP server at `SERVER_URL` (default `http://localhost:8080`)    |
| **Auth**           | Env-based `USER_ID` — no Supabase Auth or login flow                   |
| **Fonts**          | `@expo-google-fonts/silkscreen` loaded via `useFonts`                  |
| **UI Effects**     | `expo-glass-effect`, `expo-blur`, `expo-linear-gradient`               |
| **Assets**         | `resources/` directory, bundled via `assetBundlePatterns: ['**/*']`     |
| **Build / Deploy** | No EAS config, no CI/CD, no Docker                                     |
