import { db } from '../db/ChatDB'
import { unzip } from 'fflate'

interface WorkerMessage {
  type: 'load_zips'
  urls: string[]
}

interface ProgressMessage {
  type: 'progress'
  orgId: string
  status: 'loading' | 'done' | 'error'
  count?: number
  error?: string
}

onmessage = async (e: MessageEvent<WorkerMessage>) => {
  if (e.data.type === 'load_zips') {
    const urls = e.data.urls

    for (const url of urls) {
      // trích orgId từ URL (giả sử có org_id=XXX)
      const match = url.match(/org_id-([a-z0-9]+)/i)
      const orgId = match ? match[1] : 'unknown'

      postMessage({
        type: 'progress',
        orgId,
        status: 'loading',
      } as ProgressMessage)

      try {
        const res = await fetch(url)
        const uint8 = new Uint8Array(await res.arrayBuffer())

        await new Promise<void>((resolve, reject) => {
          unzip(uint8, async (err, files) => {
            if (err) return reject(err)

            const fileName = Object.keys(files).find(f => f.endsWith('.jsonb'))
            if (!fileName) return reject(new Error('No .jsonb file'))

            const text = new TextDecoder().decode(files[fileName])
            const lines = text.split('\n').filter(Boolean)
            const list = lines.map(line => JSON.parse(line))

            await db.saveMany(list)
            postMessage({
              type: 'progress',
              orgId,
              status: 'done',
              count: list.length,
            } as ProgressMessage)
            resolve()
          })
        })
      } catch (err: any) {
        postMessage({
          type: 'progress',
          orgId,
          status: 'error',
          error: err.message,
        } as ProgressMessage)
      }
    }
  }
}
