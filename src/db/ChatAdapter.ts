import type {
  ConversationInfo,
  FilterConversation,
} from '@/service/interface/app/conversation'
import { keyBy, orderBy } from 'lodash'

import { db } from './ChatDB'

export class ChatAdapter {
  /** Trạng thái dùng local */
  static use_local = true

  /**
   * Lấy danh sách hội thoại (có phân trang + sort + after)
   * KHÔNG thay đổi field nào
   * KHÔNG thay đổi logic filter cũ
   */
  static async fetchConversations(
    pageIds: string[],
    orgId: string,
    filter: FilterConversation,
    limit = 50,
    sort?: string,
    after?: number[]
  ): Promise<{
    conversation: Record<string, ConversationInfo>
    after?: number[]
  }> {
    console.log(Date.now(), 'fetch conversation db adapter')

    /**
     * ⚡ NEW: db.filter() giờ trả về list theo đúng filter,
     * KHÔNG load toàn bộ 200k record nữa (sẽ sửa bên ChatDB)
     */
    const { conversations: DB_CONVS } = await db.filter(
      filter,
      after,
      limit,
      pageIds
    )

    console.log(Date.now(), 'after db filter')
    /**
     * Nếu DB_CONVS <= limit thì không cần sort lại → trả thẳng
     * (đây là case thường xuyên xảy ra)
     */
    if (DB_CONVS.length <= limit) {
      console.log(Date.now(), 'returning directly from db convs')
      return {
        conversation: keyBy(DB_CONVS, 'id'),
        after:
          DB_CONVS.length > 0
            ? [DB_CONVS[DB_CONVS.length - 1].last_message_time || 0]
            : undefined,
      }
    }
    console.log(Date.now(), 'before sorting list')
    /**
     * ⚡ Nếu nhiều hơn limit → có thể do filter phức tạp,
     * fallback sang sort cũ như nguyên bản (đúng logic gốc)
     */
    let list = orderBy(
      DB_CONVS,
      [
        c => c.unread_message_amount || 0,
        c => c.last_message_time || c.createdAt || 0,
      ],
      ['desc', 'desc']
    )
    console.log(list.length, 'sorted list length')
    console.log(list[0], 'first item in sorted list')
    /** handle pagination */
    let start_index = 0
    console.log(after, 'after value')
    if (after?.length) {
      const lastAfter = after[after.length - 1]
      const idx = list.findIndex(c => (c.last_message_time || 0) === lastAfter)
      if (idx >= 0) start_index = idx + 1
    }
    console.log(start_index, 'start index')
    /** lấy theo limit */
    const SLICE = list.slice(start_index, start_index + limit)
    console.log(Date.now(), 'after slice')
    const NEXT_AFTER = SLICE.length
      ? [SLICE[SLICE.length - 1].last_message_time || 0]
      : undefined
    console.log(Date.now(), 'end fetch conversation db adapter')
    return {
      conversation: keyBy(SLICE, 'id'),
      after: NEXT_AFTER,
    }
  }

  /**
   * Lưu từ ZIP vào DB (giữ nguyên)
   */
  static async saveZipData(data: Record<string, ConversationInfo>) {
    return db.saveMany(data)
  }
}
