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
     * 📌 Định nghĩa schema DB version 1
     * - conversations: index `id` & các trường quan trọng để query/filter
     * - meta: chỉ có key (primary key)
     */

    this.version(3).stores({
      conversations: `
    id,
    fb_page_id,
    unread_message_amount,
    last_message_time,
    [unread_message_amount+last_message_time],
    [fb_page_id+unread_message_amount+last_message_time]
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
   * filter() – BẢN FIX CHUẨN NHẤT
   * - Giữ nguyên toàn bộ logic filter cũ
   * - Pagination DESC theo unread + last_message_time
   * - Không dùng toCollection() mất sort khi nhiều pageIds
   * - Loadmore chạy chuẩn (cursor < vì DESC)
   * - Tối ưu tốc độ bằng index compound
   */
  async filter(
    filter: any,
    after?: number[], // [unread, last_message_time]
    limit = 50,
    pageIds?: string[]
  ): Promise<{ conversations: ConversationInfo[]; after?: number[] }> {
    /** Kiểm tra xem có phải đang lọc cho duy nhất 1 page không */
    const IS_SINGLE_PAGE = pageIds?.length === 1

    /** Khởi tạo biến collection để xây dựng truy vấn DB */
    let collection: Dexie.Collection<ConversationInfo, string>

    /**
     * 1) BASE SORT — USING INDEX DESC
     */
    if (IS_SINGLE_PAGE) {
      /** CASE 1 PAGE → SỬ DỤNG INDEX 3 TRƯỜNG: fb_page_id + unread + time */
      const PAGE_ID = pageIds![0]

      /** Truy vấn sử dụng compound index để tối ưu hiệu năng */
      collection = this.conversations
        .where('[fb_page_id+unread_message_amount+last_message_time]')
        /** Lọc trong khoảng giá trị của pageId, từ unread/time 0 đến vô cùng */
        .between([PAGE_ID, 0, 0], [PAGE_ID, Infinity, Infinity], true, true)
        /** Đảo ngược kết quả để có thứ tự giảm dần (DESC) */
        .reverse() /** DESC (unread, time) */
    } else {
      /** CASE NHIỀU PAGE → DÙNG INDEX 2 TRƯỜNG: unread + time (vẫn được sort) */
      collection = this.conversations
        .where('[unread_message_amount+last_message_time]')
        /** Lọc tất cả unread/time từ 0 đến vô cùng */
        .between([0, 0], [Infinity, Infinity])
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
     * 3) PAGINATION DESC — CURSOR FIX
     */
    /** Nếu có cursor (after) gồm 2 phần tử [unread, time] */
    if (after?.length === 2) {
      /** Giải nén cursor thành prevUnread và prevTime */
      const [prevUnread, prevTime] = after

      /** Thêm bộ lọc để lấy các bản ghi nằm sau cursor hiện tại */
      collection = collection.and(c => {
        const u = c.unread_message_amount || 0
        const t = c.last_message_time || 0

        /** DESC order → cursor phải dùng "<" (nhỏ hơn cursor cũ) */
        /** Logic: unread nhỏ hơn HOẶC unread bằng nhưng time nhỏ hơn */
        return u < prevUnread || (u === prevUnread && t < prevTime)
      })
    }

    /**
     * 4) GET DATA & NEXT CURSOR
     */
    /** Thực thi truy vấn, giới hạn số lượng limit và chuyển về mảng */
    const RESULT = await collection.limit(limit).toArray()

    /** Lấy phần tử cuối cùng của kết quả trả về */
    const LAST = RESULT[RESULT.length - 1]

    /** Tạo cursor cho trang tiếp theo từ phần tử cuối cùng (nếu có) */
    const NEXT_AFTER = LAST
      ? [LAST.unread_message_amount || 0, LAST.last_message_time || 0]
      : undefined

    /** Trả về object chứa danh sách hội thoại và cursor next_after */
    return {
      conversations: RESULT,
      after: NEXT_AFTER,
    }
  }

  /**
   * Đếm số conversation thỏa điều kiện cho một nhóm pageIds
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

    if (IS_SINGLE_PAGE) {
      /** CASE 1 PAGE → SỬ DỤNG INDEX fb_page_id */
      const PAGE_ID = page_ids![0]
      collection = this.conversations.where('fb_page_id').equals(PAGE_ID)
    } else {
      /** CASE NHIỀU PAGE → QUÉT TOÀN BỘ RỒI LỌC */
      collection = this.conversations.toCollection()
      if (page_ids?.length) {
        collection = collection.filter(c => page_ids.includes(c.fb_page_id))
      }
    }

    /** Lọc theo conversation_type nếu có */
    if (conversation_type) {
      collection = collection.filter(
        c => c.conversation_type === conversation_type
      )
    }

    /** Các filter giống logic filter() */
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

    if (filter.have_client_name)
      collection = collection.filter(c => !!c.client_name)

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

    if (filter.have_email === 'YES')
      collection = collection.filter(c => !!c.client_email)
    if (filter.have_email === 'NO')
      collection = collection.filter(c => !c.client_email)

    if (filter.platform_type)
      collection = collection.filter(
        c => c.platform_type === filter.platform_type
      )

    if (filter.post_id)
      collection = collection.filter(
        c => !!c.list_fb_post_id?.includes(filter.post_id)
      )

    if (filter.staff_id?.length) {
      collection = collection.filter(
        c =>
          filter.staff_id.includes(c.fb_staff_id!) ||
          filter.staff_id.includes(c.user_id!)
      )
    }

    if (filter.time_range?.gte || filter.time_range?.lte) {
      const { gte, lte } = filter.time_range
      collection = collection.filter(c => {
        const time = c.last_message_time || 0
        if (gte && time < gte) return false
        if (lte && time > lte) return false
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

    if (filter.not_label_id?.length)
      collection = collection.filter(
        c =>
          !(c.label_id ?? []).some((id: string) =>
            filter.not_label_id.includes(id)
          )
      )

    if (filter.search) {
      const search_text = (filter.search as string).toLowerCase()
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
          .some(v => (v as string).toLowerCase().includes(search_text))
      )
    }

    /** Sử dụng count() trực tiếp thay vì toArray().length để tối ưu hiệu năng */
    return await collection.count()
  }
}

export const db = new ChatDB()
