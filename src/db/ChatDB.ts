import { map, max, orderBy, size, values } from 'lodash'

import type { ConversationInfo } from '@/service/interface/app/conversation'
import Dexie from 'dexie'

interface Meta {
  key: string
  value: any
}

export class ChatDB extends Dexie {
  conversations!: Dexie.Table<ConversationInfo, string>
  meta!: Dexie.Table<Meta, string>

  constructor() {
    super('chat_demo')
    this.version(1).stores({
      conversations:
        'id, fb_client_id, fb_page_id, conversation_type, unread_message_amount, last_message_type, client_name, client_alias_name, client_phone, client_email, is_spam_fb, last_message_time, fb_staff_id, user_id, platform_type',
      meta: 'key',
    })
  }

  /**
   * 💾 Lưu nhiều conversation vào DB bằng bulkPut
   * - map_convs: object { id: ConversationInfo }
   * - Tự tạo last_update & đảm bảo id hợp lệ
   */

  async saveMany(map_convs: Record<string, ConversationInfo>) {
    if (!size(map_convs)) return

    /** --- Nhóm theo pageId --- */
    const PAGE_GROUP: Record<string, ConversationInfo[]> = {}
    for (const c of values(map_convs)) {
      if (!c.fb_page_id || !c.fb_client_id) continue
      if (!PAGE_GROUP[c.fb_page_id]) PAGE_GROUP[c.fb_page_id] = []
      PAGE_GROUP[c.fb_page_id].push(c)
    }

    /** --- Duyệt từng page --- */
    for (const pageId in PAGE_GROUP) {
      /** Lấy Conversation theo page ID */
      const CONVS = PAGE_GROUP[pageId]
      /** Lọc lấy page id, cập nhật last update */
      const LIST = CONVS.map(c => {
        /** Lấy ID */
        const ID = `${c.fb_page_id}_${c.fb_client_id}`
        /** Lấy last_update từ last_message_time > create_at > Date.now() */
        const LAST_UPDATE = c.last_message_time
        return { ...c, id: ID, last_update: LAST_UPDATE }
      })
      /** Nếu không có hội thoại nào thì bỏ qua */
      if (!LIST.length) continue
      /** Xử lý vào list */
      await this.conversations.bulkPut(LIST)

      /** Cập nhật meta.last_update riêng cho page */
      const MAX_UPDATE = max(LIST.map(c => c.last_update || 0)) || Date.now()

      /** Cập nhật last update theo max update  */
      await this.meta.put({ key: `last_update_${pageId}`, value: MAX_UPDATE })
    }
  }

  /** Tạm thời clone function trên, để xử lý riêng case vào trang fetch mới
   * Không trùng với các logic khác, tránh ảnh hưởng
   */
  async saveManyFetch(map_convs: Record<string, ConversationInfo>) {
    if (!size(map_convs)) return

    /** --- Nhóm theo pageId --- */
    const pageGroups: Record<string, ConversationInfo[]> = {}
    for (const c of values(map_convs)) {
      if (!c.fb_page_id || !c.fb_client_id) continue
      if (!pageGroups[c.fb_page_id]) pageGroups[c.fb_page_id] = []
      pageGroups[c.fb_page_id].push(c)
    }

    /** --- Duyệt từng page --- */
    for (const pageId in pageGroups) {
      const convs = pageGroups[pageId]

      const LIST = convs.map(c => {
        const id = `${c.fb_page_id}_${c.fb_client_id}`
        // Lấy last_update từ last_message_time > create_at > Date.now()
        const last_update = c.last_message_time
        return { ...c, id, last_update }
      })

      if (!LIST.length) continue

      await this.conversations.bulkPut(LIST)

      // Cập nhật meta.last_update riêng cho page
      // const MAX_UPDATE = max(LIST.map(c => c.last_update || 0)) || Date.now()
      const MAX_UPDATE = Date.now()

      console.log(MAX_UPDATE, 'max update')
      await this.meta.put({ key: `last_update_${pageId}`, value: MAX_UPDATE })
    }
  }

  /** Lấy last update của page */
  async getLastUpdate(pageId?: string): Promise<number> {
    const key = pageId ? `last_update_${pageId}` : 'last_update'
    const META = await this.meta.get(key)
    return META?.value || 0
  }

  /** Filter + paginate conversation */
  async filter(
    filter: any,
    after?: number[],
    limit: number = 50,
    pageIds?: string[]
  ): Promise<{ conversations: ConversationInfo[]; after?: number[] }> {
    let collection = this.conversations.toCollection()
    if (pageIds?.length)
      collection = collection.filter(c => pageIds.includes(c.fb_page_id))

    // --- Filter cơ bản ---
    if (filter.unread_message === 'true')
      collection = collection.filter(c => (c.unread_message_amount || 0) > 0)
    if (filter.not_response_client === 'true')
      collection = collection.filter(
        c => (c.last_message_type || '').toLowerCase() === 'client'
      )
    if (filter.conversation_type)
      collection = collection.filter(
        c => c.conversation_type === filter.conversation_type
      )
    if (filter.staff_id?.length)
      collection = collection.filter(
        c =>
          filter.staff_id.includes(c.fb_staff_id!) ||
          filter.staff_id.includes(c.user_id!)
      )
    if (filter.time_range?.gte || filter.time_range?.lte) {
      const { gte, lte } = filter.time_range
      collection = collection.filter(c => {
        const t = c.last_message_time || 0
        if (gte && t < gte) return false
        if (lte && t > lte) return false
        return true
      })
    }
    if (filter.label_id?.length) {
      if (filter.label_and)
        collection = collection.filter(c =>
          (c.label_id ?? []).every((id: string) => filter.label_id.includes(id))
        )
      else
        collection = collection.filter(c =>
          (c.label_id ?? []).some((id: string) => filter.label_id.includes(id))
        )
    }
    if (filter.search) {
      const search = filter.search.toLowerCase()
      collection = collection.filter(c =>
        [
          c.client_name,
          c.client_alias_name,
          c.client_phone,
          c.client_email,
          c.last_message,
          c.fb_client_id,
        ]
          .filter(Boolean)
          .some(v => (v as string).toLowerCase().includes(search))
      )
    }

    // --- Sort ---
    const ALL_ITEMS = await collection.toArray()
    const WITH_TIME = ALL_ITEMS.filter(c => c.last_message_time != null)
    const WITHOUT_TIME = ALL_ITEMS.filter(c => c.last_message_time == null)
    const SORTED_WITH_TIME = orderBy(
      WITH_TIME,
      ['unread_message_amount', 'last_message_time'],
      ['desc', 'desc']
    )
    const SORTED_WITHOUT_TIME = orderBy(
      WITHOUT_TIME,
      ['unread_message_amount'],
      ['desc']
    )
    const FINAL = [...SORTED_WITH_TIME, ...SORTED_WITHOUT_TIME]

    // --- Pagination ---
    let start_index = 0
    if (after?.length) {
      const IDX = FINAL.findIndex(c => after.includes(c.last_message_time || 0))
      if (IDX >= 0) start_index = IDX + 1
    }
    const SLICE = FINAL.slice(start_index, start_index + limit)
    const NEXT_AFTER = SLICE.length
      ? SLICE.map(c => c.last_message_time || 0)
      : undefined

    return { conversations: SLICE, after: NEXT_AFTER }
  }

  /** Count conversation cho pageIds */
  async countByPageIds(
    pageIds: string[],
    filter: any,
    conversation_type?: 'CHAT' | 'POST'
  ): Promise<number> {
    const { conversations } = await this.filter(
      filter,
      undefined,
      Number.MAX_SAFE_INTEGER,
      pageIds
    )
    if (conversation_type)
      return conversations.filter(
        c => c.conversation_type === conversation_type
      ).length
    return conversations.length
  }
}

export const db = new ChatDB()
