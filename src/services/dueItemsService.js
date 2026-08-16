import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../firebase/config';
import { todayStr } from '../utils/dateUtils';

const db = () => firestore();

// Takvimde seçilen günde vadesi olan fatura + çekler
export function watchDueItemsForDate(dateStr, callback) {
  const unsubInv = db()
    .collection(COLLECTIONS.INVOICES)
    .where('dueDate', '==', dateStr)
    .onSnapshot(
      snap => callback('invoices', snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      error => {
        console.log('watchDueItemsForDate (invoices) hata:', error);
        callback('invoices', []);
      },
    );
  const unsubChk = db()
    .collection(COLLECTIONS.CHECKS)
    .where('dueDate', '==', dateStr)
    .onSnapshot(
      snap => callback('checks', snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      error => {
        console.log('watchDueItemsForDate (checks) hata:', error);
        callback('checks', []);
      },
    );
  return () => {
    try { unsubInv(); } catch (e) { console.log('unsubInv hata:', e); }
    try { unsubChk(); } catch (e) { console.log('unsubChk hata:', e); }
  };
}

// Takvimde işaretli günleri belirlemek için: önümüzdeki ~120 gün + geçmiş
// vadesi geçmemiş kalan faturalar/çekler. Basitlik için tüm açık kayıtları çekip
// istemci tarafında tarihe göre gruplarız (800-1000 müşteri ölçeğinde sorun teşkil etmez).
export async function fetchAllOpenDueDates() {
  const [invSnap, chkSnap] = await Promise.all([
    db().collection(COLLECTIONS.INVOICES).where('remainingAmount', '>', 0).get(),
    db().collection(COLLECTIONS.CHECKS).where('status', '==', 'pending').get(),
  ]);
  const dates = new Set();
  invSnap.docs.forEach(d => dates.add(d.data().dueDate));
  chkSnap.docs.forEach(d => dates.add(d.data().dueDate));
  return Array.from(dates);
}

// Geciken Ödemeler ekranı: vadesi geçmiş tüm açık fatura/çekler
// NOT: Firestore aynı sorguda iki farklı alanda karşılaştırma (>,<) işlemine
// izin vermez, bu yüzden sadece dueDate'e göre sorgulayıp remainingAmount/status
// filtresini istemci tarafında uyguluyoruz.
export async function fetchOverdueItems() {
  const today = todayStr();
  const [invSnap, chkSnap] = await Promise.all([
    db().collection(COLLECTIONS.INVOICES).where('dueDate', '<', today).orderBy('dueDate', 'asc').get(),
    db().collection(COLLECTIONS.CHECKS).where('dueDate', '<', today).orderBy('dueDate', 'asc').get(),
  ]);
  const invoices = invSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(i => Number(i.remainingAmount) > 0);
  const checks = chkSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(c => c.status === 'pending');
  return { invoices, checks };
}
