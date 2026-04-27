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
    $('article, .post, .item, .ml-item').each((i, el) => {
      const title = $(el).find('h2, .entry-title, .post-title').text().trim()
      const link = $(el).find('a').attr('href')
      const img = $(el).find('img').attr('data-src') || $(el).find('img').attr('src')
      if (title && link) data.push({ title, link, img })
    })
    return data
  } catch { return [] }
}

// Routes Dasar
app.get('/', async (c) => c.json({ status: true, data: await scrapeList(TARGET) }))
app.get('/search', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/?s=${c.req.query('q')}`) }))
app.get('/tag/:slug', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/tag/${c.req.param('slug')}/`) }))

// Endpoint Kategori Baru (Sesuai permintaan kamu)
app.get('/category/:slug', async (c) => {
  const slug = c.req.param('slug')
  const data = await scrapeList(`${TARGET}/category/${slug}/`)
  return c.json({ status: true, category: slug, data })
})

// Endpoint Filter (Untuk Advanced Search)
app.get('/filter', async (c) => {
  const { genre, country, year } = c.req.query()
  const url = `${TARGET}/?s=&search=advanced&post_type=post&genre=${genre||''}&movieyear=${year||''}&country=${country||''}`
  return c.json({ status: true, data: await scrapeList(url) })
})

// Endpoint Detail (SANGAT KUAT - Untuk bongkar link video)
app.get('/detail', async (c) => {
  const url = c.req.query('url')
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    const html = await res.text()
    const $ = load(html)
    const streams = []

    // 1. Ambil dari Iframe & Data attributes (Lazy Load)
    $('iframe, ins, div[data-src], a[data-frame-src]').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-frame-src') || $(el).attr('href')
      if (src && typeof src === 'string' && (src.includes('embed') || src.includes('player') || src.includes('video'))) {
        if (src.startsWith('//')) src = 'https:' + src
        if (!src.includes('ads') && !src.includes('facebook')) streams.push(src)
      }
    })

    // 2. Scan Script (Mencari link video yang di-inject JS)
    const scripts = $('script').text()
    const regex = /(?:https?:)?\/\/[^\s"'<>]+(?:embed|player|video|m3u8)[^\s"'<>]*/g
    let match
    while ((match = regex.exec(scripts)) !== null) {
      let s = match[0].startsWith('//') ? 'https:' + match[0] : match[0]
      if (!streams.includes(s) && !s.includes('ads')) streams.push(s)
    }

    return c.json({ 
      status: true, 
      title: $('h1, .entry-title').first().text().trim(), 
      streams: [...new Set(streams)] 
    })
  } catch { return c.json({ status: false, streams: [] }) }
})

export default app
