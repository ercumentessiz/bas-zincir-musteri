import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../firebase/config';

const db = () => firestore();

/**
 * Bakiye kuralı:
 *   customer.balance = (tüm faturaların toplamı) - (tüm ödemelerin toplamı)
 * Pozitif bakiye  => müşteri borçlu
 * Negatif bakiye  => müşteri alacaklı (fazla ödeme yapmış)
 *
 * Her fonksiyon bir Firestore transaction() içinde çağrılmalı, böylece eşzamanlı
 * düzenlemelerde bakiye asla yanlış hesaplanmaz.
 */

async function adjustCustomerBalance(transaction, customerId, delta) {
  const custRef = db().collection(COLLECTIONS.CUSTOMERS).doc(customerId);
  const custSnap = await transaction.get(custRef);
  const current = custSnap.exists ? Number(custSnap.data().balance || 0) : 0;
  transaction.update(custRef, { balance: current + delta, updatedAt: firestore.FieldValue.serverTimestamp() });
}

// ---- Fatura (invoice) ----

export async function applyInvoiceCreate(transaction, { customerId, amount }) {
  await adjustCustomerBalance(transaction, customerId, amount);
}

export async function applyInvoiceAmountChange(transaction, { customerId, oldAmount, newAmount, oldRemaining }) {
  // Ödenmiş kısmı koru: yeni kalan tutar = yeni tutar - (eski tutar - eski kalan)
  const paidSoFar = oldAmount - oldRemaining;
  const newRemaining = Math.max(0, newAmount - paidSoFar);
  await adjustCustomerBalance(transaction, customerId, newAmount - oldAmount);
  return newRemaining;
}

export async function applyInvoiceDelete(transaction, { customerId, remainingAmount }) {
  // Sadece henüz ödenmemiş (kalan) kısım bakiyeden düşülür.
  await adjustCustomerBalance(transaction, customerId, -remainingAmount);
}

// ---- Ödeme (payment) ----

export async function applyPaymentCreate(transaction, { customerId, amount }) {
  await adjustCustomerBalance(transaction, customerId, -amount);
}

export async function applyPaymentAmountChange(transaction, { customerId, oldAmount, newAmount }) {
  await adjustCustomerBalance(transaction, customerId, -(newAmount - oldAmount));
}

export async function applyPaymentDelete(transaction, { customerId, amount }) {
  await adjustCustomerBalance(transaction, customerId, amount);
}

// Bir ödeme belirli bir faturaya bağlıysa faturanın kalan tutarını günceller.
export function nextInvoiceRemaining(oldRemaining, deltaPaymentAmount) {
  // deltaPaymentAmount pozitifse ödeme artmış demektir -> kalan azalır.
  return Math.max(0, oldRemaining - deltaPaymentAmount);
}
