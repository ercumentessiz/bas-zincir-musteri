import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../firebase/config';
import ImageViewerModal from '../components/ImageViewerModal';
import { formatCurrencyTR, formatDateTR } from '../utils/dateUtils';

const STATUS_LABELS = { pending: 'Beklemede', collected: 'Tahsil Edildi', bounced: 'Karşılıksız' };
const STATUS_COLORS = { pending: '#F9A825', collected: '#2E7D32', bounced: '#C1272D' };

export default function AllChecksScreen({ navigation }) {
  const [checks, setChecks] = useState([]);
  const [checkPayments, setCheckPayments] = useState([]);
  const [loadingChecks, setLoadingChecks] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [viewerUri, setViewerUri] = useState(null);

  useEffect(() => {
    const unsub1 = firestore()
      .collection(COLLECTIONS.CHECKS)
      .orderBy('dueDate', 'asc')
      .onSnapshot(
        snap => {
          setChecks(snap.docs.map(d => ({ id: d.id, ...d.data(), _source: 'check' })));
          setLoadingChecks(false);
        },
        error => {
          console.log('AllChecksScreen checks hata:', error);
          setLoadingChecks(false);
        },
      );

    // "Çek" yöntemiyle yapılan ödemeler (fotoğraflı çekler) de burada listelenir.
    const unsub2 = firestore()
      .collection(COLLECTIONS.PAYMENTS)
      .where('method', '==', 'cek')
      .onSnapshot(
        snap => {
          setCheckPayments(snap.docs.map(d => ({ id: d.id, ...d.data(), _source: 'payment' })));
          setLoadingPayments(false);
        },
        error => {
          console.log('AllChecksScreen payments hata:', error);
          setLoadingPayments(false);
        },
      );

    return () => {
      try { unsub1(); } catch (e) { console.log('unsub1 hata:', e); }
      try { unsub2(); } catch (e) { console.log('unsub2 hata:', e); }
    };
  }, []);

  const loading = loadingChecks || loadingPayments;

  const combined = [
    ...checks.map(c => ({
      key: 'check_' + c.id,
      customerId: c.customerId,
      customerName: c.customerName,
      ownerName: c.ownerName,
      checkNo: c.checkNo,
      amount: c.amount,
      dueDate: c.dueDate,
      photoUrl: c.photoUrl,
      status: c.status,
      badge: STATUS_LABELS[c.status] || c.status,
      badgeColor: STATUS_COLORS[c.status] || '#999',
      sortDate: c.dueDate,
    })),
    ...checkPayments.map(p => ({
      key: 'payment_' + p.id,
      customerId: p.customerId,
      customerName: p.customerName,
      ownerName: '-',
      checkNo: '-',
      amount: p.amount,
      dueDate: p.date,
      photoUrl: p.photoUrl,
      status: 'payment',
      badge: 'Ödeme Olarak Alındı',
      badgeColor: '#1B2A6B',
      sortDate: p.date,
    })),
  ].sort((a, b) => (a.sortDate < b.sortDate ? 1 : a.sortDate > b.sortDate ? -1 : 0));

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1B2A6B" />;

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>{combined.length} çek kaydı</Text>
      <FlatList
        data={combined}
        keyExtractor={item => item.key}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: item.customerId, customerName: item.customerName })}>
              <Text style={styles.customerName}>{item.customerName || 'Müşteri'}</Text>
              <Text style={styles.line}>Çek Sahibi: {item.ownerName || '-'}</Text>
              <Text style={styles.line}>Çek No: {item.checkNo || '-'}</Text>
              <Text style={styles.line}>Tarih: {formatDateTR(item.dueDate)}</Text>
              <Text style={styles.amount}>{formatCurrencyTR(item.amount)}</Text>
              <Text style={[styles.statusBadge, { backgroundColor: item.badgeColor }]}>{item.badge}</Text>
            </TouchableOpacity>
            {item.photoUrl ? (
              <TouchableOpacity onPress={() => setViewerUri(item.photoUrl)}>
                <Image source={{ uri: item.photoUrl }} style={styles.thumb} />
              </TouchableOpacity>
            ) : (
              <View style={[styles.thumb, styles.noThumb]}>
                <Text style={styles.noThumbText}>Fotoğraf yok</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Kayıtlı çek bulunmuyor.</Text>}
      />
      <ImageViewerModal visible={!!viewerUri} uri={viewerUri} onClose={() => setViewerUri(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerText: { padding: 14, fontWeight: '700', color: '#1B2A6B' },
  row: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'flex-start' },
  customerName: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 4 },
  line: { fontSize: 13, color: '#555', marginTop: 1 },
  amount: { fontSize: 14, fontWeight: '700', color: '#1B2A6B', marginTop: 4 },
  statusBadge: { alignSelf: 'flex-start', color: '#fff', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6, overflow: 'hidden' },
  thumb: { width: 90, height: 90, borderRadius: 8, marginLeft: 10 },
  noThumb: { backgroundColor: '#f2f2f5', alignItems: 'center', justifyContent: 'center', padding: 4 },
  noThumbText: { fontSize: 10, color: '#999', textAlign: 'center' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
});
