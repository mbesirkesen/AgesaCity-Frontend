# AgeSA City Frontend

AgeSA City, finansal okuryazarlik odakli bir oyunlastirilmis React uygulamasidir.  
Kullanici; harcama, birikim, quiz ve simülasyon aksiyonlari ile `XP` ve `FP` (Finansal Puan) biriktirir, seviye atlar ve sehrini insa eder.

## Icerik

- [Teknoloji Stack](#teknoloji-stack)
- [Temel Ozellikler](#temel-ozellikler)
- [Proje Yapisi](#proje-yapisi)
- [Kurulum](#kurulum)
- [Ortam Degiskenleri](#ortam-degiskenleri)
- [Calistirma Komutlari](#calistirma-komutlari)
- [Oyun Mekanikleri](#oyun-mekanikleri)
- [Backend Entegrasyonu](#backend-entegrasyonu)
- [Mock Veri Modu](#mock-veri-modu)
- [Bilinen Notlar](#bilinen-notlar)

## Teknoloji Stack

- `React 19`
- `Vite`
- `Tailwind CSS v4`
- `framer-motion` (animasyonlar)
- `@dnd-kit/core` ve `@dnd-kit/utilities` (drag & drop)
- `lucide-react` (ikonlar)

## Temel Ozellikler

- Kullanici secimi / manuel login
- Sehir haritasi uzerinde surukle-birak bina yerlestirme
- Envanter + magazadan satin alma ve haritaya koyma
- Harcama ekleme ve birikim ekleme formlari
- 10 yillik finansal simülasyon ve birikim cekme senaryosu
- Felaket tetikleme, FP cezasi ve bina hasari/yikimi
- Bilgi Merkezi: modul bazli icerikler + quiz + odul
- Dashboard panelinde katman bazli sehir analizleri
- XP siralamasi (leaderboard paneli)
- Local cache + backend ile senkron calisma

## Proje Yapisi

```text
src/
  App.jsx                      # Ana layout ve ekran akisi
  main.jsx                     # React bootstrap + GameProvider
  index.css                    # Tema ve global stiller
  components/
    LoginScreen.jsx
    ShopPanel.jsx
    InventoryBar.jsx
    CityMap.jsx
    SimulationOverlay.jsx
    SpendingForm.jsx
    SavingsForm.jsx
    DashboardPanel.jsx
    KnowledgeCenter.jsx
  context/
    GameContext.js             # Oyun state ve tum aksiyonlarin merkezi
  services/
    gameDataService.js         # API katmani
  config/
    shopItems.js               # Seviye esikleri ve market item'lari
    rpgAssetMap.js             # Harita tile/esya asset secimleri
  mocks/
    mockGameData.js            # Backend yoksa kullanilan demo veri
public/
  assets/rpg-urban-pack/       # Oyun sprite/asset dosyalari
```

## Kurulum

```bash
npm install
```

## Ortam Degiskenleri

Proje su degiskenleri kullanir:

- `VITE_API_BASE_URL` (varsayilan: `http://127.0.0.1:8003`)
- `VITE_USE_MOCK_DATA` (`true` ise mock veri zorlanir)

Ornek `.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8003
VITE_USE_MOCK_DATA=false
```

## Calistirma Komutlari

```bash
# Development
npm run dev

# Production build
npm run build

# Build preview
npm run preview
```

## Oyun Mekanikleri

### XP / FP

- `GameContext` icinde merkezi olarak yonetilir.
- Degerler localde optimize sekilde guncellenir, sonra backend sync edilir.
- Asiri artisi engellemek icin sanitize/clamp uygulanir:
  - `MAX_XP_VALUE = 50000`
  - `MAX_FP_VALUE = 10000`

### Seviye Sistemi

- Esikler: `shopItems.js` icindeki `LEVEL_THRESHOLDS`
- Seviye arttikca yeni item turleri acilir (ev, dukkan, banka, AVM, kutuphane, gokdelen vb.)

### Harita ve Yerlesim

- Grid boyutu: `24 x 12`
- Yol hucrelerine yerlestirme yapilamaz.
- Reusable item'larda stack mekanigi vardir (`MAX_STACK = 4`).

### Felaket Akisi

- Simülasyondan birikim cekilince siddete gore felaket tetiklenebilir.
- Backend ceza/hasar donmezse frontend fallback devreye girer:
  - FP cezasi lokal uygulanir
  - Bina hasari/yikimi lokal uygulanir

### Bilgi Merkezi

- Moduler egitim icerikleri (metin/video)
- Quiz cevaplama
- Dogru cevapta XP/FP odulu

## Backend Entegrasyonu

API cagrilari `src/services/gameDataService.js` icinde toplanmistir.

Kullanilan ana endpoint gruplari:

- Baslangic verileri: `/api/users`, `/api/spendings`, `/api/bes-scenarios`, `/api/learning-contents`, `/api/quizzes`, `/api/quiz-options`
- Login: `/api/login`
- Dashboard/Sehir: `/api/dashboard/:userId`, `/api/city-status/:userId`
- XP/FP: `/api/xp/earn`, `/api/financial-points/earn`, `/api/financial-points/spend`
- Envanter/Sehir aksiyonlari: `/api/inventory/buy`, `/api/city/place`, `/api/city/remove`, `/api/city/buy-and-place`
- Oyun aksiyonlari: `/api/quiz/submit`, `/api/simulation/run`, `/api/disaster/trigger`
- Harcama kaydi: `/api/spendings`

## Mock Veri Modu

- `VITE_USE_MOCK_DATA=true` oldugunda `src/mocks/mockGameData.js` kullanilir.
- Backend baglantisi hata verirse sistem otomatik mock veriye fallback yapar.

## Bilinen Notlar

- Leaderboard su an aktif kullanicinin XP'sini local cache (`localStorage`) ile saklayarak listeler. Tum kullanicilar icin backend tarafinda dogrudan bir leaderboard endpoint'i varsa entegrasyon yapilmasi tavsiye edilir.
- Bu repo'da otomatik test (unit/e2e) script'i henuz tanimli degil.
- Eger backend gecici olarak `0` XP/FP donerse, mevcut ilerlemeyi korumak icin context tarafinda overwrite korumalari bulunur.

---

Projeyi gelistirirken once `GameContext` ve `App` akislarini okumak, sonra `services/gameDataService` ve component katmanina inmek en hizli yaklasimdir.
