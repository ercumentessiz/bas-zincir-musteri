import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SORT_MODES } from '../services/customerService';

const OPTIONS = [
  { key: SORT_MODES.NAME_ASC, label: 'Alfabetik (A-Z)' },
  { key: SORT_MODES.BALANCE_DESC, label: 'Borcu En Yüksekten En Aza' },
  { key: SORT_MODES.BALANCE_ASC, label: 'Borcu En Azdan En Yükseğe' },
  { key: SORT_MODES.CREDITORS, label: 'Alacaklı Olan Müşteriler' },
];

export default function SortFilterModal({ visible, currentSort, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Sıralama</Text>
          {OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={styles.option}
              onPress={() => {
                onSelect(opt.key);
                onClose();
              }}>
              <Text style={[styles.optionText, currentSort === opt.key && styles.optionTextActive]}>{opt.label}</Text>
              {currentSort === opt.key && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 32 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#1B2A6B' },
  option: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  optionText: { fontSize: 15, color: '#333' },
  optionTextActive: { color: '#C1272D', fontWeight: '700' },
  check: { color: '#C1272D', fontWeight: '700' },
});
