import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { watchCustomer, deleteCustomerCascade } from '../services/customerService';
import { watchCustomerInvoices, deleteInvoice } from '../services/invoiceService';
import { watchCustomerPayments, deletePayment } from '../services/paymentService';
import { watchCustomerChecks, deleteCheck } from '../services/checkService';
import { exportCustomerLedgerToExcel } from '../services/excelExportService';
import ImageViewerModal from '../components/ImageViewerModal';
import { formatCurrencyTR, formatDateTR, daysPastDue } from '../utils/dateUtils';

const CHECK_STATUS_LABELS = { pending: 'Beklemede', collected: 'Tahsil Edildi', bounced: 'Karşılıksız' };

function Section({ title, onAdd, isAdmin, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {isAdmin && (
          <TouchableOpacity onPress={onAdd} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Ekle</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

export default function CustomerDetailScreen({ route, navigation }) {
  const { customerId } = route.params;
  const { isAdmin } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [checks, setChecks] = useState([]);
  const [viewerUri, setViewerUri] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const unsubs = [];
    const safeWatch = (label, fn, ...args) => {
      try {
        const result = fn(...args);
        if (typeof result === 'function') {
          unsubs.push(result);
        } else {
          console.log(`${label}: beklenmeyen dönüş değeri (fonksiyon değil):`, result);
        }
      } catch (e) {
        console.log(`${label} hata:`, e);
      }
    };

    safeWatch('watchCustomer', watchCustomer, customerId, setCustomer, err => setLoadError(err));
    safeWatch('watchCustomerInvoices', watchCustomerInvoices, customerId, setInvoices);
    safeWatch('watchCustomerPayments', watchCustomerPayments, customerId, setPayments);
    safeWatch('watchCustomerChecks', watchCustomerChecks, customerId, setChecks);

    return () => {
      unsubs.forEach(u => {
        try {
          u();
        } catch (e) {
          console.log('Dinleyici kapatma hatası:', e);
        }
      });
    };
  }, [customerId]);

  if (!customer) {
    if (loadError) {
      return (
        <View style={[styles.container, { padding: 20 }]}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#C1272D', marginBottom: 10 }}>
            Müşteri yüklenemedi
          </Text>
          <Text style={{ fontSize: 13, color: '#333', marginBottom: 6 }}>
            Kod: {String(loadError.code || 'bilinmiyor')}
          </Text>
          <Text style={{ fontSize: 13, color: '#333', marginBottom: 6 }}>
            Mesaj: {String(loadError.message || loadError)}
          </Text>
          <Text style={{ fontSize: 12, color: '#999' }}>customerId: {customerId}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#1B2A6B" />
      </View>
    );
  }

  const worstOverdue = invoices
    .filter(i => Number(i.remainingAmount) > 0)
    .map(i => daysPastDue(i.dueDate))
    .filter(d => d > 0)
    .concat(
      checks
        .filter(c => c.status !== 'collected')
        .map(c => daysPastDue(c.dueDate))
        .filter(d => d > 0),
    )
    .reduce((max, d) => Math.max(max, d), 0);

  const onDeleteCustomer = () => {
    Alert.alert(
      'Müşteriyi Sil',
      `${customer.name} silinecek. Bağlı tüm fatura, ödeme ve çek kayıtları da silinecektir. Emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomerCascade(customerId);
            navigation.popToTop();
          },
        },
      ],
    );
  };

  const confirmDelete = (title, onConfirm) => {
    Alert.alert(title, 'Bu kayıt silinecek. Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: onConfirm },
    ]);
  };

  const onExportLedger = async () => {
    setExporting(true);
    try {
      const result = await exportCustomerLedgerToExcel(customer, invoices, payments);
      if (result.savedToDownloads) {
        Alert.alert('Excel Hazır', '"İndirilenler" klasörüne kaydedildi.');
      }
    } catch (e) {
      Alert.alert('Excel Hatası', e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{customer.name}</Text>
          {isAdmin && (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => navigation.navigate('CustomerForm', { customer })}>
                <Text style={styles.editLink}>Düzenle</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onDeleteCustomer}>
                <Text style={styles.deleteLink}>Sil</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Text style={styles.infoLine}>İl: {customer.city || '-'}</Text>
        <Text style={styles.infoLine}>Telefon: {customer.phone || '-'}</Text>
        <Text style={[styles.balance, { color: Number(customer.balance) > 0 ? '#C1272D' : '#2E7D32' }]}>
          Bakiye: {formatCurrencyTR(customer.balance)}
        </Text>
        {worstOverdue > 0 && <Text style={styles.overdueBadge}>{worstOverdue} Gün Geçti</Text>}

        <TouchableOpacity style={styles.exportBtn} onPress={onExportLedger} disabled={exporting}>
          <Text style={styles.exportBtnText}>{exporting ? 'Hazırlanıyor...' : '⇩ Cari Hesap Dökümü (Excel)'}</Text>
        </TouchableOpacity>
      </View>

      <Section title="Faturalar" isAdmin={isAdmin} onAdd={() => navigation.navigate('InvoiceForm', { customerId, customerName: customer.name })}>
        {invoices.length === 0 && <Text style={styles.emptyText}>Kayıtlı fatura yok.</Text>}
        {invoices.map(inv => (
          <TouchableOpacity
            key={inv.id}
            style={styles.itemRow}
            onPress={() => isAdmin && navigation.navigate('InvoiceForm', { customerId, customerName: customer.name, invoice: inv })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{inv.invoiceNo ? `#${inv.invoiceNo} · ` : ''}{formatCurrencyTR(inv.amount)} · Vade: {formatDateTR(inv.dueDate)}</Text>
              <Text style={styles.itemSub}>Kalan: {formatCurrencyTR(inv.remainingAmount)}{inv.note ? ` · ${inv.note}` : ''}</Text>
            </View>
            {isAdmin && (
              <TouchableOpacity onPress={() => confirmDelete('Fatura Sil', () => deleteInvoice(inv.id, customerId))}>
                <Text style={styles.deleteLink}>Sil</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </Section>

      <Section title="Ödemeler" isAdmin={isAdmin} onAdd={() => navigation.navigate('PaymentForm', { customerId, customerName: customer.name, invoices })}>
        {payments.length === 0 && <Text style={styles.emptyText}>Kayıtlı ödeme yok.</Text>}
        {payments.map(p => (
          <View key={p.id} style={styles.itemRow}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => isAdmin && navigation.navigate('PaymentForm', { customerId, customerName: customer.name, invoices, payment: p })}>
              <Text style={styles.itemTitle}>{formatCurrencyTR(p.amount)} · {formatDateTR(p.date)}</Text>
              <Text style={styles.itemSub}>{p.method}{p.note ? ` · ${p.note}` : ''}</Text>
            </TouchableOpacity>
            {p.photoUrl && (
              <TouchableOpacity onPress={() => setViewerUri(p.photoUrl)}>
                <Image source={{ uri: p.photoUrl }} style={styles.thumb} />
              </TouchableOpacity>
            )}
            {isAdmin && (
              <TouchableOpacity onPress={() => confirmDelete('Ödeme Sil', () => deletePayment(p.id, customerId))}>
                <Text style={styles.deleteLink}>Sil</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </Section>

      <Section title="Çekler" isAdmin={isAdmin} onAdd={() => navigation.navigate('CheckForm', { customerId, customerName: customer.name })}>
        {checks.length === 0 && <Text style={styles.emptyText}>Kayıtlı çek yok.</Text>}
        {checks.map(c => (
          <View key={c.id} style={styles.itemRow}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => isAdmin && navigation.navigate('CheckForm', { customerId, customerName: customer.name, check: c })}>
              <Text style={styles.itemTitle}>{formatCurrencyTR(c.amount)} · Vade: {formatDateTR(c.dueDate)}</Text>
              <Text style={styles.itemSub}>No: {c.checkNo || '-'} · Sahibi: {c.ownerName || '-'} · {CHECK_STATUS_LABELS[c.status] || c.status}</Text>
            </TouchableOpacity>
            {c.photoUrl && (
              <TouchableOpacity onPress={() => setViewerUri(c.photoUrl)}>
                <Image source={{ uri: c.photoUrl }} style={styles.thumb} />
              </TouchableOpacity>
            )}
            {isAdmin && (
              <TouchableOpacity onPress={() => confirmDelete('Çek Sil', () => deleteCheck(c.id))}>
                <Text style={styles.deleteLink}>Sil</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </Section>

      <ImageViewerModal visible={!!viewerUri} uri={viewerUri} onClose={() => setViewerUri(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f9' },
  headerCard: { backgroundColor: '#fff', padding: 18, marginBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerActions: { flexDirection: 'row', gap: 16, flexShrink: 0 },
  name: { fontSize: 20, fontWeight: '700', color: '#222', flex: 1, marginRight: 10 },
  infoLine: { fontSize: 14, color: '#555', marginTop: 4 },
  balance: { fontSize: 18, fontWeight: '700', marginTop: 10 },
  overdueBadge: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#C1272D', color: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontWeight: '700', fontSize: 12 },
  exportBtn: { marginTop: 14, backgroundColor: '#1B2A6B', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  editLink: { color: '#1B2A6B', fontWeight: '600', marginRight: 4 },
  deleteLink: { color: '#C1272D', fontWeight: '600' },
  section: { backgroundColor: '#fff', padding: 16, marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1B2A6B' },
  addBtn: { backgroundColor: '#1B2A6B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#999', fontSize: 13, paddingVertical: 6 },
  itemRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#222' },
  itemSub: { fontSize: 12, color: '#777', marginTop: 2 },
  thumb: { width: 50, height: 50, borderRadius: 6, marginHorizontal: 8 },
});
