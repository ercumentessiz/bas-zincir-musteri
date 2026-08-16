import notifee, { AndroidImportance, TriggerType, AndroidVisibility } from '@notifee/react-native';
import { formatCurrencyTR, formatDateTR } from '../utils/dateUtils';

const CHANNEL_ID = 'due-date-alerts';
const ALERT_HOUR = 8;
const ALERT_MINUTE = 30;

export async function setupNotificationChannel() {
  await notifee.requestPermission();
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Vade Hatırlatmaları',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
    visibility: AndroidVisibility.PUBLIC,
  });
}

function idFor(docType, docId, offset) {
  // offset: 'due' (vade günü) | 'before3' (3 gün önce)
  return `${docType}_${docId}_${offset}`;
}

function triggerDateFor(dueDateStr, daysBefore) {
  const [y, m, d] = dueDateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d - daysBefore, ALERT_HOUR, ALERT_MINUTE, 0, 0);
  return dt;
}

/**
 * Belirli bir fatura/çek için iki yerel bildirim kurar:
 *  - Vade tarihinden 3 gün önce, saat 08:30
 *  - Vade günü, saat 08:30
 * Bu bildirimler, uygulama telefonda açıkken/arka planda bir güvenlik katmanıdır.
 * Uygulama tamamen kapalıyken asıl bildirim, Cloud Functions üzerinden gönderilen
 * FCM push mesajı ile gelir (bkz. functions/index.js).
 */
export async function scheduleDueDateAlerts({ docType, docId, customerName, dueDate, amount, isCheck = false }) {
  const label = isCheck ? 'Çek' : 'Fatura';
  const entries = [
    { offset: 'before3', daysBefore: 3, title: `${label} vadesi 3 gün sonra`, },
    { offset: 'due', daysBefore: 0, title: `${label} vadesi bugün`, },
  ];

  for (const entry of entries) {
    const date = triggerDateFor(dueDate, entry.daysBefore);
    if (date.getTime() <= Date.now()) continue; // geçmiş tarihe bildirim kurma

    await notifee.createTriggerNotification(
      {
        id: idFor(docType, docId, entry.offset),
        title: `${entry.title}: ${customerName}`,
        body: `${formatCurrencyTR(amount)} - Vade: ${formatDateTR(dueDate)}`,
        android: {
          channelId: CHANNEL_ID,
          sound: 'default',
          vibrationPattern: [300, 500, 300, 500],
          pressAction: { id: 'default' },
        },
      },
      { type: TriggerType.TIMESTAMP, timestamp: date.getTime() },
    );
  }
}

export async function cancelDueDateAlerts(docType, docId) {
  await notifee.cancelTriggerNotification(idFor(docType, docId, 'before3'));
  await notifee.cancelTriggerNotification(idFor(docType, docId, 'due'));
}
