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
      'expo-asset',
      'expo-audio',
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.guidio.app',
    },
    android: {
      package: 'com.guidio.app',
    },
    extra: {
      userId: process.env.USER_ID,
      serverUrl: process.env.SERVER_URL || 'http://localhost:8080',
    },
  },
};
