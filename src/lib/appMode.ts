import { Capacitor } from '@capacitor/core';

/** Returns true when running inside the native iOS/Android shell */
export const isNativeApp = () => Capacitor.isNativePlatform();
