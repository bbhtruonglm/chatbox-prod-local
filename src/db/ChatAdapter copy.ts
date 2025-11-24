import type {
  ConversationInfo,
  FilterConversation,
} from '@/service/interface/app/conversation'
import { keyBy, orderBy } from 'lodash'

import { db } from './ChatDB'

export class ChatAdapter {
  /** Trạng thái dùng biến local */
  static use_local = true

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
    const { conversations: DB_CONVS } = await db.filter(
      filter,
      after,
      limit,
      pageIds
    )

    /** sort với last_message_time || create_at */
    let list = orderBy(
      DB_CONVS,
      [
        c => c.unread_message_amount || 0,
        c => c.last_message_time || c.createdAt || 0,
      ],
      ['desc', 'desc']
    )

    /** handle pagination */
    let start_index = 0
    /** Nếu có giá trị after */
    if (after?.length) {
      const lastAfter = after[after.length - 1] // chỉ lấy phần tử cuối
      const IDX = list.findIndex(c => (c.last_message_time || 0) === lastAfter)
      if (IDX >= 0) start_index = IDX + 1
    }

    /** Căt list từ index -> tới index + limit */
    const SLICE = list.slice(start_index, start_index + limit)
    /** Trả lại giá trị after để call lại lần sau - hoặc là undefined */
    const NEXT_AFTER = SLICE.length
      ? [SLICE[SLICE.length - 1].last_message_time || 0]
      : undefined

    /** Trả về conversation và after */
    return { conversation: keyBy(SLICE, 'id'), after: NEXT_AFTER }
  }

  /** Lưu Hàm xử lý Lưu zip data */
  static async saveZipData(data: Record<string, ConversationInfo>) {
    return db.saveMany(data)
  }
}
