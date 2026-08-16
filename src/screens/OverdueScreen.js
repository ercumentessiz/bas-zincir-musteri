import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { fetchOverdueItems } from '../services/dueItemsService';
import { formatCurrencyTR, daysPastDue } from '../utils/dateUtils';

export default function OverdueScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { invoices, checks } = await fetchOverdueItems();
    const combined = [
      ...invoices.map(i => ({ ...i, _kind: 'Fatura', _amount: i.remainingAmount })),
      ...checks.map(c => ({ ...c, _kind: 'Çek', _amount: c.amount })),
    ].sort((a, b) => daysPastDue(b.dueDate) - daysPastDue(a.dueDate));
    setItems(combined);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1B2A6B" />;

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>{items.length} gecikmiş kayıt</Text>
      <FlatList
        data={items}
        keyExtractor={item => item._kind + item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('CustomerDetail', { customerId: item.customerId, customerName: item.customerName })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.customerName || 'Müşteri'}</Text>
              <Text style={styles.sub}>{item._kind} · {formatCurrencyTR(item._amount)}</Text>
            </View>
            <Text style={styles.daysBadge}>{daysPastDue(item.dueDate)} Gün Geçti</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Gecikmiş ödeme bulunmuyor 🎉</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerText: { padding: 14, fontWeight: '700', color: '#1B2A6B' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  name: { fontSize: 15, fontWeight: '600', color: '#222' },
  sub: { fontSize: 12, color: '#777', marginTop: 2 },
  daysBadge: { backgroundColor: '#C1272D', color: '#fff', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
});
