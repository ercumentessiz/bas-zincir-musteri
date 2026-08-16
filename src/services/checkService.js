import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../firebase/config';
import { scheduleDueDateAlerts, cancelDueDateAlerts } from './notificationService';

const db = () => firestore();
const col = () => db().collection(COLLECTIONS.CHECKS);

export function watchCustomerChecks(customerId, callback) {
  return col()
    .where('customerId', '==', customerId)
    .orderBy('dueDate', 'asc')
    .onSnapshot(
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      error => {
        console.log('watchCustomerChecks hata:', error);
        callback([]);
      },
    );
}

// Takvim ekranı için: verilen tarihte vadesi olan tüm çekler.
export function watchChecksByDueDate(dateStr, callback) {
  return col()
    .where('dueDate', '==', dateStr)
    .onSnapshot(
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      error => {
        console.log('watchChecksByDueDate hata:', error);
        callback([]);
      },
    );
}

// "Çekler" toplu listeleme ekranı için: tüm müşterilerin tüm çekleri.
export function watchAllChecks(callback) {
  return col()
    .orderBy('dueDate', 'asc')
    .onSnapshot(
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      error => {
        console.log('watchAllChecks hata:', error);
        callback([]);
      },
    );
}

export async function createCheck({ customerId, customerName, checkNo, ownerName, issueDate, dueDate, amount, photoUrl }) {
  const ref = await col().add({
    customerId,
    customerName: customerName || '',
    checkNo: checkNo || '',
    ownerName: ownerName || '',
    issueDate: issueDate || null,
    dueDate,
    amount: Number(amount),
    status: 'pending', // pending | collected | bounced
    photoUrl: photoUrl || null,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
  await scheduleDueDateAlerts({
    docType: 'check',
    docId: ref.id,
    customerName,
    dueDate,
    amount: Number(amount),
    isCheck: true,
  });
  return ref.id;
}

export async function updateCheck(checkId, { customerName, checkNo, ownerName, issueDate, dueDate, amount, status, photoUrl }) {
  await col()
    .doc(checkId)
    .update({
      customerName: customerName || '',
      checkNo: checkNo || '',
      ownerName: ownerName || '',
      issueDate: issueDate || null,
      dueDate,
      amount: Number(amount),
      status: status || 'pending',
      photoUrl: photoUrl || null,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  await cancelDueDateAlerts('check', checkId);
  if (status !== 'collected') {
    await scheduleDueDateAlerts({
      docType: 'check',
      docId: checkId,
      customerName,
      dueDate,
      amount: Number(amount),
      isCheck: true,
    });
  }
}

export async function deleteCheck(checkId) {
  await col().doc(checkId).delete();
  await cancelDueDateAlerts('check', checkId);
}
