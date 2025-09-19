import { CapacitorConfig } from '@capacitor/cli';

const config = {
    appId: 'com.processexecution.app',
    appName: 'Process Execution System',
    webDir: 'public',
    server: {
        androidScheme: 'https'
    },
    plugins: {
        LocalNotifications: {
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#488AFF',
            sound: 'beep.wav'
        },
        SplashScreen: {
            launchShowDuration: 3000,
            launchAutoHide: true,
            backgroundColor: '#2c3e50',
            androidSplashResourceName: 'splash',
            androidScaleType: 'CENTER_CROP',
            showSpinner: true,
            androidSpinnerStyle: 'large',
            iosSpinnerStyle: 'small',
            spinnerColor: '#999999',
            splashFullScreen: true,
            splashImmersive: true,
            layoutName: 'launch_screen',
            useDialog: true
        }
    }
};

export default config;