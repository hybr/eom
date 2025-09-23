import { CapacitorConfig } from '@capacitor/cli';

const config = {
  appId: 'com.v4l.multiorg',
  appName: 'V4L Multi-Org',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#1976d2",
      sound: "beep.wav"
    }
  },
  ios: {
    scheme: 'V4L Multi-Org'
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK'
    }
  }
};

export default config;