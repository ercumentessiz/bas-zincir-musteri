/**
 * Baş Zincir - Müşteri
 * Entry point
 */
import { Buffer } from 'buffer';
// xlsx (Excel dışa aktarma) kütüphanesi Node.js'e özgü Buffer nesnesini
// kullanıyor; React Native ortamında bu global olarak tanımlı değil.
global.Buffer = global.Buffer || Buffer;

import { AppRegistry, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './src/App';
import { name as appName } from './app.json';

// Render dışında (async kod, event handler, native köprü) oluşan ve
// normalde uygulamayı sessizce kapatacak hataları yakalayıp ekranda
// gösterir. Bu sayede "uygulama beni atıyor" tipi çökmelerin gerçek
// nedeni görülebilir.
if (global.ErrorUtils) {
  const defaultHandler = global.ErrorUtils.getGlobalHandler && global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.log('Global hata yakalandı:', error, 'Fatal mi:', isFatal);
    try {
      Alert.alert(
        isFatal ? 'Kritik Hata' : 'Hata',
        String(error?.message || error) + '\n\n' + String(error?.stack || '').slice(0, 500),
      );
    } catch (e) {
      // Alert bile açılamazsa sessizce geç
    }
    if (defaultHandler) defaultHandler(error, isFatal);
  });
}

// Background FCM handler - must be registered outside of any component,
// so the notification is displayed even when the app is fully closed.
messaging().setBackgroundMessageHandler(async remoteMessage => {
  const notifee = require('@notifee/react-native').default;
  await notifee.displayNotification({
    title: remoteMessage.notification?.title || 'Baş Zincir',
    body: remoteMessage.notification?.body || '',
    android: {
      channelId: 'due-date-alerts',
      sound: 'default',
      importance: 4, // HIGH
      pressAction: { id: 'default' },
    },
  });
});

AppRegistry.registerComponent(appName, () => App);
