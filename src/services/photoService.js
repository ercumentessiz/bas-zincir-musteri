import storage from '@react-native-firebase/storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

// docType: 'invoices' | 'checks' — sadece klasörleme amaçlı
export async function pickAndUploadPhoto(docType, fromCamera = false) {
  const picker = fromCamera ? launchCamera : launchImageLibrary;
  const result = await picker({ mediaType: 'photo', quality: 0.7, maxWidth: 1600, maxHeight: 1600, saveToPhotos: false });

  if (result.errorCode) {
    if (result.errorCode === 'permission') {
      throw new Error('Kamera/galeri izni verilmedi. Telefon Ayarları > Uygulamalar > Baş Zincir - Müşteri > İzinler bölümünden izin verin.');
    }
    if (result.errorCode === 'camera_unavailable') {
      throw new Error('Kamera kullanılamıyor.');
    }
    throw new Error(result.errorMessage || 'Fotoğraf seçilirken bir hata oluştu.');
  }

  if (result.didCancel || !result.assets?.length) return null;

  const asset = result.assets[0];
  const fileName = `${docType}/${Date.now()}_${asset.fileName || 'photo.jpg'}`;
  const ref = storage().ref(fileName);
  await ref.putFile(asset.uri);
  return ref.getDownloadURL();
}
