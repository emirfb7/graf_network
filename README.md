# Graf Network - Sosyal Ağ Analizi

Graf teorisi kullanarak sosyal ağ analizi yapabileceğiniz modern bir web uygulaması. CSV dosyalarından veri yükleyerek graf oluşturabilir, çeşitli algoritmalar çalıştırabilir ve görselleştirme yapabilirsiniz.

## 🚀 Özellikler

### Graf Yönetimi
- **Düğüm ve Kenar Ekleme**: İnteraktif arayüz ile graf oluşturma
- **CSV Dosya Yükleme**: Edge list ve node list formatlarını destekler
- **Dosya Birleştirme**: İki CSV dosyasını birleştirerek daha büyük graf oluşturma
- **Dosya Silme**: Basılı tutarak dosyaları silme özelliği

### Algoritmalar
- **BFS (Breadth-First Search)**: Genişlik öncelikli arama
- **DFS (Depth-First Search)**: Derinlik öncelikli arama
- **Dijkstra**: En kısa yol algoritması
- **A\***: Heuristic arama algoritması
- **Degree Centrality**: Merkezilik analizi
- **Welsh-Powell**: Graf renklendirme algoritması

### Görselleştirme
- **Vis.js Network**: İnteraktif graf görselleştirme
- **Algoritma Simülasyonu**: Adım adım algoritma çalıştırma
- **Renkli Vurgulama**: Ziyaret edilen düğümler ve kenarlar için renk kodlaması
- **Düğüm Seçimi**: Düğüm bilgilerini görüntüleme

### Kullanıcı Arayüzü
- **Açık/Koyu Tema**: Tema değiştirme özelliği
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu
- **Türkçe Arayüz**: Tam Türkçe kullanıcı arayüzü

## 📋 Gereksinimler

### Backend
- Python 3.8+
- pip

### Frontend
- Modern web tarayıcı (Chrome, Firefox, Edge, Safari)
- Python 3.x (HTTP server için)

## 🛠️ Kurulum

### 1. Repository'yi Klonlayın

```bash
git clone <repository-url>
cd graf_network
```

### 2. Backend Kurulumu

```bash
cd backend
pip install -r requirements.txt
```

### 3. Projeyi Çalıştırma

#### Backend (Terminal 1)

```bash
# Proje root dizininden
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend API: `http://localhost:8000`

#### Frontend (Terminal 2)

```bash
cd frontend
python -m http.server 3000
```

Frontend: `http://localhost:3000/public/index.html`

## 📁 Proje Yapısı

```
graf_network/
├── backend/
│   ├── app/
│   │   ├── algorithms/      # Graf algoritmaları
│   │   │   ├── bfs.py
│   │   │   ├── dfs.py
│   │   │   ├── dijkstra.py
│   │   │   ├── astar.py
│   │   │   └── ...
│   │   ├── api/
│   │   │   └── v1/          # API endpoint'leri
│   │   ├── domain/          # Domain modelleri
│   │   ├── services/        # İş mantığı
│   │   ├── schemas/         # Pydantic şemaları
│   │   └── main.py          # FastAPI uygulaması
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   ├── index.html       # Ana HTML dosyası
│   │   └── styles.css       # Stil dosyası
│   └── src/
│       ├── main.js           # Ana JavaScript dosyası
│       ├── api/              # API client
│       ├── graph/            # Graf görselleştirme
│       └── ui/               # UI bileşenleri
└── README.md
```

## 📊 CSV Dosya Formatları

### Edge List Formatı

```csv
source_id,source_name,target_id,target_name,relation_type,relation_degree
1,Alice,2,Bob,friend,5
2,Bob,3,Charlie,colleague,3
```

### Node List Formatı

```csv
DugumId,Ozellik_I,Ozellik_II,Ozellik_III,Komsular
1,0.5,38,10,"2,3,4"
2,0.6,40,8,"1,3"
```

## 🎮 Kullanım

### Graf Oluşturma

1. **Manuel Ekleme**:
   - "Düğüm ekle" formunu kullanarak düğüm ekleyin
   - "Kenar ekle" formunu kullanarak düğümler arası bağlantılar oluşturun

2. **CSV Yükleme**:
   - "Dosya yükle" bölümünden CSV dosyası seçin
   - Dosya otomatik olarak parse edilir ve graf oluşturulur

### Algoritma Çalıştırma

1. Algoritma seçin (BFS veya DFS)
2. Başlangıç düğümünü girin
3. "Çalıştır" butonuna tıklayın
4. Sonuçları görüntüleyin ve simülasyonu izleyin

### Dosya Yönetimi

- **Dosya Yükleme**: CSV/Excel dosyalarını yükleyin
- **Dosya Seçme**: Merge için iki dosya seçin
- **Dosya Silme**: Dosyanın üzerine basılı tutun (500ms), kırmızıya döndüğünde tekrar tıklayın

## 🔧 API Endpoints

### Health Check
```
GET /health
```

### Algoritmalar
```
POST /api/v1/algorithms/bfs
POST /api/v1/algorithms/dfs
```

**Request Body:**
```json
{
  "start_id": "1",
  "graph": {
    "nodes": [
      {"id": "1", "label": "Node 1"},
      {"id": "2", "label": "Node 2"}
    ],
    "edges": [
      {"from": "1", "to": "2"}
    ]
  }
}
```

## 🎨 Tema Değiştirme

Sağ üst köşedeki tema butonuna tıklayarak açık/koyu tema arasında geçiş yapabilirsiniz. Tema tercihiniz otomatik olarak kaydedilir.

## 🧪 Test

```bash
cd backend
python -m pytest tests/
```

## 📝 Geliştirme

### Backend Geliştirme

Backend `--reload` modunda çalıştığında kod değişiklikleri otomatik olarak yüklenir.

### Frontend Geliştirme

Frontend dosyalarını düzenledikten sonra sayfayı yenileyin. Hot reload için bir dev server kullanabilirsiniz.

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add some amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje açık kaynaklıdır.

## 👥 Yazar

Graf Network Development Team

## 🙏 Teşekkürler

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [Vis.js](https://visjs.org/) - Graf görselleştirme kütüphanesi
- [Inter Font](https://rsms.me/inter/) - Modern tipografi

---

**Not**: Bu proje eğitim ve araştırma amaçlıdır. Üretim ortamında kullanmadan önce güvenlik ve performans testlerini yapın.
