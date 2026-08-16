import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createCheck, updateCheck } from '../services/checkService';
import { pickAndUploadPhoto } from '../services/photoService';
import ImageViewerModal from '../components/ImageViewerModal';
import CurrencyInput from '../components/CurrencyInput';
import SelectField from '../components/SelectField';
import { todayStr, formatDateTR } from '../utils/dateUtils';

const STATUS_OPTIONS = [
  { key: 'pending', label: 'Beklemede' },
  { key: 'collected', label: 'Tahsil Edildi' },
  { key: 'bounced', label: 'Karşılıksız' },
];

function DateField({ label, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShow(true)}>
        <Text style={{ color: '#000' }}>{value ? formatDateTR(value) : 'Seçiniz'}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={new Date((value || todayStr()) + 'T00:00:00')}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setShow(false);
            if (selected) {
              const y = selected.getFullYear();
              const m = String(selected.getMonth() + 1).padStart(2, '0');
              const d = String(selected.getDate()).padStart(2, '0');
              onChange(`${y}-${m}-${d}`);
            }
          }}
        />
      )}
    </>
  );
}

export default function CheckFormScreen({ route, navigation }) {
  const { customerId, customerName } = route.params;
  const existing = route.params?.check || null;
  const insets = useSafeAreaInsets();

  const [checkNo, setCheckNo] = useState(existing?.checkNo || '');
  const [ownerName, setOwnerName] = useState(existing?.ownerName || '');
  const [issueDate, setIssueDate] = useState(existing?.issueDate || todayStr());
  const [dueDate, setDueDate] = useState(existing?.dueDate || todayStr());
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [status, setStatus] = useState(existing?.status || 'pending');
  const [photoUrl, setPhotoUrl] = useState(existing?.photoUrl || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const onPickPhoto = async fromCamera => {
    setUploading(true);
    try {
      const url = await pickAndUploadPhoto('checks', fromCamera);
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
      const payload = { customerName, checkNo, ownerName, issueDate, dueDate, amount: amt, status, photoUrl };
      if (existing) {
        await updateCheck(existing.id, payload);
      } else {
        await createCheck({ customerId, ...payload });
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
      <Text style={styles.label}>Çek No</Text>
      <TextInput style={styles.input} value={checkNo} onChangeText={setCheckNo} placeholder="Çek numarası" placeholderTextColor="#999" />

      <Text style={styles.label}>Çek Sahibi</Text>
      <TextInput style={styles.input} value={ownerName} onChangeText={setOwnerName} placeholder="Ad Soyad / Firma" placeholderTextColor="#999" />

      <DateField label="Düzenleme Tarihi" value={issueDate} onChange={setIssueDate} />
      <DateField label="Vade Tarihi *" value={dueDate} onChange={setDueDate} />

      <Text style={styles.label}>Tutar (TL) *</Text>
      <CurrencyInput style={styles.input} value={amount} onChangeValue={setAmount} />

      <Text style={styles.label}>Durum</Text>
      <SelectField
        label="Durum"
        value={status}
        options={STATUS_OPTIONS.map(s => ({ label: s.label, value: s.key }))}
        onChange={setStatus}
      />

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
  button: { backgroundColor: '#1B2A6B', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 28 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
