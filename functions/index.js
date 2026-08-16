/**
 * Baş Zincir - Müşteri
 * Her gün saat 08:30'da (Europe/Istanbul) çalışır.
 * Vadesi bugün olan ve vadesine 3 gün kalan, henüz tahsil edilmemiş
 * fatura/çekler için "due-date-alerts" konusuna (topic) FCM push bildirimi
 * gönderir. Uygulama kapalı olsa bile bildirim bu şekilde ulaşır.
 *
 * Deploy: firebase deploy --only functions  (Firebase CLI, ücretsiz Spark
 * planı üzerinde de Cloud Scheduler + Functions için Blaze planına geçiş
 * gerekir - Google'ın kendi kısıtı, üçüncü parti bir servise ihtiyaç yoktur.)
 */
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

const TOPIC = 'due-date-alerts';

function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const tzDate = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
  const y = tzDate.getFullYear();
  const m = String(tzDate.getMonth() + 1).padStart(2, '0');
  const day = String(tzDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function sendForDate(db, dateStr, label) {
  const [invSnap, chkSnap] = await Promise.all([
    db.collection('invoices').where('dueDate', '==', dateStr).where('remainingAmount', '>', 0).get(),
    db.collection('checks').where('dueDate', '==', dateStr).where('status', '==', 'pending').get(),
  ]);

  const sends = [];

  invSnap.forEach(doc => {
    const inv = doc.data();
    sends.push(
      getMessaging().send({
        topic: TOPIC,
        notification: {
          title: `Fatura vadesi ${label}: ${inv.customerName || ''}`,
          body: `${Number(inv.remainingAmount).toLocaleString('tr-TR')} ₺ - Vade: ${dateStr}`,
        },
        android: {
          priority: 'high',
          notification: { channelId: 'due-date-alerts', sound: 'default', defaultVibrateTimings: true },
        },
      }),
    );
  });

  chkSnap.forEach(doc => {
    const chk = doc.data();
    sends.push(
      getMessaging().send({
        topic: TOPIC,
        notification: {
          title: `Çek vadesi ${label}: ${chk.customerName || ''}`,
          body: `${Number(chk.amount).toLocaleString('tr-TR')} ₺ - Vade: ${dateStr}`,
        },
        android: {
          priority: 'high',
          notification: { channelId: 'due-date-alerts', sound: 'default', defaultVibrateTimings: true },
        },
      }),
    );
  });

  await Promise.allSettled(sends);
  return sends.length;
}

exports.dailyDueDateAlerts = onSchedule(
  { schedule: '30 8 * * *', timeZone: 'Europe/Istanbul', region: 'europe-west1' },
  async () => {
    const db = getFirestore();
    const todayCount = await sendForDate(db, todayStr(0), 'bugün');
    const in3DaysCount = await sendForDate(db, todayStr(3), '3 gün sonra');
    console.log(`Gönderilen bildirim: bugün=${todayCount}, 3-gün-sonra=${in3DaysCount}`);
  },
);
