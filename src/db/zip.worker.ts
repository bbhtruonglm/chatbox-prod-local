import { db } from './ChatDB'
// zip.worker.ts
import { unzip } from 'fflate' // dùng unzip async

onmessage = async e => {
  const url = e.data

  try {
    const res = await fetch(url)
    const uint8 = new Uint8Array(await res.arrayBuffer())

    // unzip async → không block worker thread
    unzip(uint8, async (err, files) => {
      if (err) return postMessage({ ok: false, error: err.toString() })

      const fileName = Object.keys(files).find(f => f.endsWith('.jsonb'))
      if (!fileName) return postMessage({ ok: false, error: 'No .jsonb file' })

      const text = new TextDecoder().decode(files[fileName])
      const lines = text.split('\n').filter(Boolean)
      const list = lines.map(line => JSON.parse(line))

      // Lưu vào Dexie trong worker (Dexie hỗ trợ worker)
      await db.saveMany(list)

      postMessage({ ok: true, count: list.length })
    })
  } catch (err) {
    postMessage({ ok: false, error: err.toString() })
  }
}
