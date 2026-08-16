# Baş Zincir - Müşteri

Müşteri / fatura / ödeme / çek takibi uygulaması. React Native (bare, Expo/EAS
**kullanılmaz**) + Firebase (Firestore, Auth, Storage, Cloud Messaging) ile
yazılmıştır. APK, **GitHub Actions** üzerinde, hiçbir üçüncü parti site veya
token gerekmeden derlenir.

---

## 1) Firebase projesi kurulumu (tek seferlik, Firebase Console üzerinden)

1. https://console.firebase.google.com → **Proje ekle** → örn. `bas-zincir-musteri`.
2. **Build → Authentication → Get started → Sign-in method → E-posta/Şifre**'yi etkinleştirin.
   - **Users** sekmesinden kendinize (admin) ve diğer görüntüleyicilere birer kullanıcı ekleyin.
3. **Build → Firestore Database → Create database** (production mode, bölge: `eur3` önerilir).
4. **Build → Storage → Get started** (fatura/çek fotoğrafları için).
5. **Project settings → General → Your apps → Android** ile bir Android
   uygulaması ekleyin:
   - Android package name: `com.baszincir.musteri`
   - `google-services.json` dosyasını indirin (bu dosyayı **repoya koymayın**,
     3. adımda GitHub Secret olarak ekleyeceksiniz).
6. **Project settings → Cloud Messaging** sekmesinin açık olduğunu doğrulayın (varsayılan olarak açıktır).

## 2) Kod içinde admin e-postasını ayarlayın

İki dosyada **aynı** admin e-postasını yazın (büyük/küçük harfe dikkat edin):

- `src/firebase/config.js` → `ADMIN_EMAIL`
- `firestore.rules` → `isAdmin()` fonksiyonundaki e-posta

Bu kişi dışında giriş yapan herkes salt-okunur olur.

Firestore kurallarını yayınlamak için (Firebase Console → Firestore →
Rules sekmesine yapıştırıp **Publish** de diyebilirsiniz, CLI şart değildir).

## 3) GitHub reposu ve Secrets

1. Bu klasörü yeni bir GitHub reposuna push edin.
2. Repo → **Settings → Secrets and variables → Actions → New repository secret**
   ile şunu ekleyin (zorunlu):

   | Secret adı | Değer |
   |---|---|
   | `GOOGLE_SERVICES_JSON_BASE64` | İndirdiğiniz `google-services.json` dosyasının base64 hali |

   Base64'e çevirmek için kendi bilgisayarınızda (Mac/Linux):
   `base64 -i google-services.json | tr -d '\n'`
   Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("google-services.json"))`

   Aşağıdakiler **opsiyoneldir** (verilmezse otomatik geçici bir imza
   anahtarı üretilir, APK yine de kurulabilir olur; Play Store'a yüklemeyi
   düşünüyorsanız kendi upload keystore'unuzu ekleyin):

   | Secret adı | Açıklama |
   |---|---|
   | `RELEASE_KEYSTORE_BASE64` | Kendi `.keystore` dosyanızın base64 hali |
   | `KEYSTORE_PASSWORD` / `KEY_ALIAS` / `KEY_PASSWORD` | Keystore bilgileriniz |

3. GitHub'da **Actions** sekmesine gidin → **Build APK** workflow'unu →
   **Run workflow** ile elle tetikleyin (veya `main` dalına her push'ta
   otomatik çalışır).
4. Build bitince workflow sonucundaki **Artifacts** bölümünden
   `bas-zincir-musteri-apk` dosyasını indirin, içinden `app-release.apk`
   çıkar. Bu dosyayı telefona kopyalayıp "Bilinmeyen kaynaklardan yükleme"yi
   açarak kurabilirsiniz.

## 4) Kapalı uygulamaya push bildirimi (opsiyonel ama önerilir)

Vade tarihinden 3 gün önce ve vade günü saat 08:30'da, **uygulama telefonda
tamamen kapalı olsa bile** bildirim gönderebilmek için `functions/`
klasöründeki zamanlanmış Cloud Function'ın Firebase'e deploy edilmesi
gerekir (bu, ek bir üçüncü parti servis değildir — zaten kullandığınız
Firebase'in bir parçasıdır).

1. Kendi bilgisayarınızda bir kere: `npx firebase-tools login:ci` çalıştırıp
   çıkan token'ı kopyalayın.
2. GitHub Secrets'a ekleyin: `FIREBASE_TOKEN` ve `FIREBASE_PROJECT_ID`
   (Firebase proje ID'niz, Console → Project settings'te görünür).
3. Firebase projenizin **Blaze (kullandıkça öde)** planında olması gerekir —
   bu, zamanlanmış (Cloud Scheduler) fonksiyonlar için Google'ın kendi
   şartıdır; günlük birkaç bildirim gönderimi pratikte ücretsiz kotanın
   içinde kalır.
4. `.github/workflows/deploy-functions.yml` otomatik olarak
   `functions/index.js`'i deploy eder (main'e push'ta veya elle).

Bu adımı atlarsanız uygulama yine sorunsuz çalışır; sadece kapalıyken push
bildirimi gelmez. Uygulama **açık/arka planda** çalışırken zaten yerel
(notifee) bildirimler devrededir.

## 5) Uygulamanın çalışma mantığı — özellik/kural özeti

- **Tek admin / çoklu görüntüleyici**: `ADMIN_EMAIL` ile giriş yapan
  ekleyebilir/düzenleyebilir/siler, diğerleri sadece görüntüler
  (`src/context/AuthContext.js`, `firestore.rules`).
- **Bakiye mantığı**: `customer.balance = toplam fatura - toplam ödeme`,
  her fatura/ödeme ekleme-düzenleme-silme işleminde Firestore transaction
  içinde otomatik güncellenir (`src/services/balanceService.js`).
- **Renkli durum noktası**: kırmızı (gecikmiş), sarı (3 gün içinde vade),
  yeşil (güncel) — `src/services/statusService.js`.
- **Sayfalama**: 20 müşteri/sayfa, "Önceki/Sonraki" ile gezinme
  (`src/services/customerService.js` → `fetchCustomersPage`).
- **Sıralama**: alfabetik / borç azalan / borç artan / alacaklılar
  (filtre ikonu → `SortFilterModal`).
- **Excel dışa aktarma**: ekrandaki arama+sıralama ile `.xlsx` üretir ve
  telefonun paylaşım menüsüyle kaydettirir (`excelExportService.js`).
- **Takvim & Geciken Ödemeler**: tüm müşteriler genelinde vade bazlı
  sorgular (`dueItemsService.js`).
- **Fotoğraf**: fatura/çek fotoğrafları Firebase Storage'a yüklenir
  (`photoService.js`).

## 6) Yerel geliştirme / test (opsiyonel)

GitHub Actions olmadan kendi bilgisayarınızda denemek isterseniz Android
Studio + Android SDK kurulu olmalı:

```
npm install --legacy-peer-deps
# google-services.json dosyasını android/app/ içine kendiniz koyun
npx react-native run-android
```

## Klasör yapısı

```
src/
  firebase/config.js       - ADMIN_EMAIL ve sabitler
  context/AuthContext.js   - giriş / rol (admin|viewer) yönetimi
  navigation/               - ekran geçişleri
  screens/                  - tüm ekranlar
  services/                 - Firestore CRUD + iş kuralları
  components/                - liste satırı, durum noktası, sıralama modalı
functions/index.js          - 08:30 zamanlanmış push bildirimi
android/                    - native Android projesi (Gradle)
.github/workflows/          - APK derleme + fonksiyon deploy workflow'ları
```
