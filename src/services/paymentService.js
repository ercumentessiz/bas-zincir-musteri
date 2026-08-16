import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../firebase/config';
import { applyPaymentCreate, applyPaymentAmountChange, applyPaymentDelete } from './balanceService';

const db = () => firestore();
const col = () => db().collection(COLLECTIONS.PAYMENTS);
const invCol = () => db().collection(COLLECTIONS.INVOICES);

export function watchCustomerPayments(customerId, callback) {
  return col()
    .where('customerId', '==', customerId)
    .orderBy('date', 'desc')
    .onSnapshot(
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      error => {
        console.log('watchCustomerPayments hata:', error);
        callback([]);
      },
    );
}

// method: 'nakit' | 'havale' | 'kart' | 'cek'
export async function createPayment({ customerId, customerName, invoiceId, amount, method, date, note, photoUrl }) {
  const amt = Number(amount);
  let newId;
  await db().runTransaction(async transaction => {
    let invRef = null;
    if (invoiceId) {
      invRef = invCol().doc(invoiceId);
      const invSnap = await transaction.get(invRef);
      if (invSnap.exists) {
        const newRemaining = Math.max(0, Number(invSnap.data().remainingAmount) - amt);
        transaction.update(invRef, { remainingAmount: newRemaining, updatedAt: firestore.FieldValue.serverTimestamp() });
      }
    }
    await applyPaymentCreate(transaction, { customerId, amount: amt });
    const ref = col().doc();
    newId = ref.id;
    transaction.set(ref, {
      customerId,
      customerName: customerName || '',
      invoiceId: invoiceId || null,
      amount: amt,
      method: method || 'nakit',
      date, // 'YYYY-MM-DD'
      note: note || '',
      photoUrl: photoUrl || null,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  });
  return newId;
}

export async function updatePayment(paymentId, { customerId, invoiceId, amount, method, date, note, photoUrl }) {
  const newAmount = Number(amount);
  const payRef = col().doc(paymentId);

  await db().runTransaction(async transaction => {
    const paySnap = await transaction.get(payRef);
    if (!paySnap.exists) throw new Error('Ödeme bulunamadı');
    const oldData = paySnap.data();
    const oldAmount = Number(oldData.amount);
    const delta = newAmount - oldAmount;

    // Eski faturaya etkisini geri al, yeni (veya aynı) faturaya uygula.
    if (oldData.invoiceId) {
      const oldInvRef = invCol().doc(oldData.invoiceId);
      const oldInvSnap = await transaction.get(oldInvRef);
      if (oldInvSnap.exists) {
        const restored = Number(oldInvSnap.data().remainingAmount) + oldAmount;
        transaction.update(oldInvRef, { remainingAmount: restored, updatedAt: firestore.FieldValue.serverTimestamp() });
      }
    }
    if (invoiceId) {
      const newInvRef = invCol().doc(invoiceId);
      const newInvSnap = await transaction.get(newInvRef);
      if (newInvSnap.exists) {
        const baseRemaining =
          invoiceId === oldData.invoiceId
            ? Number(newInvSnap.data().remainingAmount) + oldAmount // az önce geri eklendi
            : Number(newInvSnap.data().remainingAmount);
        const newRemaining = Math.max(0, baseRemaining - newAmount);
        transaction.update(newInvRef, { remainingAmount: newRemaining, updatedAt: firestore.FieldValue.serverTimestamp() });
      }
    }

    await applyPaymentAmountChange(transaction, { customerId, oldAmount, newAmount });
    transaction.update(payRef, {
      invoiceId: invoiceId || null,
      amount: newAmount,
      method: method || oldData.method,
      date,
      note: note || '',
      photoUrl: photoUrl || oldData.photoUrl || null,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    void delta;
  });
}

export async function deletePayment(paymentId, customerId) {
  const payRef = col().doc(paymentId);
  await db().runTransaction(async transaction => {
    const snap = await transaction.get(payRef);
    if (!snap.exists) return;
    const data = snap.data();
    if (data.invoiceId) {
      const invRef = invCol().doc(data.invoiceId);
      const invSnap = await transaction.get(invRef);
      if (invSnap.exists) {
        const restored = Number(invSnap.data().remainingAmount) + Number(data.amount);
        transaction.update(invRef, { remainingAmount: restored, updatedAt: firestore.FieldValue.serverTimestamp() });
      }
    }
    await applyPaymentDelete(transaction, { customerId, amount: Number(data.amount) });
    transaction.delete(payRef);
  });
}
