import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../firebase/config';
import { applyInvoiceCreate, applyInvoiceAmountChange, applyInvoiceDelete } from './balanceService';
import { scheduleDueDateAlerts, cancelDueDateAlerts } from './notificationService';

const db = () => firestore();
const col = () => db().collection(COLLECTIONS.INVOICES);

export function watchCustomerInvoices(customerId, callback) {
  return col()
    .where('customerId', '==', customerId)
    .orderBy('dueDate', 'asc')
    .onSnapshot(
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      error => {
        console.log('watchCustomerInvoices hata:', error);
        callback([]);
      },
    );
}

export async function createInvoice({ customerId, customerName, invoiceNo, amount, dueDate, note }) {
  const amt = Number(amount);
  let newId;
  await db().runTransaction(async transaction => {
    await applyInvoiceCreate(transaction, { customerId, amount: amt });
    const ref = col().doc();
    newId = ref.id;
    transaction.set(ref, {
      customerId,
      customerName: customerName || '',
      invoiceNo: invoiceNo || '',
      amount: amt,
      remainingAmount: amt,
      dueDate, // 'YYYY-MM-DD'
      note: note || '',
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  });
  await scheduleDueDateAlerts({
    docType: 'invoice',
    docId: newId,
    customerName,
    dueDate,
    amount: amt,
  });
  return newId;
}

export async function updateInvoice(invoiceId, { customerId, customerName, invoiceNo, amount, dueDate, note }) {
  const newAmount = Number(amount);
  const invRef = col().doc(invoiceId);

  await db().runTransaction(async transaction => {
    const snap = await transaction.get(invRef);
    if (!snap.exists) throw new Error('Fatura bulunamadı');
    const data = snap.data();
    const newRemaining = await applyInvoiceAmountChange(transaction, {
      customerId,
      oldAmount: Number(data.amount),
      newAmount,
      oldRemaining: Number(data.remainingAmount),
    });
    transaction.update(invRef, {
      amount: newAmount,
      customerName: customerName || data.customerName || '',
      invoiceNo: invoiceNo || '',
      remainingAmount: newRemaining,
      dueDate,
      note: note || '',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  });

  // Tutar/vade değiştiği için bildirimler yeniden kurulur.
  await cancelDueDateAlerts('invoice', invoiceId);
  await scheduleDueDateAlerts({ docType: 'invoice', docId: invoiceId, customerName, dueDate, amount: newAmount });
}

export async function deleteInvoice(invoiceId, customerId) {
  const invRef = col().doc(invoiceId);
  await db().runTransaction(async transaction => {
    const snap = await transaction.get(invRef);
    if (!snap.exists) return;
    const data = snap.data();
    await applyInvoiceDelete(transaction, { customerId, remainingAmount: Number(data.remainingAmount) });
    transaction.delete(invRef);
  });
  await cancelDueDateAlerts('invoice', invoiceId);
}
