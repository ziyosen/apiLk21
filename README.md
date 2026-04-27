# apiLk21
# Hometeaparty Scraper API 🎬

API sederhana berbasis Cloudflare Workers untuk mengambil data film dari Hometeaparty secara real-time. Dibangun menggunakan [Hono](https://hono.dev/) dan [Cheerio](https://cheerio.js.org/).

## 🚀 Base URL
`https://URL_API_KAMU.workers.dev`

## 📌 List Endpoints

### 1. Home (Film Terbaru)
Mengambil daftar film terbaru yang ada di halaman depan.
- **Endpoint:** `/`
- **Contoh:** `https://URL_API_KAMU.workers.dev/`

### 2. Indonesia
Mengambil daftar film khusus kategori Indonesia.
- **Endpoint:** `/indonesia`
- **Contoh:** `https://URL_API_KAMU.workers.dev/indonesia`

### 3. Layarkaca21 (Tag)
Mengambil daftar film berdasarkan tag Layarkaca21.
- **Endpoint:** `/layarkaca21`
- **Contoh:** `https://URL_API_KAMU.workers.dev/layarkaca21`

### 4. Advanced Filter
Filter film berdasarkan negara, tahun, kualitas, atau genre.
- **Endpoint:** `/filter`
- **Params:** `country`, `year`, `quality`, `genre`
- **Contoh:** `https://URL_API_KAMU.workers.dev/filter?country=indonesia&year=2024`

### 5. Pencarian
Mencari film berdasarkan judul.
- **Endpoint:** `/search?q=JUDUL`
- **Contoh:** `https://URL_API_KAMU.workers.dev/search?q=avengers`

### 6. Detail Film & Link Stream
Mengambil link iframe/streaming dari sebuah postingan film.
- **Endpoint:** `/detail?url=URL_POSTINGAN`
- **Contoh:** `https://URL_API_KAMU.workers.dev/detail?url=https://hometeaparty.com/judul-film/`

## 🛠️ Teknologi
- **Hono** - Web framework kencang untuk Edge.
- **Cheerio** - Parsing HTML untuk scraping.
- **Cloudflare Workers** - Serverless deployment.

## 📝 Catatan
Gunakan API ini secara bijak. Jika web target melakukan perubahan struktur HTML, selector pada `index.js` mungkin perlu disesuaikan kembali.
