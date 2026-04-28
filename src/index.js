import { Hono } from 'hono'
import { load } from 'cheerio'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('/*', cors())

// Target tetep sama
const TARGET = 'https://tv10.lk21official.cc'
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'

async function scrapePage(url) {
  try {
    // TRIK: Kita pake proxy cors-anywhere atau sejenisnya jika Worker diblokir
    // Untuk sekarang kita coba tembak langsung dengan header super lengkap
    const res = await fetch(url, { 
      headers: { 
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.google.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site'
      } 
    })
    
    const html = await res.text()
    const $ = load(html)
    const data = []

    // Selector khusus struktur LK21 (Archive & Grid)
    // Kita cari elemen yang punya link nonton
    $('article, .grid-main .box, .v-item, .item-infinite').each((i, el) => {
      const title = $(el).find('h2, h3, a').first().text().trim()
      const link = $(el).find('a').first().attr('href')
      let img = $(el).find('img').attr('data-src') || 
                $(el).find('img').attr('data-original') || 
                $(el).find('img').attr('src')
      
      if (title && link && link.includes(TARGET)) {
        if (img && img.startsWith('//')) img = 'https:' + img
        data.push({ 
          title: title.replace(/Nonton|Movie|Subtitle|Indonesia/gi, '').trim(), 
          link, 
          img: img || '' 
        })
      }
    })
    
    // Kalau masih kosong, kita coba ambil via selector link langsung
    if (data.length === 0) {
        $('a[rel="bookmark"]').each((i, el) => {
            const title = $(el).attr('title') || $(el).text().trim();
            const link = $(el).attr('href');
            if (title && link) data.push({ title, link, img: "" });
        });
    }

    return data
  } catch (e) { 
    return [] 
  }
}

// Fungsi paging (kita buat 3 page dulu biar gak kena limit Cloudflare)
async function scrapeFivePages(baseUrl) {
  const pages = [1, 2, 3]
  const tasks = pages.map(p => {
    const url = p === 1 ? baseUrl : `${baseUrl}/page/${p}/`
    return scrapePage(url)
  })
  const results = await Promise.all(tasks)
  return results.flat().filter((v, i, a) => a.findIndex(t => (t.link === v.link)) === i)
}

app.get('/', async (c) => c.json({ status: true, data: await scrapePage(TARGET) }))

// TOP MOVIE
app.get('/top-movie-today', async (c) => c.json({ status: true, data: await scrapePage(`${TARGET}/top-movie-today/`) }))

// GENRE
const genres = ['animation', 'action', 'adventure', 'comedy', 'crime', 'fantasy', 'family', 'horror', 'romance', 'thriller']
genres.forEach(g => {
  app.get(`/genre/${g}`, async (c) => c.json({ status: true, data: await scrapeFivePages(`${TARGET}/genre/${g}/`) }))
})

// COUNTRY
const countries = ['usa', 'japan', 'south-korea', 'china', 'thailand']
countries.forEach(ct => {
  app.get(`/country/${ct}`, async (c) => c.json({ status: true, data: await scrapeFivePages(`${TARGET}/country/${ct}/`) }))
})

// YEAR
const years = ['2017', '2018', '2019', '2020']
years.forEach(y => {
  app.get(`/year/${y}`, async (c) => c.json({ status: true, data: await scrapeFivePages(`${TARGET}/year/${y}/`) }))
})

app.get('/search', async (c) => {
  const q = c.req.query('q')
  return c.json({ status: true, data: await scrapePage(`${TARGET}/?s=${q}`) })
})

app.get('/detail', async (c) => {
  try {
    const url = c.req.query('url')
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Referer': TARGET } })
    const html = await res.text()
    const $ = load(html)
    const streams = []
    $('iframe').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src')
      if (src && !src.includes('ads')) {
        if (src.startsWith('//')) src = 'https:' + src
        streams.push(src)
      }
    })
    return c.json({ status: true, streams })
  } catch { return c.json({ status: false, streams: [] }) }
})

export default app
