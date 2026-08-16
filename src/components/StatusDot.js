import React from 'react';
import { View, StyleSheet } from 'react-native';
import { STATUS } from '../services/statusService';

const COLORS = { [STATUS.RED]: '#D32F2F', [STATUS.YELLOW]: '#F9A825', [STATUS.GREEN]: '#2E7D32' };

export default function StatusDot({ status, size = 12 }) {
  return (
    <View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS[status] || COLORS.GREEN },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: { marginRight: 10 },
});
