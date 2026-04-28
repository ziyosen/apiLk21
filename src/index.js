import { Hono } from 'hono'
import { load } from 'cheerio'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('/*', cors())

const TARGET = 'https://buddhistchaplainsnetwork.org'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function scrapeList(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    const html = await res.text()
    const $ = load(html)
    const data = []
    $('.ml-item, .item, article').each((i, el) => {
      const title = $(el).find('h2, h3, .entry-title').first().text().trim()
      const link = $(el).find('a').first().attr('href')
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
app.get('/search', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/?s=${c.req.query('q')}`) }))

// FIX JALUR TAHUN
app.get('/year-2015', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/year/2015/`) }))
app.get('/year-2009', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/year/2009/`) }))

// GENRE & NEGARA
app.get('/indonesia', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/country/indonesia/`) }))
app.get('/best-rating', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/best-rating/`) }))
app.get('/mystery', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/mystery/`) }))
app.get('/crime', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/crime/`) }))
app.get('/fantasy', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/fantasy/`) }))
app.get('/romance', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/romance/`) }))
app.get('/action', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/genre/action/`) }))
app.get('/drama', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/genre/drama/`) }))
app.get('/comedy', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/genre/comedy/`) }))

// SEMI COLLECTION
app.get('/semi-jepang', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/film-semi-jepang/`) }))
app.get('/semi-philippines', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/film-semi-philippines/`) }))
app.get('/semi-korea', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/film-semi-korea/`) }))

app.get('/detail', async (c) => {
  try {
    const res = await fetch(c.req.query('url'), { headers: { 'User-Agent': UA } })
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
