import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createCustomer, updateCustomer } from '../services/customerService';

export default function CustomerFormScreen({ route, navigation }) {
  const existing = route.params?.customer || null;
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(existing?.name || '');
  const [city, setCity] = useState(existing?.city || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Eksik bilgi', 'Müşteri adı zorunludur.');
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await updateCustomer(existing.id, { name, city, phone });
      } else {
        await createCustomer({ name, city, phone });
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Hata', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: 20 + insets.bottom }]}>
      <Text style={styles.label}>Müşteri Adı *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ad Soyad / Firma" placeholderTextColor="#999" />

      <Text style={styles.label}>İl</Text>
      <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="İl" placeholderTextColor="#999" />

      <Text style={styles.label}>Telefon</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="05xx xxx xx xx" placeholderTextColor="#999" keyboardType="phone-pad" />

      <TouchableOpacity style={styles.button} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{existing ? 'Güncelle' : 'Kaydet'}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  label: { fontSize: 13, color: '#666', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, color: '#000' },
  button: { backgroundColor: '#1B2A6B', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 28 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
