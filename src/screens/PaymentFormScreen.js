import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createPayment, updatePayment } from '../services/paymentService';
import { pickAndUploadPhoto } from '../services/photoService';
import CurrencyInput from '../components/CurrencyInput';
import SelectField from '../components/SelectField';
import ImageViewerModal from '../components/ImageViewerModal';
import { todayStr, formatDateTR, formatCurrencyTR } from '../utils/dateUtils';

const METHODS = [
  { key: 'nakit', label: 'Nakit' },
  { key: 'havale', label: 'Havale/EFT' },
  { key: 'kart', label: 'Kredi Kartı' },
  { key: 'cek', label: 'Çek' },
];

export default function PaymentFormScreen({ route, navigation }) {
  const { customerId, customerName, invoices = [] } = route.params;
  const existing = route.params?.payment || null;
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [method, setMethod] = useState(existing?.method || 'nakit');
  const [date, setDate] = useState(existing?.date || todayStr());
  const [invoiceId, setInvoiceId] = useState(existing?.invoiceId || '');
  const [note, setNote] = useState(existing?.note || '');
  const [photoUrl, setPhotoUrl] = useState(existing?.photoUrl || null);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const openInvoices = invoices.filter(i => Number(i.remainingAmount) > 0 || i.id === existing?.invoiceId);
  const invoiceOptions = [
    { label: '— Fatura seçilmedi —', value: '' },
    ...openInvoices.map(inv => ({
      label: `${formatDateTR(inv.dueDate)} · Kalan: ${formatCurrencyTR(inv.remainingAmount)}`,
      value: inv.id,
    })),
  ];

  const onPickPhoto = async fromCamera => {
    setUploading(true);
    try {
      const url = await pickAndUploadPhoto('payments', fromCamera);
      if (url) setPhotoUrl(url);
    } catch (e) {
      Alert.alert('Fotoğraf Hatası', e.message);
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Eksik bilgi', 'Geçerli bir tutar giriniz.');
      return;
    }
    setSaving(true);
    try {
      const payload = { customerId, customerName, invoiceId: invoiceId || null, amount: amt, method, date, note, photoUrl };
      if (existing) {
        await updatePayment(existing.id, payload);
      } else {
        await createPayment(payload);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Hata', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={[styles.container, { paddingBottom: 24 + insets.bottom }]}>
      <Text style={styles.label}>Tutar (TL) *</Text>
      <CurrencyInput style={styles.input} value={amount} onChangeValue={setAmount} />

      <Text style={styles.label}>Ödeme Yöntemi</Text>
      <SelectField label="Ödeme Yöntemi" value={method} options={METHODS.map(m => ({ label: m.label, value: m.key }))} onChange={setMethod} />

      <Text style={styles.label}>Tarih *</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
        <Text style={{ color: '#000' }}>{formatDateTR(date)}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={new Date(date + 'T00:00:00')}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setShowPicker(false);
            if (selected) {
              const y = selected.getFullYear();
              const m = String(selected.getMonth() + 1).padStart(2, '0');
              const d = String(selected.getDate()).padStart(2, '0');
              setDate(`${y}-${m}-${d}`);
            }
          }}
        />
      )}

      <Text style={styles.label}>Bağlı Fatura (opsiyonel)</Text>
      <SelectField label="Bağlı Fatura" value={invoiceId} options={invoiceOptions} onChange={setInvoiceId} placeholder="— Fatura seçilmedi —" />

      <Text style={styles.label}>Not</Text>
      <TextInput style={[styles.input, { height: 80 }]} value={note} onChangeText={setNote} multiline placeholder="Opsiyonel açıklama" placeholderTextColor="#999" />

      {method === 'cek' && (
        <>
          <Text style={styles.label}>Çek Fotoğrafı</Text>
          {photoUrl && (
            <TouchableOpacity onPress={() => setViewerOpen(true)}>
              <Image source={{ uri: photoUrl }} style={styles.photo} />
            </TouchableOpacity>
          )}
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoBtn} onPress={() => onPickPhoto(true)} disabled={uploading}>
              <Text style={styles.photoBtnText}>📷 Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={() => onPickPhoto(false)} disabled={uploading}>
              <Text style={styles.photoBtnText}>🖼 Galeri</Text>
            </TouchableOpacity>
          </View>
          {uploading && <ActivityIndicator style={{ marginTop: 8 }} />}
          <Text style={styles.hintText}>Bu ödeme, fotoğrafıyla birlikte "Çekler" sayfasında da otomatik görünecektir.</Text>
        </>
      )}

      <TouchableOpacity style={styles.button} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{existing ? 'Güncelle' : 'Kaydet'}</Text>}
      </TouchableOpacity>

      <ImageViewerModal visible={viewerOpen} uri={photoUrl} onClose={() => setViewerOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20 },
  label: { fontSize: 13, color: '#666', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, justifyContent: 'center', color: '#000' },
  photoRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  photoBtn: { flex: 1, backgroundColor: '#f2f2f5', borderRadius: 8, padding: 12, alignItems: 'center', marginRight: 8 },
  photoBtnText: { fontWeight: '600', color: '#333' },
  photo: { width: '100%', height: 180, borderRadius: 10, marginTop: 8 },
  hintText: { fontSize: 12, color: '#888', marginTop: 8, fontStyle: 'italic' },
  button: { backgroundColor: '#1B2A6B', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 28 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
