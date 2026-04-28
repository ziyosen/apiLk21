import { Hono } from 'hono'
import { load } from 'cheerio'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('/*', cors())

const TARGET = 'https://buddhistchaplainsnetwork.org'

// Pake User-Agent yang lebih "manusiawi" biar gak diblok
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

async function scrapeList(url) {
  try {
    const res = await fetch(url, { 
      headers: { 
        'User-Agent': UA,
        'Referer': TARGET,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      } 
    })
    
    if (!res.ok) return []
    
    const html = await res.text()
    const $ = load(html)
    const data = []
    
    // Selector diperluas biar gak ada yang kelewat
    $('.ml-item, .item, article').each((i, el) => {
      const title = $(el).find('h2, h3, .mli-info h2, .entry-title').text().trim()
      const link = $(el).find('a').attr('href')
      
      // Ambil gambar dari segala kemungkinan atribut lazy-load
      let img = $(el).find('img').attr('data-original') || 
                $(el).find('img').attr('data-src') || 
                $(el).find('img').attr('src') ||
                $(el).find('img').attr('data-lazy-src')
      
      if (title && link) {
        // Fix URL gambar kalau masih relatif atau pake //
        if (img && img.startsWith('//')) img = 'https:' + img
        
        data.push({ 
          title: title.replace(/\n/g, '').trim(), 
          link, 
          img: img || '' 
        })
      }
    })
    return data
  } catch (e) { 
    console.log('Error Scrape:', e.message)
    return [] 
  }
}

app.get('/', async (c) => c.json({ status: true, data: await scrapeList(TARGET) }))
app.get('/search', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/?s=${c.req.query('q')}`) }))

// GENRE (Jalur langsung sesuai website target)
app.get('/action', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/action/`) }))
app.get('/adventure', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/adventure/`) }))
app.get('/comedy', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/comedy/`) }))
app.get('/crime', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/crime/`) }))
app.get('/drama', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/drama/`) }))
app.get('/fantasy', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/fantasy/`) }))
app.get('/mystery', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/mystery/`) }))
app.get('/romance', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/romance/`) }))

// LAIN-LAIN
app.get('/indonesia', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/country/indonesia/`) }))
app.get('/year-2015', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/year/2015/`) }))
app.get('/best-rating', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/best-rating/`) }))

// SEMI COLLECTION
app.get('/semi-jepang', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/film-semi-jepang/`) }))
app.get('/semi-philippines', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/film-semi-philippines/`) }))
app.get('/semi-korea', async (c) => c.json({ status: true, data: await scrapeList(`${TARGET}/film-semi-korea/`) }))

app.get('/detail', async (c) => {
  try {
    const res = await fetch(c.req.query('url'), { headers: { 'User-Agent': UA, 'Referer': TARGET } })
    const html = await res.text()
    const $ = load(html)
    const streams = []
    
    $('iframe').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src')
      if (src && !src.includes('ads') && !src.includes('facebook') && !src.includes('twitter')) {
        if (src.startsWith('//')) src = 'https:' + src
        streams.push(src)
      }
    })
    return c.json({ status: true, streams })
  } catch { return c.json({ status: false, streams: [] }) }
})

export default app
