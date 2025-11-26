// import type {
//   ConversationInfo,
//   FilterConversation,
// } from '@/service/interface/app/conversation'

// import { db } from './ChatDB'

// export class ChatAdapter {
//   /** Trạng thái dùng local */
//   static use_local = true

//   /**
//    * Lấy danh sách hội thoại (có phân trang + sort + after)
//    * KHÔNG thay đổi field nào
//    * KHÔNG thay đổi logic filter cũ
//    */
//   static async fetchConversations(
//     pageIds: string[],
//     orgId: string,
//     filter: FilterConversation,
//     limit = 50,
//     sort?: string,
//     after?: number[]
//   ): Promise<{
//     conversation: Record<string, ConversationInfo>
//     after?: number[]
//   }> {
//     console.log(Date.now(), 'fetch conversation db adapter')

//     // 1) Lấy từ DB (đã lọc + sort chính xác từ ChatDB.filter)
//     const { conversations: DB_CONVS } = await db.filter(
//       filter,
//       after,
//       limit,
//       pageIds
//     )

//     console.log(Date.now(), 'after db filter')

//     // 2) Nếu số lượng ≤ limit ⇒ trả thẳng (case 99%)
//     if (DB_CONVS.length <= limit) {
//       console.log(Date.now(), 'return directly')

//       const last = DB_CONVS[DB_CONVS.length - 1]

//       return {
//         conversation: Object.fromEntries(DB_CONVS.map(c => [c.id, c])),
//         after: last ? [last.last_message_time || 0] : undefined,
//       }
//     }

//     console.log(Date.now(), 'fallback sort start')

//     // 3) Fallback sort: dùng sort thuần nhanh hơn lodash rất nhiều
//     const list = DB_CONVS.slice().sort((a, b) => {
//       const ua = a.unread_message_amount || 0
//       const ub = b.unread_message_amount || 0
//       if (ua !== ub) return ub - ua

//       const ta = a.last_message_time || a.createdAt || 0
//       const tb = b.last_message_time || b.createdAt || 0
//       return tb - ta
//     })

//     console.log(list.length, 'sorted list length')
//     console.log(list[0], 'first item')

//     // 4) Tìm start_index bằng binary search (O(log n))
//     let start_index = 0
//     console.log(after, 'after value')

//     if (after?.length) {
//       const lastAfter = after[after.length - 1]
//       start_index = ChatAdapter.binarySearchByTime(list, lastAfter)
//     }

//     console.log(start_index, 'start index')

//     // 5) Slice theo limit
//     const SLICE = list.slice(start_index, start_index + limit)

//     console.log(Date.now(), 'after slice')

//     const last = SLICE[SLICE.length - 1]
//     const NEXT_AFTER = last ? [last.last_message_time || 0] : undefined

//     console.log(Date.now(), 'end fetch conversation db adapter')

//     return {
//       conversation: Object.fromEntries(SLICE.map(c => [c.id, c])),
//       after: NEXT_AFTER,
//     }
//   }

//   /**
//    * Lưu từ ZIP vào DB (giữ nguyên)
//    */
//   static async saveZipData(data: Record<string, ConversationInfo>) {
//     return db.saveMany(data)
//   }

//   /**
//    * Binary search để tìm index của after theo last_message_time 
//    * Nếu không thấy → trả vị trí chèn (chuẩn loadmore)
//    */
//   private static binarySearchByTime(list: ConversationInfo[], time: number) {
//     let low = 0
//     let high = list.length - 1

//     while (low <= high) {
//       const mid = (low + high) >>> 1
//       const midTime = list[mid].last_message_time || 0

//       if (midTime === time) return mid + 1
//       if (midTime > time) low = mid + 1
//       else high = mid - 1
//     }

//     return low
//   }
// }


import type {
  ConversationInfo,
  FilterConversation,
} from '@/service/interface/app/conversation'

import { db } from './ChatDB'

export class ChatAdapter {
  /** Trạng thái dùng local */
  static use_local = true

  /**
   * Lấy danh sách hội thoại (có phân trang + sort + after)
   * KHÔNG thay đổi field nào
   * Sử dụng cursor 2-field [unread_message_amount, last_message_time]
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

    // 1) Lấy từ DB (đã lọc + sort chính xác từ ChatDB.filter)
    const { conversations: DB_CONVS } = await db.filter(
      filter,
      after,
      limit,
      pageIds
    )

    console.log(Date.now(), 'after db filter')

    // 2) Nếu số lượng ≤ limit ⇒ trả thẳng (case phổ biến)
    if (DB_CONVS.length <= limit) {
      const last = DB_CONVS[DB_CONVS.length - 1]
      return {
        conversation: Object.fromEntries(DB_CONVS.map(c => [c.id, c])),
        after: last
          ? [last.unread_message_amount || 0, last.last_message_time || 0]
          : undefined,
      }
    }

    console.log(Date.now(), 'fallback sort start')

    // 3) Fallback sort: native sort nhanh, DESC [unread, time]
    const list = DB_CONVS.slice().sort((a, b) => {
      const ua = a.unread_message_amount || 0
      const ub = b.unread_message_amount || 0
      if (ua !== ub) return ub - ua

      const ta = a.last_message_time || a.createdAt || 0
      const tb = b.last_message_time || b.createdAt || 0
      return tb - ta
    })

    console.log(list.length, 'sorted list length')
    console.log(list[0], 'first item')

    // 4) Tìm start_index bằng binary search cursor 2-field
    let start_index = 0
    if (after?.length === 2) {
      start_index = ChatAdapter.binarySearchByCursor(list, after)
    }

    console.log(start_index, 'start index')

    // 5) Slice theo limit
    const SLICE = list.slice(start_index, start_index + limit)

    const last = SLICE[SLICE.length - 1]
    const NEXT_AFTER = last
      ? [last.unread_message_amount || 0, last.last_message_time || 0]
      : undefined

    return {
      conversation: Object.fromEntries(SLICE.map(c => [c.id, c])),
      after: NEXT_AFTER,
    }
  }

  /**
   * Lưu từ ZIP vào DB (giữ nguyên)
   */
  static async saveZipData(data: Record<string, ConversationInfo>) {
    return db.saveMany(data)
  }

  /**
   * Binary search theo cursor [unread, last_message_time] DESC
   * Trả index chèn (start_index) cho loadmore
   */
  private static binarySearchByCursor(
    list: ConversationInfo[],
    cursor: [number, number]
  ) {
    const [cUnread, cTime] = cursor
    let low = 0
    let high = list.length - 1

    while (low <= high) {
      const mid = (low + high) >>> 1
      const midUnread = list[mid].unread_message_amount || 0
      const midTime = list[mid].last_message_time || 0

      if (midUnread === cUnread && midTime === cTime) {
        return mid + 1
      }

      // DESC order: nếu mid lớn hơn cursor → qua bên phải
      if (midUnread > cUnread || (midUnread === cUnread && midTime > cTime)) {
        low = mid + 1
      } else {
        high = mid - 1
      }
    }

    return low
  }
}
