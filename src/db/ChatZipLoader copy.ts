import { find, keyBy, max, size, values } from 'lodash'
import { strFromU8, unzipSync } from 'fflate'

import { db } from './ChatDB'

export async function loadZip(url: string) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch ${url}`)

    const arrayBuffer = await res.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)
    const files = unzipSync(uint8)

    const fileName = find(Object.keys(files), f => f.endsWith('.jsonb'))
    if (!fileName) throw new Error('No .jsonb file found in zip')

    const text = strFromU8(files[fileName])
    const lines = text.split('\n').filter(Boolean)
    const list = lines.map(line => JSON.parse(line))

    // group theo pageId để tính last_update riêng
    const pageGroups: Record<string, typeof list> = {}
    for (const conv of list) {
      if (!conv.fb_page_id || !conv.fb_client_id) continue
      if (!pageGroups[conv.fb_page_id]) pageGroups[conv.fb_page_id] = []
      pageGroups[conv.fb_page_id].push(conv)
    }

    const updatedRecords: Record<string, any> = {}

    for (const pageId in pageGroups) {
      const pageConvs = pageGroups[pageId]

      // IDs duy nhất cho page này
      const ids = pageConvs.map(c => `${c.fb_page_id}_${c.fb_client_id}`)
      const existingList = await db.conversations.bulkGet(ids)
      const existingMap = keyBy(existingList, 'id')

      for (const conv of pageConvs) {
        const id = `${conv.fb_page_id}_${conv.fb_client_id}`
        const existing = existingMap[id]

        const convTime = conv.last_message_time || conv.createdAt || 0
        const existingTime =
          existing?.last_message_time || existing?.createdAt || 0

        if (!existing || convTime > existingTime) {
          updatedRecords[id] = { ...conv, id }
        }
      }

      // tính last_update riêng theo page
      if (size(updatedRecords)) {
        const maxTime =
          max(pageConvs.map(c => c.last_message_time || c.createdAt || 0)) ||
          Date.now()
        await db.meta.put({ key: `last_update_${pageId}`, value: maxTime })
      }
    }

    if (size(updatedRecords)) await db.saveMany(updatedRecords)
    console.log(`✅ Updated ${size(updatedRecords)} records in IndexedDB`)

    return list
  } catch (e) {
    console.error('Failed to load zip:', e)
    return []
  }
}
