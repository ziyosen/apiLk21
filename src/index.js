import { Hono } from 'hono'
import { load } from 'cheerio'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('/*', cors())

const TARGET = 'https://pafipasarmuarabungo.org'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function scrapeList(url) {
  try {
    const res = await fetch(url, { 
      headers: { 
        'User-Agent': UA, 
        'Referer': TARGET,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      } 
    })
    const html = await res.text()
    const $ = load(html)
    const data = []

    // Selector lebih agresif: nangkep semua kemungkinan pembungkus film
    $('.ml-item, article, .item, .post-item, .v-item').each((i, el) => {
      const title = $(el).find('h2, h3, .entry-title, .mli-info h2, a.title').first().text().trim()
      const link = $(el).find('a').attr('href')
      let img = $(el).find('img').attr('data-original') || 
                $(el).find('img').attr('data-src') || 
                $(el).find('img').attr('src') ||
                $(el).find('img').attr('data-lazy-src')
      
      if (title && link && link.includes(TARGET)) {
        if (img && img.startsWith('//')) img = 'https:' + img
        data.push({ 
          title: title.replace(/Nonton|Movie|Subtitle|Indonesia/gi, '').trim(), 
          link, 
          img: img || '' 
        })
      }
    })
    return data
  } catch { return [] }
}

async function scrapeInfinite(baseUrl, limitPage = 5) {
  const tasks = []
  for (let i = 1; i <= limitPage; i++) {
    const url = i === 1 ? baseUrl : `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}page/${i}/`
    tasks.push(scrapeList(url))
  }
  const results = await Promise.all(tasks)
  const combined = results.flat()
  // Filter duplikat & pastiin link beneran ke film
  return combined.filter((v, i, a) => a.findIndex(t => (t.link === v.link)) === i && !v.link.includes('/genre/'));
}

// --- ENDPOINTS ---
app.get('/', async (c) => c.json({ status: true, data: await scrapeInfinite(TARGET, 3) }))

// GENRE (Fix: Tambahin trailing slash biar gak kena redirect)
const genres = ['action', 'adventure', 'animation', 'comedy', 'crime', 'drama', 'fantasy', 'family', 'horror', 'mystery', 'romance', 'sci-fi', 'thriller', 'war', 'western']
genres.forEach(g => {
  app.get(`/genre/${g}`, async (c) => c.json({ status: true, data: await scrapeInfinite(`${TARGET}/genre/${g}/`, 5) }))
})

// AREA 18+
app.get('/semi-jepang', async (c) => c.json({ status: true, data: await scrapeInfinite(`${TARGET}/genre/semi-jepang/`, 5) }))
app.get('/semi-korea', async (c) => c.json({ status: true, data: await scrapeInfinite(`${TARGET}/genre/semi-korea/`, 5) }))
app.get('/semi-philippines', async (c) => c.json({ status: true, data: await scrapeInfinite(`${TARGET}/genre/semi-philippines/`, 5) }))

// TV MOVIE
app.get('/tv-movie', async (c) => c.json({ status: true, data: await scrapeInfinite(`${TARGET}/genre/tv-movie/`, 5) }))

app.get('/search', async (c) => {
  const q = c.req.query('q')
  return c.json({ status: true, data: await scrapeList(`${TARGET}/?s=${q}`) })
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
      if (src && !src.includes('ads') && !src.includes('facebook')) {
        if (src.startsWith('//')) src = 'https:' + src
        streams.push(src)
      }
    })
    return c.json({ status: true, streams })
  } catch { return c.json({ status: false, streams: [] }) }
})

export default app
