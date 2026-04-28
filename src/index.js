import { Hono } from 'hono'
import { load } from 'cheerio'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('/*', cors())

const TARGET = 'https://tv10.lk21official.cc'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function scrapePage(url) {
  try {
    const res = await fetch(url, { 
      headers: { 
        'User-Agent': UA,
        'Referer': TARGET
      } 
    })
    if (!res.ok) return []
    const html = await res.text()
    const $ = load(html)
    const data = []

    // UPDATE SELECTOR: LK21 biasanya pake article di dalam grid-wrapper atau id konten
    $('article, .grid-main .box, .mega-item').each((i, el) => {
      const title = $(el).find('h2, h3, a').first().text().trim()
      const link = $(el).find('a').first().attr('href')
      // LK21 sering pake lazy load, kita ambil semua kemungkinan atribut gambar
      let img = $(el).find('img').attr('src') || 
                $(el).find('img').attr('data-src') || 
                $(el).find('img').attr('data-original')
      
      if (title && link && !link.includes('/category/') && !link.includes('/genre/')) {
        if (img && img.startsWith('//')) img = 'https:' + img
        data.push({ 
          title: title.replace('Nonton Movie', '').replace('Subtitle Indonesia', '').trim(), 
          link, 
          img: img || '' 
        })
      }
    })
    return data
  } catch { return [] }
}

async function scrapeFivePages(baseUrl) {
  const pages = [1, 2, 3, 4, 5]
  const tasks = pages.map(p => {
    // Perbaikan jalur page: lk21 biasanya pake /v/page/2 atau ?page=2
    // Kita coba pake format standar /page/x/ dulu
    const url = p === 1 ? baseUrl : `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}page/${p}/`
    return scrapePage(url)
  })
  
  const results = await Promise.all(tasks)
  return results.flat()
}

// --- ENDPOINTS ---

app.get('/', async (c) => c.json({ status: true, data: await scrapePage(TARGET) }))

app.get('/top-movie-today', async (c) => c.json({ status: true, data: await scrapePage(`${TARGET}/top-movie-today/`) }))

// GENRE
const genres = ['animation', 'action', 'adventure', 'comedy', 'crime', 'fantasy', 'family', 'horror', 'romance', 'thriller']
genres.forEach(g => {
  app.get(`/genre/${g}`, async (c) => c.json({ status: true, data: await scrapeFivePages(`${TARGET}/genre/${g}/`) }))
})

// COUNTRY
const countries = ['usa', 'japan', 'south-korea', 'china', 'thailand']
countries.forEach(ct => {
  // Fix slug: south-korea di lk21 kadang 'korea' atau 'south-korea'
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
    
    // Player LK21 biasanya ada di dalam iframe atau script khusus
    $('iframe').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src')
      if (src && !src.includes('ads') && !src.includes('facebook')) {
        if (src.startsWith('//')) src = 'https:' + src
        streams.push(src)
      }
    })
    return c.json({ status: true, streams })
  } catch { return c.json({ status: false, streams: [] }) }
})

export default app
