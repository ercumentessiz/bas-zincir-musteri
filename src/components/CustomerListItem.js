import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import StatusDot from './StatusDot';
import { formatCurrencyTR } from '../utils/dateUtils';

export default function CustomerListItem({ customer, statusInfo, onPress }) {
  const balance = Number(customer.balance || 0);
  const balanceColor = balance > 0 ? '#C1272D' : balance < 0 ? '#2E7D32' : '#555';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <StatusDot status={statusInfo?.status} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{customer.name}</Text>
        {statusInfo?.daysPastDue > 0 && (
          <Text style={styles.overdueText}>{statusInfo.daysPastDue} Gün Geçti</Text>
        )}
      </View>
      <Text style={[styles.balance, { color: balanceColor }]}>{formatCurrencyTR(balance)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  name: { fontSize: 16, fontWeight: '600', color: '#222' },
  overdueText: { fontSize: 12, color: '#C1272D', fontWeight: '700', marginTop: 2 },
  balance: { fontSize: 15, fontWeight: '700' },
});
