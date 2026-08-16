import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import CustomerListScreen from '../screens/CustomerListScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import CustomerFormScreen from '../screens/CustomerFormScreen';
import InvoiceFormScreen from '../screens/InvoiceFormScreen';
import PaymentFormScreen from '../screens/PaymentFormScreen';
import CheckFormScreen from '../screens/CheckFormScreen';
import CalendarScreen from '../screens/CalendarScreen';
import OverdueScreen from '../screens/OverdueScreen';
import AllChecksScreen from '../screens/AllChecksScreen';

const Stack = createNativeStackNavigator();

const headerStyle = {
  headerStyle: { backgroundColor: '#1B2A6B' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
};

export default function AppNavigator() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="CustomerList" component={CustomerListScreen} options={{ title: 'Baş Zincir - Müşteri' }} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Müşteri Detayı' }} />
      <Stack.Screen name="CustomerForm" component={CustomerFormScreen} options={{ title: 'Müşteri' }} />
      <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} options={{ title: 'Fatura' }} />
      <Stack.Screen name="PaymentForm" component={PaymentFormScreen} options={{ title: 'Ödeme' }} />
      <Stack.Screen name="CheckForm" component={CheckFormScreen} options={{ title: 'Çek' }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Takvim' }} />
      <Stack.Screen name="Overdue" component={OverdueScreen} options={{ title: 'Geciken Ödemeler' }} />
      <Stack.Screen name="AllChecks" component={AllChecksScreen} options={{ title: 'Çekler' }} />
    </Stack.Navigator>
  );
}
