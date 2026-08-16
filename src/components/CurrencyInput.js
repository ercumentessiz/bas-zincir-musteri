import React from 'react';
import { TextInput } from 'react-native';

// value: ham basamak dizisi (örn. "100000"), onChangeValue: yeni ham basamakları döner
export default function CurrencyInput({ value, onChangeValue, style, placeholder = '0 ₺' }) {
  const displayValue = value ? `${Number(value).toLocaleString('tr-TR')} ₺` : '';

  const handleChange = text => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    // Baştaki sıfırları temizle (00100 -> 100), ama tamamen sıfırsa boş kalsın
    const cleaned = digitsOnly.replace(/^0+(?=\d)/, '');
    onChangeValue(cleaned);
  };

  return (
    <TextInput
      style={style}
      value={displayValue}
      onChangeText={handleChange}
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor="#999"
    />
  );
}
