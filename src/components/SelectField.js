import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList } from 'react-native';

// options: [{ label, value }]
export default function SelectField({ label, value, options, onChange, placeholder = 'Seçiniz' }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <>
      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)}>
        <Text style={selected ? styles.valueText : styles.placeholderText} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            {!!label && <Text style={styles.sheetTitle}>{label}</Text>}
            <FlatList
              data={options}
              keyExtractor={o => String(o.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}>
                  <Text style={[styles.optionText, item.value === value && styles.optionTextActive]} numberOfLines={2}>
                    {item.label}
                  </Text>
                  {item.value === value && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueText: { fontSize: 15, color: '#000', flex: 1, marginRight: 8 },
  placeholderText: { fontSize: 15, color: '#999', flex: 1, marginRight: 8 },
  chevron: { color: '#999', fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 32, maxHeight: '70%' },
  sheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#1B2A6B' },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  optionText: { fontSize: 15, color: '#333', flex: 1, marginRight: 8 },
  optionTextActive: { color: '#C1272D', fontWeight: '700' },
  check: { color: '#C1272D', fontWeight: '700' },
});
