// import { db } from '../db/ChatDB'
// import { unzip } from 'fflate'

// interface WorkerMessage {
//   type: 'load_zips'
//   urls: string[]
// }

// interface ProgressMessage {
//   type: 'progress'
//   orgId: string
//   status: 'loading' | 'done' | 'error'
//   count?: number
//   error?: string
// }

// onmessage = async (e: MessageEvent<WorkerMessage>) => {
//   if (e.data.type !== 'load_zips') return
//   const urls = e.data.urls

//   for (const url of urls) {
//     const match = url.match(/org_id-([a-z0-9]+)/i)
//     const orgId = match ? match[1] : 'unknown'

//     postMessage({
//       type: 'progress',
//       orgId,
//       status: 'loading',
//     } as ProgressMessage)

//     try {
//       const res = await fetch(url)
//       if (!res.ok) throw new Error(`Failed to fetch ${url}`)
//       const uint8 = new Uint8Array(await res.arrayBuffer())

//       await new Promise<void>((resolve, reject) => {
//         unzip(uint8, async (err, files) => {
//           if (err) return reject(err)

//           const fileName = Object.keys(files).find(f => f.endsWith('.jsonb'))
//           if (!fileName) return reject(new Error('No .jsonb file'))

//           const text = new TextDecoder().decode(files[fileName])
//           const lines = text.split('\n').filter(Boolean)

//           const batchSize = 1000
//           for (let i = 0; i < lines.length; i += batchSize) {
//             const slice = lines.slice(i, i + batchSize)
//             const mapData: Record<string, any> = {}
//             slice.forEach(line => {
//               const c = JSON.parse(line)
//               if (!c.fb_page_id || !c.fb_client_id) return
//               const id = `${c.fb_page_id}_${c.fb_client_id}`
//               mapData[id] = { ...c, id }
//             })

//             if (Object.keys(mapData).length) {
//               await db.saveMany(mapData)
//               postMessage({
//                 type: 'progress',
//                 orgId,
//                 status: 'loading',
//                 count: Object.keys(mapData).length,
//               })
//             }
//           }

//           resolve()
//         })
//       })

//       postMessage({
//         type: 'progress',
//         orgId,
//         status: 'done',
//       } as ProgressMessage)
//     } catch (err: any) {
//       postMessage({
//         type: 'progress',
//         orgId,
//         status: 'error',
//         error: err.message,
//       } as ProgressMessage)
//     }
//   }
// }
