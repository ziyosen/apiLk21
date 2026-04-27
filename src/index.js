import { Hono } from 'hono'
import { load } from 'cheerio'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('/*', cors())

const TARGET = 'https://hometeaparty.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function scrapeList(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    const html = await res.text()
    const $ = load(html)
    const data = []
    
    // Selector lebih luas biar semua film ketangkep
    $('article, .post, .item, .ml-item, .col-md-2').each((i, el) => {
      const title = $(el).find('h2, .entry-title, .post-title, h3').text().trim()
      const link = $(el).find('a').attr('href')
      let img = $(el).find('img').attr('data-src') || $(el).find('img').attr('src')
      
      if (title && link) {
        if (img && img.startsWith('//')) img = 'https:' + img
        data.push({ title, link, img: img || 'https://via.placeholder.com/300x450?text=No+Image' })
      }
    })
    return data
  } catch { return [] }
}

app.get('/', async (c) => c.json({ status: true, data: await scrapeList(TARGET) }))

// FIX: Route khusus buat Indonesia pake parameter search advanced
app.get('/indonesia', async (c) => {
  const url = `${TARGET}/?s=&search=advanced&post_type=post&country=indonesia`
  const data = await scrapeList(url)
  return c.json({ status: true, data })
})

app.get('/category/:slug', async (c) => {
  const slug = c.req.param('slug')
  const data = await scrapeList(`${TARGET}/category/${slug}/`)
  return c.json({ status: true, data })
})

app.get('/tag/:slug', async (c) => {
  const slug = c.req.param('slug')
  const data = await scrapeList(`${TARGET}/tag/${slug}/`)
  return c.json({ status: true, data })
})

app.get('/search', async (c) => {
  const q = c.req.query('q')
  return c.json({ status: true, data: await scrapeList(`${TARGET}/?s=${q}`) })
})

// FIX: Detail Scraper super kuat buat tembusin video
app.get('/detail', async (c) => {
  const url = c.req.query('url')
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    const html = await res.text()
    const $ = load(html)
    const streams = []

    // Cari di semua elemen yang mencurigakan (iframe, div, link)
    $('*').each((i, el) => {
      const attributes = ['src', 'data-src', 'data-frame-src', 'data-lazy-src', 'href']
      attributes.forEach(attr => {
        let val = $(el).attr(attr)
        if (val && typeof val === 'string') {
          // Cari link yang mengandung kata kunci player/embed/video
          if ((val.includes('embed') || val.includes('player') || val.includes('video.php') || val.includes('.m3u8')) && 
              !val.includes('facebook') && !val.includes('twitter') && !val.includes('ads')) {
            if (val.startsWith('//')) val = 'https:' + val
            if (!streams.includes(val)) streams.push(val)
          }
        }
      })
    })

    // Cari di dalem Script (Regex Scan)
    const scriptContent = $('script').text()
    const regex = /(?:https?:)?\/\/[^\s"'<>]+(?:embed|player|video|m3u8)[^\s"'<>]*/g
    const matches = scriptContent.match(regex)
    if (matches) {
      matches.forEach(m => {
        let s = m.startsWith('//') ? 'https:' + m : m
        if (!streams.includes(s) && !s.includes('ads')) streams.push(s)
      })
    }

    return c.json({ 
      status: true, 
      title: $('h1, .entry-title').first().text().trim(), 
      streams: [...new Set(streams)] 
    })
  } catch { return c.json({ status: false, streams: [] }) }
})

export default app
