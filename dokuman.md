# **Proje - 2**

Proje, kullanıcılar arasındaki ilişkileri bir graf yapısı olarak modelleyen ve çeşitli graf algoritmalarını uygulayarak sosyal ağ üzerindeki bağlantıları analiz eden bir **Sosyal Ağ Analizi Uygulaması** geliştirilmesini amaçlamaktadır.

Öğrenciler; kullanıcılar ve bağlantılardan oluşan ağı dinamik olarak yönetebilecek, en kısa yolları, toplulukları ve etkili kullanıcıları görselleştirebilecek, grafı farklı renklerle renklendirebilecek bir sistem tasarlayacaklardır.

Proje, **nesne yönelimli programlama**, **veri yapıları**, **algoritma analizi**, **görselleştirme** ve **yazılım tasarımı** becerilerini bütünleştirici biçimde ölçmeyi hedeflemektedir.

---

## 1. Proje Konusu

Öğrenciler bir **Sosyal Ağ Analizi Uygulaması** geliştireceklerdir.
Bu uygulama:

* Kullanıcıları ve bağlantıları bir graf veri yapısı ile modelleyecek,
* Çeşitli algoritmalar çalıştıracak,
* Sonuçları görselleştirme ile sunacaktır.

Amaç, öğrencilerin graf yapıları, algoritmalar, nesne yönelimli tasarım, görselleştirme ve yazılım geliştirme süreci konularını uygulamalı olarak öğrenmeleridir.

---

## 2. Genel Gereksinimler

1. Proje **2 kişilik gruplar** halinde yapılacaktır.
2. Proje kodları, çalışan uygulama ve GitHub üzerinde Markdown + Mermaid ile yazılmış proje raporu **tek bir sıkıştırılmış dosya** olarak teslim edilecektir.

   * Rapor içinde **sınıf diyagramları**, **iş akışları**, **algoritma akış diagramları**, **veri tabanı E-R diyagramı** (varsa) açık şekilde gösterilmelidir.
3. GitHub üzerinde her ekip üyesi **eşit ve düzenli commit** yapmak zorundadır. Aksi hâlde proje **0 (sıfır)** olarak değerlendirilir.
4. Rapor; sistem tasarımını, kullanılan algoritmaları, testleri ve ekran görüntülerini içermelidir.

---

## 3. İşlevsel İsterler

### 3.1. İşlevler ve Görsel Modelleme

* Düğümler ve bağlantılar görsel üzerinde gösterilmelidir.
* Kullanıcı (node) ekleme, silme, güncelleme yapılabilmelidir.
* Bağlantı (edge) ekleme, silme yapılabilmelidir.
* Bağlantılar yönsüz ve **ağırlıklı** (etkileşim sayısı, mesafe vb.) olmalıdır.
* Kullanıcı bir düğüme tıklayınca düğüme ait bilgiler gösterilmelidir.
* Algoritmalar tek tek çalıştırılabilmeli, sonuçlar görsel + tablo şeklinde gösterilmelidir.
* Veri içe/dışa aktarımı (JSON / CSV) sağlanmalıdır.

  * Çıktıda her düğümün komşuluk listesi/matrisi oluşturulmalıdır.

---

### 3.2. Algoritmalar

Uygulamada aşağıdaki algoritmalar bulunmalıdır. Her algoritma ayrı ayrı tetiklenmelidir:

* **BFS** ve **DFS** — Bir düğümden erişilebilen tüm kullanıcıları bulma
* **Dijkstra** ve **A*** — İki düğüm arasındaki en kısa yolu bulma
* Bağlı bileşenlerin ve ayrık toplulukların tespit edilmesi
* **Merkezilik (Degree Centrality)**

  * En etkili kullanıcıların belirlenmesi
  * En yüksek dereceye sahip 5 düğümün tablo halinde gösterilmesi
* **Welsh–Powell graf renklendirme algoritması**

  * Her ayrık toplulukta komşu düğümlerin farklı renklerde boyanması
  * Boyama tablolarının oluşturulması

---

## 4. Teknik İsterler

### 4.1. Nesne Yönelimli Tasarım (OOP)

* OOP kullanımı zorunludur. Uymayan kodlar **0 (sıfır)** alır.
* Ayrı sınıflar bulunmalıdır:

  * `Node`
  * `Edge`
  * `Graph`
  * `Algorithm`
  * `Coloring`
* Arayüzler ve soyutlamalar kullanılmalıdır.

---
### 4.2. Veri Saklama / Yükleme

* JSON veya CSV kullanılabilir.
* Kullanıcılar ve bağlantılar **kalıcı** olarak saklanmalıdır.
* Veriler tekrar yüklenerek önceki durum geri getirilebilmelidir.

---

### 4.3. Dinamik Ağırlık Hesaplama

Her düğüm, sayısal özellikleriyle bir **CSV tablosunda** tutulmalıdır:

| DugumId | Aktiflik | Etkileşim | Bağlantı Sayısı | Komşular |
| ------- | -------- | --------- | --------------- | -------- |
| 1       | 0.8      | 12        | 3               | 2,4,5    |
| 2       | 0.4      | 5         | 2               | 1,3      |

Örnek CSV başlığı:

```text
DugumId,Ozellik_I (Aktiflik),Ozellik_II (Etkilesim),Ozellik_III (Bagl. Sayisi),Komsular
```

### **Ağırlık Formülü**

```

Agirlik_{i,j} = \frac{1}{1 + \sqrt{(Aktiflik_i - Aktiflik_j)^2 
+ (Etkilesim_i - Etkilesim_j)^2 
+ (Baglanti_i - Baglanti_j)^2}}


```

* Benzer özelliklere sahip düğümlerde ağırlık yüksek olur.
* Farklı özelliklerde uzaklık artar, ağırlık düşer.
* Hesaplanan ağırlık tüm algoritmalarda **kenar maliyeti** olarak kullanılacaktır.
* Komsular sutunu otomatik kenar olusturmak icin kullanilir.

---

### 4.4. Kullanıcı Arayüzü

* Programlama dili serbesttir ancak **görsel programlama desteklenmelidir**.
* Grafik bir **canvas** üzerinde gösterilmelidir.
* Arayüz:

  * Basit
  * Anlaşılır
  * Etkileşimli olmalıdır.
* Detay bilgiler, algoritma süreleri, performans metrikleri düzgün gruplandırılmalıdır.

---

### 4.5. Performans

* Küçük (10–20 düğüm) ve orta ölçekli (50–100 düğüm) graflar ile algoritmalar test edilmelidir.
* Her algoritma için:

  * Sonuç görselleri
  * Çalışma süreleri
  * Tablolar
    raporda gösterilmelidir.
* Algoritmalar birkaç saniyede çalışmalıdır.
* Hatalı veri (aynı düğümün eklenmesi, self-loop vb.) engellenmelidir.

---

## 5. Rapor İsterleri

Rapor, GitHub `README.md` dosyasında Markdown ile hazırlanacaktır.

Aşağıdaki bölümleri içermelidir:

1. Proje adı, ekip üyeleri, tarih
2. Problemin tanımı, amaç (giriş bölümü)
3. Uygulanan algoritmaları anlatan bölüm

   * Çalışma mantığı
   * Mermaid akış diyagramı
   * Karmaşıklık analizi
   * Literatür incelemesi
4. Sınıf yapısı ve modüller (Mermaid diyagramları ile)
5. Uygulama açıklamaları, ekran görüntüleri, test senaryoları ve sonuçlar
6. Başarılar, sınırlılıklar ve olası geliştirmeler (Sonuç & Tartışma bölümü)

---

# ## 6. Değerlendirme Kriterleri (100 Puan)

* Graf Modeli İşlemleri
* Algoritmalar (BFS, DFS, Dijkstra, A*)
* Welsh–Powell Renklendirme
* Görselleştirme
* OOP Tasarım & Mimari
* Veri Saklama (JSON/CSV)
* Test & Hata Yönetimi
* Rapor

---

### **Notlar**

* Kopya/intihal → **0 puan**
* GitHub’a düzenli commit yapmayan → **0 puan**
* OOP prensiplerine uymayan → **0 puan**


---

## Ek: Projede Uygulanan OOP Sinif Yapisi
- Domain siniflari: Node, Edge, Graph (dugum/kenar modeli ve komsuluk listesi).
- Algoritma soyutlamalari: Algorithm (ABC) ve Coloring (ABC); cikis tipleri AlgorithmResult ve ColoringResult.
- Somut algoritmalar: BFSAlgorithm, DFSAlgorithm, WelshPowellColoring.
- Algoritmalar servis katmaninda cagrilir ve API uzerinden tetiklenir.
