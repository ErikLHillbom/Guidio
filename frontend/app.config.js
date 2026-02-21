export default {
  expo: {
    name: 'guidio',
    slug: 'guidio',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    assetBundlePatterns: ['**/*'],
    plugins: [
      'expo-font',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow Guidio to use your location to find nearby points of interest',
          locationWhenInUsePermission:
            'Allow Guidio to use your location to find nearby points of interest',
        },
      ],
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.guidio.app',
    },
    android: {
      package: 'com.guidio.app',
    },
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      userId: process.env.USER_ID,
      serverUrl: process.env.SERVER_URL || 'http://localhost:8080',
    },
  },
};
