import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS, PAGE_SIZE } from '../firebase/config';
import { applyInvoiceDelete, applyPaymentDelete } from './balanceService';

const db = () => firestore();
const col = () => db().collection(COLLECTIONS.CUSTOMERS);

export const SORT_MODES = {
  NAME_ASC: 'NAME_ASC',
  BALANCE_DESC: 'BALANCE_DESC', // Borcu en yüksekten en aza
  BALANCE_ASC: 'BALANCE_ASC', // Borcu en azdan en yükseğe
  CREDITORS: 'CREDITORS', // Alacaklı olanlar (balance < 0), en alacaklıdan başlayarak
};

function baseQueryFor(sortMode) {
  switch (sortMode) {
    case SORT_MODES.BALANCE_DESC:
      return col().orderBy('balance', 'desc');
    case SORT_MODES.BALANCE_ASC:
      return col().orderBy('balance', 'asc');
    case SORT_MODES.CREDITORS:
      // Negatif bakiyeliler (alacaklı), en küçükten (en çok alacaklı) sıralı
      return col().where('balance', '<', 0).orderBy('balance', 'asc');
    case SORT_MODES.NAME_ASC:
    default:
      return col().orderBy('nameLower', 'asc');
  }
}

/**
 * Sayfalı müşteri listesini CANLI (real-time) dinler — müşteri ekleme,
 * düzenleme veya silme işlemleri, ekran değişmeden anında listeye yansır.
 * @param {string} sortMode - SORT_MODES değerlerinden biri
 * @param {FirebaseFirestoreTypes.QueryDocumentSnapshot|null} startAfterDoc - "Sonraki" için son görünen doküman
 * @param {string} searchText - isimde arama (client-side prefix filtresi ile birlikte)
 * @param {function} callback - ({ docs, customers }) => void
 * @returns {function} unsubscribe
 */
export function watchCustomersPage({ sortMode = SORT_MODES.NAME_ASC, startAfterDoc = null, searchText = '' }, callback) {
  let query = baseQueryFor(sortMode).limit(PAGE_SIZE);

  if (searchText && searchText.trim()) {
    const term = searchText.trim().toLocaleLowerCase('tr-TR');
    // nameLower alanında prefix araması (Firestore range query)
    query = col()
      .orderBy('nameLower', 'asc')
      .startAt(term)
      .endAt(term + '\uf8ff')
      .limit(PAGE_SIZE);
  } else if (startAfterDoc) {
    query = query.startAfter(startAfterDoc);
  }

  return query.onSnapshot(
    snap => {
      callback({
        docs: snap.docs,
        customers: snap.docs.map(d => ({ id: d.id, ...d.data() })),
      });
    },
    error => {
      console.log('watchCustomersPage hata:', error);
      callback({ docs: [], customers: [] });
    },
  );
}

export function watchCustomer(customerId, callback, onError) {
  return col()
    .doc(customerId)
    .onSnapshot(
      snap => callback(snap.exists ? { id: snap.id, ...snap.data() } : null),
      error => {
        console.log('watchCustomer hata:', error);
        callback(null);
        if (onError) onError(error);
      },
    );
}

// Excel'e "tüm müşteriler" olarak aktarmak için: sayfalama olmadan TÜM müşterileri getirir.
export async function fetchAllCustomersForExport() {
  const snap = await col().orderBy('nameLower', 'asc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createCustomer({ name, city, phone }) {
  const now = firestore.FieldValue.serverTimestamp();
  const ref = await col().add({
    name: name.trim(),
    nameLower: name.trim().toLocaleLowerCase('tr-TR'),
    city: city?.trim() || '',
    phone: phone?.trim() || '',
    balance: 0,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateCustomer(customerId, { name, city, phone }) {
  await col()
    .doc(customerId)
    .update({
      name: name.trim(),
      nameLower: name.trim().toLocaleLowerCase('tr-TR'),
      city: city?.trim() || '',
      phone: phone?.trim() || '',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
}

// Müşteriyi ve ona bağlı TÜM fatura / ödeme / çek kayıtlarını siler.
export async function deleteCustomerCascade(customerId) {
  const [invoicesSnap, paymentsSnap, checksSnap] = await Promise.all([
    db().collection(COLLECTIONS.INVOICES).where('customerId', '==', customerId).get(),
    db().collection(COLLECTIONS.PAYMENTS).where('customerId', '==', customerId).get(),
    db().collection(COLLECTIONS.CHECKS).where('customerId', '==', customerId).get(),
  ]);

  // Firestore batch limiti 500 işlemdir; bu boyuttaki müşteri geçmişleri için yeterli.
  const batch = db().batch();
  invoicesSnap.docs.forEach(d => batch.delete(d.ref));
  paymentsSnap.docs.forEach(d => batch.delete(d.ref));
  checksSnap.docs.forEach(d => batch.delete(d.ref));
  batch.delete(col().doc(customerId));
  await batch.commit();
}

// Bir müşterinin gecikmiş ödemesi / 3 gün içinde vadesi var / güncel durumunu hesaplar.
// Kullanım: müşteri listesindeki renkli nokta ve "X Gün Geçti" uyarısı için.
export async function getCustomerStatus(customerId) {
  const { computeCustomerStatusFromDocs } = require('./statusService');
  const [invoicesSnap, checksSnap] = await Promise.all([
    db().collection(COLLECTIONS.INVOICES).where('customerId', '==', customerId).get(),
    db().collection(COLLECTIONS.CHECKS).where('customerId', '==', customerId).get(),
  ]);
  return computeCustomerStatusFromDocs(
    invoicesSnap.docs.map(d => d.data()),
    checksSnap.docs.map(d => d.data()),
  );
}
