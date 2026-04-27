import { Hono } from 'hono'
import { load } from 'cheerio'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('/*', cors())

const TARGET = 'https://hometeaparty.com'

// Fungsi Helper biar gak nulis ulang kode scraping yang sama
async function scrapeList(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  const html = await res.text()
  const $ = load(html)
  const data = []

  $('article').each((i, el) => {
    data.push({
      title: $(el).find('h2, .entry-title').text().trim(),
      link: $(el).find('a').attr('href'),
      img: $(el).find('img').attr('src'),
      // Kadang ada rating atau kualitas di web film, bisa ditambahin di sini kalau ada
    })
  })
  return data
}

// 1. ENDPOINT HOME (Postingan Terbaru)
app.get('/', async (c) => {
  try {
    const data = await scrapeList(TARGET)
    return c.json({ status: true, type: 'home', data })
  } catch (err) {
    return c.json({ status: false, message: err.message }, 500)
  }
})

// 2. ENDPOINT INDONESIA (Kategori)
app.get('/indonesia', async (c) => {
  try {
    const data = await scrapeList(`${TARGET}/category/indonesia`)
    return c.json({ status: true, type: 'category', slug: 'indonesia', data })
  } catch (err) {
    return c.json({ status: false, message: err.message }, 500)
  }
})

// 3. ENDPOINT TAG (Misal: /tag/lebahmovie)
app.get('/tag/:slug', async (c) => {
  const slug = c.req.param('slug')
  try {
    const data = await scrapeList(`${TARGET}/tag/${slug}`)
    return c.json({ status: true, type: 'tag', slug, data })
  } catch (err) {
    return c.json({ status: false, message: err.message }, 500)
  }
})

// 4. ENDPOINT SEARCH
app.get('/search', async (c) => {
  const q = c.req.query('q')
  try {
    const data = await scrapeList(`${TARGET}/?s=${q}`)
    return c.json({ status: true, query: q, data })
  } catch (err) {
    return c.json({ status: false, message: err.message }, 500)
  }
})

// 5. ENDPOINT DETAIL (Buat ambil link video/iframe)
app.get('/detail', async (c) => {
  const url = c.req.query('url')
  if (!url) return c.json({ status: false, message: 'URL required' }, 400)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const html = await res.text()
    const $ = load(html)
    
    const streams = []
    $('iframe').each((i, el) => {
      const src = $(el).attr('src')
      if (src) streams.push(src)
    })

    return c.json({ 
      status: true, 
      title: $('.entry-title').text().trim(),
      streams 
    })
  } catch (err) {
    return c.json({ status: false, message: err.message }, 500)
  }
})

export default app
