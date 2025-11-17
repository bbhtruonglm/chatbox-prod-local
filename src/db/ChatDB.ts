import { map, orderBy } from 'lodash'

import type { ConversationInfo } from '@/service/interface/app/conversation'
import Dexie from 'dexie'

/**
 * Cấu trúc dữ liệu meta trong DB
 * - key: tên định danh
 * - value: giá trị lưu trong DB
 */
interface Meta {
  key: string
  value: any
}

/**
 * ⚡ ChatDB - Quản lý IndexedDB phục vụ lưu trữ conversation local
 * - conversations: chứa danh sách hội thoại
 * - meta: chứa metadata (last_update…)
 *
 * Sử dụng Dexie giúp:
 * - Bulk insert/update
 * - Query nhanh với index
 * - Dễ mở rộng version DB
 */
class ChatDB extends Dexie {
  conversations!: Dexie.Table<ConversationInfo, string>
  meta!: Dexie.Table<Meta, string>

  constructor() {
    super('chat_demo')

    /**
     * 📌 Định nghĩa schema DB version 1
     * - conversations: index `id` & các trường quan trọng để query/filter
     * - meta: chỉ có key (primary key)
     */
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
    /** Chuyển map → array + chuẩn hoá lại id + thêm last_update */
    const LIST = map(map_convs, c => {
      const ID = `${c.fb_page_id}_${c.fb_client_id}`
      return { ...c, id: ID, last_update: Date.now() }
    })
    if (!LIST.length) return

    /** Bulk put để giảm số lượng transaction */
    await this.conversations.bulkPut(LIST)

    /** Cập nhật meta.last_update */
    const MAX_UPDATE = Math.max(...LIST.map(c => c.last_update || 0))
    await this.meta.put({ key: 'last_update', value: MAX_UPDATE })
  }

  /**
   * 📌 Lấy thời điểm cập nhật cuối cùng của DB
   */
  async getLastUpdate(): Promise<number> {
    const META = await this.meta.get('last_update')
    return META?.value || 0
  }

  /**
   * 🔄 updateFromMessage - Cập nhật hội thoại dựa trên message realtime
   * - Nếu chưa có conversation → tạo mới
   * - Nếu mới hơn last_message_time → cập nhật
   * - Tự tăng unread nếu message từ client
   */
  async updateFromMessage(detail: any) {
    /** Tạo id duy nhất cho từng hội thoại */
    const ID = `${detail.fb_page_id}_${detail.fb_client_id}`

    /** Lấy conversation đang có */
    const CONV = await this.conversations.get(ID)

    /** LAST_MESSAGE_TIME lấy từ detail hoặc fallback hiện tại */
    const LAST_MESSAGE_TIME = detail.last_message_time || Date.now()

    /**
     * Nếu hội thoại chưa tồn tại → tạo mới
     */
    if (!CONV) {
      await this.conversations.put({
        id: ID,
        fb_page_id: detail.fb_page_id,
        fb_client_id: detail.fb_client_id,
        last_message: detail.message_text,
        last_message_time: LAST_MESSAGE_TIME,
        last_message_id: detail._id,
        last_message_type: detail.message_type,
        unread_message_amount: detail.message_type === 'client' ? 1 : 0,
        last_update: Date.now(),
      })
      return
    }

    /**
     * Nếu message mới hơn message đang lưu → update
     */
    if (LAST_MESSAGE_TIME > (CONV.last_message_time || 0)) {
      await this.conversations.update(ID, {
        last_message_time: LAST_MESSAGE_TIME,
        last_message: detail.message_text || CONV.last_message,
        last_message_id: detail._id,
        last_message_type: detail.message_type,
        unread_message_amount:
          detail.message_type === 'client'
            ? (CONV.unread_message_amount || 0) + 1
            : CONV.unread_message_amount,
        last_update: Date.now(),
      })
    }
  }

  /**
   * 🔍 filter() — Lọc + sắp xếp + phân trang conversation trong IndexedDB
   *
   * ⭐ Hỗ trợ:
   * - filter: nhiều trường
   * - sort: unread desc → last_message_time desc
   * - after: phân trang dựa trên list last_message_time[]
   */
  async filter(
    filter: any,
    after?: number[],
    limit: number = 50,
    pageIds?: string[]
  ): Promise<{ conversations: ConversationInfo[]; after?: number[] }> {
    /** Bắt đầu query từ toàn bộ bảng conversations */
    let collection = this.conversations.toCollection()

    /** 📌 Filter theo pageId trước (nếu có) */
    if (pageIds?.length) {
      collection = collection.filter(c => pageIds.includes(c.fb_page_id))
    }

    /**
     * --- Các filter cơ bản ---
     * Mỗi filter là một vòng filter() độc lập,
     * Dexie sẽ chain điều kiện liên tục.
     */

    if (filter.unread_message === 'true')
      collection = collection.filter(c => (c.unread_message_amount || 0) > 0)

    if (filter.not_response_client === 'true')
      collection = collection.filter(
        c => (c.last_message_type || '').toLowerCase() === 'client'
      )

    if (filter.not_exist_label === 'true')
      collection = collection.filter(c => !c.label_id?.length)

    if (filter.have_phone === 'YES')
      collection = collection.filter(c => !!c.client_phone)
    if (filter.have_phone === 'NO')
      collection = collection.filter(c => !c.client_phone)

    if (filter.is_spam_fb === 'YES')
      collection = collection.filter(c => c.is_spam_fb === true)
    if (filter.is_spam_fb === 'NO')
      collection = collection.filter(c => c.is_spam_fb !== true)

    if (filter.conversation_type)
      collection = collection.filter(
        c => c.conversation_type === filter.conversation_type
      )

    if (filter.have_client_name)
      collection = collection.filter(c => !!c.client_name)

    /** Filter theo display_style */
    if (filter.display_style) {
      switch (filter.display_style) {
        case 'INBOX':
          collection = collection.filter((c: any) => c.is_have_fb_inbox)
          break
        case 'COMMENT':
          collection = collection.filter((c: any) => c.is_have_fb_post)
          break
        case 'GROUP':
          collection = collection.filter((c: any) => c.is_group)
          break
        case 'FRIEND':
          collection = collection.filter((c: any) => !c.is_group)
          break
      }
    }

    if (filter.not_have_fb_uid)
      collection = collection.filter(c => !c.client_bio)

    if (filter.have_email === 'YES')
      collection = collection.filter(c => !!c.client_email)
    if (filter.have_email === 'NO')
      collection = collection.filter(c => !c.client_email)

    if (filter.platform_type)
      collection = collection.filter(
        c => c.platform_type === filter.platform_type
      )

    if (filter.post_id)
      collection = collection.filter((c: any) =>
        c.list_fb_post_id?.includes(filter.post_id)
      )

    /** Filter theo staffId hoặc userId */
    if (filter.staff_id?.length) {
      collection = collection.filter(
        c =>
          filter.staff_id.includes(c.fb_staff_id!) ||
          filter.staff_id.includes(c.user_id!)
      )
    }

    /** Filter theo khoảng thời gian */
    if (filter.time_range?.gte || filter.time_range?.lte) {
      const { gte, lte } = filter.time_range
      collection = collection.filter(c => {
        const t = c.last_message_time || 0
        if (gte && t < gte) return false
        if (lte && t > lte) return false
        return true
      })
    }

    /** Filter theo label */
    if (filter.label_id?.length) {
      if (filter.label_and) {
        collection = collection.filter(c => {
          const LABELS = c.label_id ?? []
          return filter.label_id.every((id: string) => LABELS.includes(id))
        })
      } else {
        collection = collection.filter(c => {
          const LABELS = c.label_id ?? []
          return LABELS.some((id: string) => filter.label_id.includes(id))
        })
      }
    }

    /** Filter bỏ những label không mong muốn */
    if (filter.not_label_id?.length)
      collection = collection.filter(
        c => !c.label_id?.some(id => filter.not_label_id.includes(id))
      )

    /** Search */
    if (filter.search) {
      /** Lấy field search */
      const SEARCH = filter.search.toLowerCase()
      /** Xử lý filter theo key search */
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
          .some(v => v!.toLowerCase().includes(SEARCH))
      )
    }

    /**
     * --- SORT ---
     * Ưu tiên unread desc → last_message_time desc
     */
    const ALL_ITEMS = await collection.toArray()
    /** Lấy danh sách có last message time */
    const WITH_TIME = ALL_ITEMS.filter(c => c.last_message_time != null)
    /** Lấy danh sách không có last message time */
    const WITHOUT_TIME = ALL_ITEMS.filter(c => c.last_message_time == null)
    /** Sort data có thời gian */
    const SORTED_WITH_TIME = orderBy(
      WITH_TIME,
      ['unread_message_amount', 'last_message_time'],
      ['desc', 'desc']
    )
    /** Sort data không có thời gian */
    const SORTED_WITHOUT_TIME = orderBy(
      WITHOUT_TIME,
      ['unread_message_amount'],
      ['desc']
    )
    /** Update lại list final */
    const FINAL = [...SORTED_WITH_TIME, ...SORTED_WITHOUT_TIME]

    /**
     * --- PAGINATION bằng after[] ---
     * after là mảng chứa list last_message_time
     * Nếu có after → tìm vị trí rồi lấy trang tiếp theo
     */
    let start_index = 0
    if (after?.length) {
      /** Tìm ID   */
      const IDX = FINAL.findIndex(c => after.includes(c.last_message_time || 0))
      if (IDX >= 0) start_index = IDX + 1
    }
    /** Slice các bản ghi từ start index -> start index + limit */
    const SLICE = FINAL.slice(start_index, start_index + limit)

    /** Trả về nextAfter để request trang kế tiếp */
    const NEXT_AFTER = SLICE.length
      ? SLICE.map(c => c.last_message_time || 0)
      : undefined

    return { conversations: SLICE, after: NEXT_AFTER }
  }
}

export const db = new ChatDB()
