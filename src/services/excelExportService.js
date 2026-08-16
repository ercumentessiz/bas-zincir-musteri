import { utils, write } from 'xlsx';
import RNFS from 'react-native-fs';
import { Share, Platform } from 'react-native';
import { formatDateTR } from '../utils/dateUtils';

// Dosyayı doğrudan telefonun "İndirilenler" klasörüne kaydeder (Android).
// Başarısız olursa (bazı cihaz/izin senaryoları) uygulamanın önbelleğine
// yazıp paylaşım penceresiyle geri döner.
async function saveXlsxToDevice(wbout, fileName) {
  if (Platform.OS === 'android' && RNFS.DownloadDirectoryPath) {
    try {
      const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
      await RNFS.writeFile(downloadPath, wbout, 'base64');
      return { path: downloadPath, savedToDownloads: true };
    } catch (e) {
      console.log('İndirilenler klasörüne yazma başarısız, yedek yönteme geçiliyor:', e);
    }
  }

  const fallbackPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
  await RNFS.writeFile(fallbackPath, wbout, 'base64');
  const shareUrl = Platform.OS === 'android' ? `file://${fallbackPath}` : fallbackPath;
  await Share.share(
    { url: shareUrl, title: fileName },
    { dialogTitle: 'Excel dosyasını paylaş / kaydet' },
  );
  return { path: fallbackPath, savedToDownloads: false };
}

// TÜM müşterileri (sayfalama/arama sınırı olmadan) tek Excel dosyasına aktarır.
// Her satırda: Müşteri Adı, İl, Bakiye.
export async function exportCustomersToExcel(customers, fileLabel = 'musteriler') {
  const rows = customers.map(c => ({
    'Müşteri Adı': c.name,
    'İl': c.city || '',
    'Bakiye (TL)': Number(c.balance || 0),
  }));

  const worksheet = utils.json_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }];
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Müşteriler');

  const wbout = write(workbook, { type: 'base64', bookType: 'xlsx' });
  const fileName = `${fileLabel}_${Date.now()}.xlsx`;
  return saveXlsxToDevice(wbout, fileName);
}

// Tek bir müşterinin cari hesap dökümü: faturalar (borç) + ödemeler (alacak)
// tarih sırasına göre, kalan bakiye ile birlikte.
export async function exportCustomerLedgerToExcel(customer, invoices, payments) {
  const movements = [
    ...invoices.map(inv => ({
      date: inv.dueDate,
      type: 'Fatura',
      desc: inv.invoiceNo ? `Fatura No: ${inv.invoiceNo}${inv.note ? ' · ' + inv.note : ''}` : (inv.note || ''),
      debit: Number(inv.amount),
      credit: 0,
      _sortKey: inv.createdAt?.toMillis ? inv.createdAt.toMillis() : 0,
    })),
    ...payments.map(p => ({
      date: p.date,
      type: 'Ödeme',
      desc: `${p.method || ''}${p.note ? ' · ' + p.note : ''}`,
      debit: 0,
      credit: Number(p.amount),
      _sortKey: p.createdAt?.toMillis ? p.createdAt.toMillis() : 0,
    })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a._sortKey - b._sortKey));

  let running = 0;
  const rows = movements.map(m => {
    running += m.debit - m.credit;
    return {
      'Tarih': formatDateTR(m.date),
      'Tür': m.type,
      'Açıklama': m.desc,
      'Borç (TL)': m.debit || '',
      'Alacak (TL)': m.credit || '',
      'Bakiye (TL)': running,
    };
  });

  const worksheet = utils.json_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 34 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Cari Hesap');

  const wbout = write(workbook, { type: 'base64', bookType: 'xlsx' });
  const safeName = (customer.name || 'musteri').replace(/[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ ]/g, '').trim().replace(/\s+/g, '_');
  const fileName = `${safeName}_cari_hesap_${Date.now()}.xlsx`;
  return saveXlsxToDevice(wbout, fileName);
}
