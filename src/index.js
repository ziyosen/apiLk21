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
    $('.ml-item, article, .post').each((i, el) => {
      const title = $(el).find('h2, .entry-title, h3').text().trim()
      const link = $(el).find('a').attr('href')
      let img = $(el).find('img').attr('data-src') || $(el).find('img').attr('src')
      if (title && link) {
        if (img && img.startsWith('//')) img = 'https:' + img
        data.push({ title, link, img: img || '' })
      }
    })
    return data
  } catch { return [] }
}

app.get('/', async (c) => c.json({ status: true, data: await scrapeList(TARGET) }))

// FIX: Jalur Indonesia
app.get('/indonesia', async (c) => {
  const url = `${TARGET}/?s=&search=advanced&post_type=post&country=indonesia`
  return c.json({ status: true, data: await scrapeList(url) })
})

// FIX: Jalur 18+ (Kita tembak langsung ke Tag-nya)
app.get('/tag/18+', async (c) => {
  const url = `${TARGET}/tag/18+/`
  return c.json({ status: true, data: await scrapeList(url) })
})

app.get('/category/:slug', async (c) => {
  const data = await scrapeList(`${TARGET}/category/${c.req.param('slug')}/`)
  return c.json({ status: true, data })
})

// BAGIAN PALING PENTING: Fix Link Video
app.get('/detail', async (c) => {
  const url = c.req.query('url')
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    const html = await res.text()
    const $ = load(html)
    const streams = []

    // 1. Cari Iframe murni
    $('iframe').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src')
      if (src && !src.includes('facebook') && !src.includes('ads')) {
        if (src.startsWith('//')) src = 'https:' + src
        streams.push(src)
      }
    })

    // 2. Bongkar Player (Bypass oEmbed error)
    const scripts = $('script').text()
    const regex = /"(https?:\/\/[^"]+(?:embed|player|video|m3u8)[^"]+)"/g
    let match
    while ((match = regex.exec(scripts)) !== null) {
      let s = match[1].replace(/\\/g, '')
      if (!streams.includes(s) && !s.includes('google')) streams.push(s)
    }

    return c.json({ status: true, streams: [...new Set(streams)] })
  } catch { return c.json({ status: false, streams: [] }) }
})

export default app
