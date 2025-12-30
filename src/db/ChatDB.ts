import { max, size, values } from 'lodash'

import type { ConversationInfo } from '@/service/interface/app/conversation'
import Dexie from 'dexie'
import { clippingParents } from '@popperjs/core'

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
     * 📌 Định nghĩa schema DB version 5
     * - conversations: index `id` & các trường quan trọng để query/filter
     * - meta: chỉ có key (primary key)
     *
     * ⚡ INDEXES OPTIMIZATION:
     * - fb_page_id: filter theo page
     * - conversation_type: filter CHAT/POST
     * - [fb_page_id+conversation_type]: compound index phổ biến nhất
     * - [fb_page_id+last_message_time]: pagination
     * - client_name: search (case-sensitive, need normalize)
     * - client_phone: search phone
     */

    this.version(5).stores({
      conversations: `
    id,
    fb_page_id,
    conversation_type,
    unread_message_amount,
    last_message_time,
    client_name,
    client_phone,
    [fb_page_id+last_message_time],
    [fb_page_id+conversation_type],
    [fb_page_id+conversation_type+last_message_time]
  `,
      meta: 'key',
    })
  }

  /**
   * 💾 Lưu nhiều conversation vào DB bằng bulkPut
   * - map_convs: object { id: ConversationInfo }
   * - Tự tạo last_update & đảm bảo id hợp lệ
   */

  async saveMany(map_convs: Record<string, ConversationInfo>, org_id?: string) {
    /** Kiểm tra nếu danh sách hội thoại rỗng thì dừng lại ngay */
    if (!size(map_convs)) return

    /** --- Nhóm theo pageId --- */
    /** Khởi tạo object để nhóm các hội thoại theo pageId */
    const PAGE_GROUPS: Record<string, ConversationInfo[]> = {}
    /** Duyệt qua từng hội thoại trong danh sách đầu vào */
    for (const c of values(map_convs)) {
      /** Nếu thiếu page_id hoặc client_id thì bỏ qua, không xử lý */
      if (!c.fb_page_id || !c.fb_client_id) continue
      /** Nếu chưa có nhóm cho page_id này thì tạo mảng mới */
      if (!PAGE_GROUPS[c.fb_page_id]) PAGE_GROUPS[c.fb_page_id] = []
      /** Thêm hội thoại vào nhóm tương ứng */
      PAGE_GROUPS[c.fb_page_id].push(c)
    }

    /** --- Duyệt từng page --- */
    /** Duyệt qua từng nhóm pageId đã tạo */
    for (const pageId in PAGE_GROUPS) {
      /** Lấy danh sách hội thoại thuộc pageId hiện tại */
      const CONVS = PAGE_GROUPS[pageId]
      /** Biến đổi danh sách hội thoại để chuẩn hóa dữ liệu trước khi lưu */
      const LIST = CONVS.map(c => {
        /** Tạo ID duy nhất bằng cách kết hợp page_id và client_id */
        const ID = `${c.fb_page_id}_${c.fb_client_id}`
        /** Lấy last_update từ last_message_time > create_at > Date.now() */
        const LAST_UPDATE = c.last_message_time
        /** Trả về object hội thoại mới với id và last_update đã chuẩn hóa */
        return { ...c, id: ID, last_update: LAST_UPDATE }
      })
      /** Nếu danh sách rỗng sau khi xử lý thì bỏ qua vòng lặp này */
      if (!LIST.length) continue
      /** Thực hiện lưu hàng loạt (bulkPut) vào bảng conversations */
      await this.conversations.bulkPut(LIST)

      /** Cập nhật meta.last_update riêng cho page */
      /** Tìm thời gian cập nhật lớn nhất trong danh sách vừa lưu, nếu không có thì dùng thời gian hiện tại */
      const MAX_UPDATE = max(LIST.map(c => c.last_update || 0)) || Date.now()

      /** Cập nhật last update theo max update vào bảng meta với key theo pageId */
      await this.meta.put({ key: `last_update_${pageId}`, value: MAX_UPDATE })
      /** Cập nhật last update theo max update vào bảng meta với key theo org_id */
      await this.meta.put({ key: `last_update_${org_id}`, value: MAX_UPDATE })
    }
  }

  /** Tạm thời clone function trên, để xử lý riêng case vào trang fetch mới
   * Không trùng với các logic khác, tránh ảnh hưởng
   */
  async saveManyFetch(map_convs: Record<string, ConversationInfo>) {
    if (!size(map_convs)) return

    /** --- Nhóm theo pageId --- */
    const PAGE_GROUPS: Record<string, ConversationInfo[]> = {}
    for (const c of values(map_convs)) {
      if (!c.fb_page_id || !c.fb_client_id) continue
      if (!PAGE_GROUPS[c.fb_page_id]) PAGE_GROUPS[c.fb_page_id] = []
      PAGE_GROUPS[c.fb_page_id].push(c)
    }

    /** --- Duyệt từng page --- */
    for (const pageId in PAGE_GROUPS) {
      const CONVS = PAGE_GROUPS[pageId]

      const LIST = CONVS.map(c => {
        const ID = `${c.fb_page_id}_${c.fb_client_id}`
        /** Lấy last_update từ last_message_time > create_at > Date.now() */
        const LAST_UPDATE = c.last_message_time
        return { ...c, id: ID, last_update: LAST_UPDATE }
      })

      if (!LIST.length) continue

      await this.conversations.bulkPut(LIST)

      /** Cập nhật meta.last_update riêng cho page */
      const MAX_UPDATE = Date.now()

      await this.meta.put({ key: `last_update_${pageId}`, value: MAX_UPDATE })
    }
  }

  /**
   * 📌 Lấy thời điểm cập nhật cuối cùng của DB cho từng page
   */
  async getLastUpdate(pageId?: string): Promise<number> {
    const KEY = pageId ? `last_update_${pageId}` : 'last_update'

    const META = await this.meta.get(KEY)
    return META?.value || 0
  }

  /**
   * 🔄 updateFromMessage - Cập nhật hội thoại dựa trên message realtime
   * - Nếu chưa có conversation → tạo mới
   * - Nếu mới hơn last_message_time → cập nhật
   * - Tự tăng unread nếu message từ client
   */
  async updateFromMessage(detail: any) {
    /** Tạo id duy nhất cho từng hội thoại từ page_id và client_id */
    const ID = `${detail.fb_page_id}_${detail.fb_client_id}`

    /** Lấy conversation đang có trong DB dựa trên ID */
    const CONV = await this.conversations.get(ID)

    /** LAST_MESSAGE_TIME lấy từ detail, nếu không có thì fallback về thời gian hiện tại */
    const LAST_MESSAGE_TIME = detail.last_message_time || Date.now()

    /**
     * Nếu hội thoại chưa tồn tại → tạo mới
     */
    if (!CONV) {
      /** Thêm mới hội thoại vào DB với các thông tin khởi tạo */
      await this.conversations.put({
        id: ID,
        fb_page_id: detail.fb_page_id,
        fb_client_id: detail.fb_client_id,
        last_message: detail.message_text,
        last_message_time: LAST_MESSAGE_TIME,
        last_message_id: detail._id,
        last_message_type: detail.message_type,
        /** Nếu tin nhắn từ khách hàng thì set unread = 1, ngược lại là 0 */
        unread_message_amount: detail.message_type === 'client' ? 1 : 0,
        last_update: Date.now(),
      })
      /** Kết thúc hàm sau khi tạo mới */
      return
    }

    /**
     * Nếu message mới hơn message đang lưu → update
     */
    /** So sánh thời gian tin nhắn mới với thời gian tin nhắn cuối cùng trong DB */
    if (LAST_MESSAGE_TIME > (CONV.last_message_time || 0)) {
      /** Cập nhật thông tin hội thoại trong DB */
      await this.conversations.update(ID, {
        last_message_time: LAST_MESSAGE_TIME,
        /** Cập nhật nội dung tin nhắn cuối, nếu không có trong detail thì giữ nguyên cũ */
        last_message: detail.message_text || CONV.last_message,
        last_message_id: detail._id,
        last_message_type: detail.message_type,
        unread_message_amount:
          detail.message_type === 'client'
            ? /** Nếu tin nhắn từ khách hàng, tăng số lượng chưa đọc lên 1 */
              (CONV.unread_message_amount || 0) + 1
            : /** Nếu không phải, giữ nguyên số lượng chưa đọc */
              CONV.unread_message_amount,
        last_update: Date.now(),
      })
    }
  }

  /**
   * filter() – Lọc và sắp xếp hội thoại
   * - Giữ nguyên toàn bộ logic filter cũ
   * - Pagination DESC theo last_message_time
   * - Không dùng toCollection() mất sort khi nhiều pageIds
   * - Loadmore chạy chuẩn (cursor < vì DESC)
   * - Tối ưu tốc độ bằng index compound
   */
  async filter(
    filter: any,
    after?: number[], // [last_message_time]
    limit = 50,
    pageIds?: string[]
  ): Promise<{ conversations: ConversationInfo[]; after?: number[] }> {
    /** Kiểm tra xem có phải đang lọc cho duy nhất 1 page không */
    const IS_SINGLE_PAGE = pageIds?.length === 1

    /** Khởi tạo biến collection để xây dựng truy vấn DB */
    let collection: Dexie.Collection<ConversationInfo, string>

    /**
     * 1) BASE SORT — USING INDEX DESC (chỉ theo last_message_time)
     */
    if (IS_SINGLE_PAGE) {
      /** CASE 1 PAGE → SỬ DỤNG INDEX 2 TRƯỜNG: fb_page_id + last_message_time */
      const PAGE_ID = pageIds![0]

      /** Truy vấn sử dụng compound index để tối ưu hiệu năng */
      collection = this.conversations
        .where('[fb_page_id+last_message_time]')
        /** Lọc trong khoảng giá trị của pageId, từ time 0 đến vô cùng */
        .between([PAGE_ID, 0], [PAGE_ID, Infinity], true, true)
        /** Đảo ngược kết quả để có thứ tự giảm dần (DESC) */
        .reverse() /** DESC (time) */
    } else {
      /** CASE NHIỀU PAGE → DÙNG INDEX last_message_time */
      collection = this.conversations
        .where('last_message_time')
        /** Lọc tất cả time từ 0 đến vô cùng */
        .between(0, Infinity, true, true)
        /** Đảo ngược kết quả để có thứ tự giảm dần */
        .reverse()

      /** Nếu có danh sách pageIds, lọc thêm bằng code (không dùng index trực tiếp được) */
      if (pageIds?.length) {
        collection = collection.filter(c => pageIds.includes(c.fb_page_id))
      }
    }

    /**
     * 2) APPLY FILTER LOGIC (KHÔNG THAY ĐỔI)
     */

    if (filter.unread_message === 'true') {
      collection = collection.and(c => (c.unread_message_amount || 0) > 0)
    }

    if (filter.not_response_client === 'true') {
      collection = collection.and(
        c => (c.last_message_type || '').toLowerCase() === 'client'
      )
    }

    if (filter.not_exist_label === 'true') {
      collection = collection.and(c => !c.label_id?.length)
    }

    if (filter.have_phone === 'YES')
      collection = collection.and(c => !!c.client_phone)
    if (filter.have_phone === 'NO')
      collection = collection.and(c => !c.client_phone)

    if (filter.is_spam_fb === 'YES')
      collection = collection.and(c => c.is_spam_fb === true)
    if (filter.is_spam_fb === 'NO')
      collection = collection.and(c => c.is_spam_fb !== true)

    if (filter.conversation_type)
      collection = collection.and(
        c => c.conversation_type === filter.conversation_type
      )

    if (filter.have_client_name)
      collection = collection.and(c => !!c.client_name)

    if (filter.platform_type)
      collection = collection.and(c => c.platform_type === filter.platform_type)

    if (filter.post_id) {
      collection = collection.filter(
        c => !!c.list_fb_post_id?.includes(filter.post_id)
      )
    }

    if (filter.staff_id?.length) {
      collection = collection.and(
        c =>
          filter.staff_id.includes(c.fb_staff_id!) ||
          filter.staff_id.includes(c.user_id!)
      )
    }

    if (filter.time_range?.gte || filter.time_range?.lte) {
      const { gte, lte } = filter.time_range
      collection = collection.and(c => {
        const t = c.last_message_time || 0
        if (gte && t < gte) return false
        if (lte && t > lte) return false
        return true
      })
    }

    /** DISPLAY STYLE */
    if (filter.display_style) {
      switch (filter.display_style) {
        case 'INBOX':
          collection = collection.and((c: any) => !!c.is_have_fb_inbox)
          break
        case 'COMMENT':
          collection = collection.and((c: any) => !!c.is_have_fb_post)
          break
        case 'GROUP':
          collection = collection.and((c: any) => !!c.is_group)
          break
        case 'FRIEND':
          collection = collection.and((c: any) => !c.is_group)
          break
      }
    }

    if (filter.not_have_fb_uid) {
      collection = collection.and(c => !c.client_bio)
    }

    if (filter.have_email === 'YES')
      collection = collection.and(c => !!c.client_email)
    if (filter.have_email === 'NO')
      collection = collection.and(c => !c.client_email)

    /** LABEL AND / OR */
    if (filter.label_id?.length) {
      if (filter.label_and) {
        collection = collection.filter(c =>
          (c.label_id ?? []).every((id: string) => filter.label_id.includes(id))
        )
      } else {
        collection = collection.filter(c =>
          (c.label_id ?? []).some((id: string) => filter.label_id.includes(id))
        )
      }
    }

    if (filter.not_label_id?.length) {
      collection = collection.filter(
        c =>
          !(c.label_id ?? []).some((id: string) =>
            filter.not_label_id.includes(id)
          )
      )
    }

    /** SEARCH */
    if (filter.search) {
      const search = filter.search.toLowerCase().trim()
      if (search) {
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
            .some(v => v!.toString().toLowerCase().includes(search))
        )
      }
    }

    /**
     * 3) PAGINATION DESC — CURSOR FIX (chỉ theo last_message_time)
     */
    /** Nếu có cursor (after) gồm 1 phần tử [time] */
    if (after?.length === 1) {
      /** Giải nén cursor thành prevTime */
      const PREV_TIME = after[0]

      /** Thêm bộ lọc để lấy các bản ghi nằm sau cursor hiện tại */
      collection = collection.and(c => {
        const TIME = c.last_message_time || 0

        /** DESC order → cursor phải dùng "<" (nhỏ hơn cursor cũ) */
        return TIME < PREV_TIME
      })
    }

    /**
     * 4) GET DATA & NEXT CURSOR
     */
    /** Thực thi truy vấn, giới hạn số lượng limit và chuyển về mảng */
    const RESULT = await collection.limit(limit).toArray()

    /** Lấy phần tử cuối cùng của kết quả trả về */
    const LAST = RESULT[RESULT.length - 1]

    /** Tạo cursor cho trang tiếp theo từ phần tử cuối cùng (nếu có) - chỉ dùng last_message_time */
    const NEXT_AFTER = LAST ? [LAST.last_message_time || 0] : undefined

    /** Trả về object chứa danh sách hội thoại và cursor next_after */
    return {
      conversations: RESULT,
      after: NEXT_AFTER,
    }
  }

  /**
   * Đếm số conversation thỏa điều kiện cho một nhóm pageIds
   * ⚡ ĐÃ TỐI ƯU:
   * - Sử dụng compound index [fb_page_id+conversation_type] khi có thể
   * - Gộp tất cả filter vào 1 callback duy nhất
   * - Ưu tiên index lookup trước, filter callback sau
   */
  async countByPageIds(
    page_ids: string[],
    filter: any,
    conversation_type?: 'CHAT' | 'POST'
  ): Promise<number> {
    /** Kiểm tra xem có phải đang lọc cho duy nhất 1 page không */
    const IS_SINGLE_PAGE = page_ids?.length === 1

    /** Khởi tạo biến collection để xây dựng truy vấn DB */
    let collection: Dexie.Collection<ConversationInfo, string>

    /**
     * ⚡ OPTIMIZATION: Sử dụng compound index khi có conversation_type
     * Index [fb_page_id+conversation_type] giúp filter ngay từ level DB
     * → Giảm từ quét 50k records xuống chỉ quét records phù hợp
     */
    if (IS_SINGLE_PAGE && conversation_type) {
      /** CASE 1 PAGE + TYPE → Dùng compound index (NHANH NHẤT) */
      const PAGE_ID = page_ids![0]
      collection = this.conversations
        .where('[fb_page_id+conversation_type]')
        .equals([PAGE_ID, conversation_type])
    } else if (IS_SINGLE_PAGE) {
      /** CASE 1 PAGE → SỬ DỤNG INDEX fb_page_id */
      const PAGE_ID = page_ids![0]
      collection = this.conversations.where('fb_page_id').equals(PAGE_ID)
    } else if (page_ids?.length) {
      /** CASE NHIỀU PAGE → DÙNG anyOf() để tận dụng index */
      collection = this.conversations.where('fb_page_id').anyOf(page_ids)
    } else {
      /** Không có page_ids thì quét toàn bộ */
      collection = this.conversations.toCollection()
    }

    /** Chuẩn bị search text nếu có */
    const SEARCH_TEXT = filter.search
      ? (filter.search as string).toLowerCase().trim()
      : ''

    /**
     * ⚡ GỘP TẤT CẢ FILTER VÀO 1 CALLBACK DUY NHẤT
     * Thay vì gọi 15+ lần .filter() riêng lẻ (mỗi lần tạo 1 iterator mới)
     * → Giảm từ O(n*15) xuống O(n*1)
     */
    collection = collection.filter(c => {
      /** Lọc theo conversation_type nếu có (skip nếu đã dùng compound index) */
      if (
        conversation_type &&
        !IS_SINGLE_PAGE &&
        c.conversation_type !== conversation_type
      )
        return false

      /** Lọc unread */
      if (
        filter.unread_message === 'true' &&
        (c.unread_message_amount || 0) <= 0
      )
        return false

      /** Lọc not_response_client */
      if (
        filter.not_response_client === 'true' &&
        (c.last_message_type || '').toLowerCase() !== 'client'
      )
        return false

      /** Lọc not_exist_label */
      if (filter.not_exist_label === 'true' && c.label_id?.length) return false

      /** Lọc have_phone */
      if (filter.have_phone === 'YES' && !c.client_phone) return false
      if (filter.have_phone === 'NO' && c.client_phone) return false

      /** Lọc is_spam_fb */
      if (filter.is_spam_fb === 'YES' && c.is_spam_fb !== true) return false
      if (filter.is_spam_fb === 'NO' && c.is_spam_fb === true) return false

      /** Lọc have_client_name */
      if (filter.have_client_name && !c.client_name) return false

      /** Lọc display_style */
      if (filter.display_style) {
        const CONV = c as any
        switch (filter.display_style) {
          case 'INBOX':
            if (!CONV.is_have_fb_inbox) return false
            break
          case 'COMMENT':
            if (!CONV.is_have_fb_post) return false
            break
          case 'GROUP':
            if (!CONV.is_group) return false
            break
          case 'FRIEND':
            if (CONV.is_group) return false
            break
        }
      }

      /** Lọc have_email */
      if (filter.have_email === 'YES' && !c.client_email) return false
      if (filter.have_email === 'NO' && c.client_email) return false

      /** Lọc platform_type */
      if (filter.platform_type && c.platform_type !== filter.platform_type)
        return false

      /** Lọc post_id */
      if (filter.post_id && !c.list_fb_post_id?.includes(filter.post_id))
        return false

      /** Lọc staff_id */
      if (filter.staff_id?.length) {
        const HAS_STAFF =
          filter.staff_id.includes(c.fb_staff_id!) ||
          filter.staff_id.includes(c.user_id!)
        if (!HAS_STAFF) return false
      }

      /** Lọc time_range */
      if (filter.time_range?.gte || filter.time_range?.lte) {
        const TIME = c.last_message_time || 0
        if (filter.time_range.gte && TIME < filter.time_range.gte) return false
        if (filter.time_range.lte && TIME > filter.time_range.lte) return false
      }

      /** Lọc label_id (AND hoặc OR) */
      if (filter.label_id?.length) {
        const LABELS = c.label_id ?? []
        if (filter.label_and) {
          /** AND: tất cả label phải có */
          const HAS_ALL = filter.label_id.every((id: string) =>
            LABELS.includes(id)
          )
          if (!HAS_ALL) return false
        } else {
          /** OR: ít nhất 1 label phải có */
          const HAS_SOME = LABELS.some((id: string) =>
            filter.label_id.includes(id)
          )
          if (!HAS_SOME) return false
        }
      }

      /** Lọc not_label_id */
      if (filter.not_label_id?.length) {
        const LABELS = c.label_id ?? []
        const HAS_EXCLUDED = LABELS.some((id: string) =>
          filter.not_label_id.includes(id)
        )
        if (HAS_EXCLUDED) return false
      }

      /** Lọc search */
      if (SEARCH_TEXT) {
        const FIELDS_TO_SEARCH = [
          c.client_name,
          c.client_alias_name,
          c.client_phone,
          c.client_email,
          c.last_message,
          c.fb_client_id,
        ].filter(Boolean)

        const HAS_MATCH = FIELDS_TO_SEARCH.some(v =>
          (v as string).toLowerCase().includes(SEARCH_TEXT)
        )
        if (!HAS_MATCH) return false
      }

      /** Thoả mãn tất cả điều kiện */
      return true
    })

    /** Sử dụng count() trực tiếp thay vì toArray().length để tối ưu hiệu năng */
    return await collection.count()
  }
}

export const db = new ChatDB()
