import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { watchDueItemsForDate, fetchAllOpenDueDates } from '../services/dueItemsService';
import { todayStr, formatCurrencyTR, daysPastDue } from '../utils/dateUtils';

LocaleConfig.locales['tr'] = {
  monthNames: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  monthNamesShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  today: 'Bugün',
};
LocaleConfig.defaultLocale = 'tr';

export default function CalendarScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [invoices, setInvoices] = useState([]);
  const [checks, setChecks] = useState([]);
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    fetchAllOpenDueDates().then(dates => {
      const marks = {};
      dates.forEach(d => {
        marks[d] = { marked: true, dotColor: '#C1272D' };
      });
      setMarkedDates(marks);
    });
  }, []);

  useEffect(() => {
    const unsub = watchDueItemsForDate(selectedDate, (type, items) => {
      if (type === 'invoices') setInvoices(items);
      else setChecks(items);
    });
    return unsub;
  }, [selectedDate]);

  const combined = [
    ...invoices.map(i => ({ ...i, _kind: 'Fatura' })),
    ...checks.map(c => ({ ...c, _kind: 'Çek' })),
  ];

  return (
    <View style={styles.container}>
      <Calendar
        current={selectedDate}
        onDayPress={day => setSelectedDate(day.dateString)}
        markedDates={{
          ...markedDates,
          [selectedDate]: { ...(markedDates[selectedDate] || {}), selected: true, selectedColor: '#1B2A6B' },
        }}
        theme={{ selectedDayBackgroundColor: '#1B2A6B', todayTextColor: '#C1272D', arrowColor: '#1B2A6B' }}
      />

      <Text style={styles.sectionTitle}>Bugün Tahsil Edilecekler ({combined.length})</Text>

      <FlatList
        data={combined}
        keyExtractor={item => item._kind + item.id}
        renderItem={({ item }) => {
          const overdue = daysPastDue(item.dueDate);
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: item.customerId, customerName: item.customerName })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.customerName || 'Müşteri'} · {item._kind}</Text>
                <Text style={styles.rowSub}>{formatCurrencyTR(item.amount)}{overdue > 0 ? `  ·  ${overdue} gün geçti` : ''}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Bu tarihte tahsilat kaydı yok.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1B2A6B', margin: 14 },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#222' },
  rowSub: { fontSize: 12, color: '#777', marginTop: 2 },
  empty: { textAlign: 'center', color: '#999', marginTop: 20 },
});
