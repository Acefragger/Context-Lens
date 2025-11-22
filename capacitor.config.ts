import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.contextlens.app',
  appName: 'Context Lens',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;