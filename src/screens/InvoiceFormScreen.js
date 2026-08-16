import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createInvoice, updateInvoice } from '../services/invoiceService';
import CurrencyInput from '../components/CurrencyInput';
import { todayStr, formatDateTR } from '../utils/dateUtils';

export default function InvoiceFormScreen({ route, navigation }) {
  const { customerId, customerName } = route.params;
  const existing = route.params?.invoice || null;
  const insets = useSafeAreaInsets();

  const [invoiceNo, setInvoiceNo] = useState(existing?.invoiceNo || '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [dueDate, setDueDate] = useState(existing?.dueDate || todayStr());
  const [note, setNote] = useState(existing?.note || '');
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Eksik bilgi', 'Geçerli bir tutar giriniz.');
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await updateInvoice(existing.id, { customerId, customerName, invoiceNo, amount: amt, dueDate, note });
      } else {
        await createInvoice({ customerId, customerName, invoiceNo, amount: amt, dueDate, note });
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
      <Text style={styles.label}>Fatura Numarası</Text>
      <TextInput style={styles.input} value={invoiceNo} onChangeText={setInvoiceNo} placeholder="Fatura numarası" placeholderTextColor="#999" />

      <Text style={styles.label}>Tutar (TL) *</Text>
      <CurrencyInput style={styles.input} value={amount} onChangeValue={setAmount} />

      <Text style={styles.label}>Vade Tarihi *</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
        <Text style={{ color: '#000' }}>{formatDateTR(dueDate)}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={new Date(dueDate + 'T00:00:00')}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setShowPicker(false);
            if (selected) {
              const y = selected.getFullYear();
              const m = String(selected.getMonth() + 1).padStart(2, '0');
              const d = String(selected.getDate()).padStart(2, '0');
              setDueDate(`${y}-${m}-${d}`);
            }
          }}
        />
      )}

      <Text style={styles.label}>Not</Text>
      <TextInput style={[styles.input, { height: 80 }]} value={note} onChangeText={setNote} multiline placeholder="Opsiyonel açıklama" placeholderTextColor="#999" />

      <TouchableOpacity style={styles.button} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{existing ? 'Güncelle' : 'Kaydet'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20 },
  label: { fontSize: 13, color: '#666', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, justifyContent: 'center', color: '#000' },
  button: { backgroundColor: '#1B2A6B', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 28 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
