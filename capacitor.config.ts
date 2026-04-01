import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.0dd25f01e1ba4f7e9dec0610ddea13f1',
  appName: 'Puzzlecraft',
  webDir: 'dist',
  server: {
    url: 'https://0dd25f01-e1ba-4f7e-9dec-0610ddea13f1.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#000000',
      showSpinner: false,
      splashImmersive: true,
      splashFullScreen: true,
    },
  },
  ios: {
    scheme: 'Puzzlecraft',
  },
};

export default config;
