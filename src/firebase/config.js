/**
 * Firebase config for Baş Zincir - Müşteri
 *
 * With @react-native-firebase, the actual connection settings come from
 * android/app/google-services.json (downloaded from the Firebase console),
 * NOT from this file. This file only holds app-level constants.
 */

// Bu e-postalarla giriş yapan herkes uygulamayı görüntüleyebilir.
export const ALLOWED_EMAILS = [
  'pdrercumentessiz@gmail.com',
  'baszincirosb@gmail.com',
  'baszincir@gmail.com',
  'pazarlama2@baszincir.com.tr',
];

// Sadece bu e-posta ekleme/düzenleme/silme yapabilir (tam yetkili).
// Yukarıdaki listedeki diğer herkes salt-okunur erişime sahiptir.
export const ADMIN_EMAIL = 'pdrercumentessiz@gmail.com';

// FCM topic that every signed-in device subscribes to, used by the
// scheduled Cloud Function (functions/index.js) to push due-date alerts.
export const FCM_TOPIC = 'due-date-alerts';

export const COLLECTIONS = {
  CUSTOMERS: 'customers',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  CHECKS: 'checks',
};

export const PAGE_SIZE = 20;
