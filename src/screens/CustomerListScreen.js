import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { watchCustomersPage, fetchAllCustomersForExport, SORT_MODES, getCustomerStatus } from '../services/customerService';
import { exportCustomersToExcel } from '../services/excelExportService';
import CustomerListItem from '../components/CustomerListItem';
import SortFilterModal from '../components/SortFilterModal';

export default function CustomerListScreen({ navigation }) {
  const { isAdmin, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [docs, setDocs] = useState([]);
  const [pageStack, setPageStack] = useState([]); // önceki sayfaların ilk-doküman cursor'ları
  const [cursor, setCursor] = useState(null); // şu anki sayfanın başlangıç noktası
  const [sortMode, setSortMode] = useState(SORT_MODES.NAME_ASC);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);

  // Sıralama veya arama değişince sayfa geçmişini ve başlangıç noktasını sıfırla.
  useEffect(() => {
    setPageStack([]);
    setCursor(null);
  }, [sortMode, search]);

  // Bu sayfayı CANLI dinle — müşteri ekleme/silme/düzenleme, ekrandan
  // ayrılmadan anında listeye yansır.
  useEffect(() => {
    setLoading(true);
    const unsubscribe = watchCustomersPage(
      { sortMode, startAfterDoc: cursor, searchText: search },
      async ({ docs: pageDocs, customers: pageCustomers }) => {
        setDocs(pageDocs);
        setCustomers(pageCustomers);
        setHasNext(pageDocs.length === 20);

        // Her müşteri için durum (renkli nokta) hesapla
        try {
          const entries = await Promise.all(
            pageCustomers.map(async c => [c.id, await getCustomerStatus(c.id)]),
          );
          setStatusMap(Object.fromEntries(entries));
        } catch (e) {
          console.log('Durum hesaplama hatası:', e);
        }
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [sortMode, search, cursor]);

  const goNext = () => {
    if (!docs.length) return;
    setPageStack(prev => [...prev, docs[0]]);
    setCursor(docs[docs.length - 1]);
  };

  const goPrev = () => {
    if (!pageStack.length) return;
    const prevStack = [...pageStack];
    prevStack.pop();
    setPageStack(prevStack);
    setCursor(prevStack[prevStack.length - 1] || null);
  };

  const onExport = async () => {
    setExportingAll(true);
    try {
      const allCustomers = await fetchAllCustomersForExport();
      const result = await exportCustomersToExcel(allCustomers);
      if (result.savedToDownloads) {
        Alert.alert('Excel Hazır', `${allCustomers.length} müşteri "İndirilenler" klasörüne kaydedildi.`);
      }
    } catch (e) {
      Alert.alert('Excel Hatası', e.message);
    } finally {
      setExportingAll(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="Müşteri ara..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.iconBtn} onPress={() => setSortModalVisible(true)}>
          <Text style={styles.iconText}>⇅</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Overdue')}>
          <Text style={styles.actionBtnText}>⚠ Geciken Ödemeler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Calendar')}>
          <Text style={styles.actionBtnText}>📅 Takvim</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionsBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AllChecks')}>
          <Text style={styles.actionBtnText}>🧾 Çekler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onExport} disabled={exportingAll}>
          <Text style={styles.actionBtnText}>{exportingAll ? 'Hazırlanıyor...' : '⇩ Tüm Müşteriler (Excel)'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1B2A6B" />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CustomerListItem
              customer={item}
              statusInfo={statusMap[item.id]}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id, customerName: item.name })}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>Kayıtlı müşteri bulunamadı.</Text>}
        />
      )}

      <View style={[styles.pagerBar, { paddingBottom: 12 + insets.bottom }]}>
        <TouchableOpacity disabled={!pageStack.length} onPress={goPrev} style={[styles.pagerBtn, !pageStack.length && styles.pagerBtnDisabled]}>
          <Text style={styles.pagerText}>← Önceki</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => logout()} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={!hasNext} onPress={goNext} style={[styles.pagerBtn, !hasNext && styles.pagerBtnDisabled]}>
          <Text style={styles.pagerText}>Sonraki →</Text>
        </TouchableOpacity>
      </View>

      {isAdmin && (
        <TouchableOpacity style={[styles.fab, { bottom: 90 + insets.bottom }]} onPress={() => navigation.navigate('CustomerForm', {})}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <SortFilterModal
        visible={sortModalVisible}
        currentSort={sortMode}
        onSelect={setSortMode}
        onClose={() => setSortModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', padding: 12, gap: 8, alignItems: 'center' },
  search: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#000' },
  iconBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#1B2A6B', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  iconText: { color: '#fff', fontSize: 18 },
  actionsBar: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8, gap: 8 },
  actionBtn: { flex: 1, backgroundColor: '#f2f2f5', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginRight: 6 },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#333' },
  empty: { textAlign: 'center', marginTop: 40, color: '#888' },
  pagerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  pagerBtn: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#1B2A6B', borderRadius: 8 },
  pagerBtnDisabled: { backgroundColor: '#ccc' },
  pagerText: { color: '#fff', fontWeight: '600' },
  logoutBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  logoutText: { color: '#C1272D', fontWeight: '600' },
  fab: {
    position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#C1272D', alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 30, marginTop: -2 },
});
