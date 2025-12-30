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
   * Sắp xếp theo last_message_time (mới nhất lên trước)
   */
  static async fetchConversations(
    page_ids: string[],
    org_id: string,
    filter: FilterConversation,
    limit = 50,
    sort?: string,
    after?: number[]
  ): Promise<{
    conversation: Record<string, ConversationInfo>
    after?: number[]
  }> {
    /** 1) Gọi hàm filter của DB để lấy danh sách hội thoại thỏa mãn điều kiện lọc */
    const { conversations: DB_CONVS } = await db.filter(
      filter,
      after,
      limit,
      page_ids
    )

    /** 2) Kiểm tra nếu số lượng kết quả trả về nhỏ hơn hoặc bằng giới hạn limit */
    if (DB_CONVS.length <= limit) {
      /** Lấy phần tử cuối cùng trong danh sách để làm cursor cho lần load sau */
      const LAST = DB_CONVS[DB_CONVS.length - 1]

      /** Trả về kết quả ngay lập tức vì không cần sort lại hay cắt bớt */
      return {
        /** Chuyển đổi mảng hội thoại thành object map theo ID */
        conversation: Object.fromEntries(
          DB_CONVS.map(c => [c.id, c] as [string, ConversationInfo])
        ),
        /** Tạo cursor next_after từ phần tử cuối cùng nếu có (chỉ dùng last_message_time) */
        after: LAST ? [LAST.last_message_time || 0] : undefined,
      }
    }

    /** 3) Fallback sort: Sắp xếp theo last_message_time giảm dần (mới nhất lên trước) */
    const LIST = DB_CONVS.slice().sort((a, b) => {
      /** Lấy thời gian tin nhắn cuối của a, nếu không có thì dùng createdAt */
      const TIME_A =
        a.last_message_time ||
        (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      /** Lấy thời gian tin nhắn cuối của b, nếu không có thì dùng createdAt */
      const TIME_B =
        b.last_message_time ||
        (b.createdAt ? new Date(b.createdAt).getTime() : 0)

      /** Sắp xếp theo thời gian giảm dần (mới nhất lên trước) */
      return TIME_B - TIME_A
    })

    /** 4) Tìm vị trí bắt đầu (start_index) bằng thuật toán tìm kiếm nhị phân dựa trên cursor */
    let start_index = 0
    /** Nếu có cursor (after) gồm 1 phần tử [time] */
    if (after?.length === 1) {
      /** Gọi hàm binarySearchByTime để tìm index phù hợp trong danh sách đã sort */
      start_index = ChatAdapter.binarySearchByTime(LIST, after[0])
    }

    /** 5) Cắt danh sách từ vị trí start_index với độ dài limit */
    const SLICE = LIST.slice(start_index, start_index + limit)

    /** Lấy phần tử cuối cùng của danh sách đã cắt để làm cursor mới */
    const LAST = SLICE[SLICE.length - 1]

    /** Tạo cursor next_after từ phần tử cuối cùng nếu tồn tại (chỉ dùng last_message_time) */
    const NEXT_AFTER = LAST ? [LAST.last_message_time || 0] : undefined

    /** Trả về object chứa map conversation và cursor after */
    return {
      conversation: Object.fromEntries(
        SLICE.map(c => [c.id, c] as [string, ConversationInfo])
      ),
      after: NEXT_AFTER,
    }
  }

  /**
   * Lưu từ ZIP vào DB
   */
  static async saveZipData(data: Record<string, ConversationInfo>) {
    return db.saveMany(data)
  }

  /**
   * Binary search theo last_message_time DESC
   * Trả index chèn (start_index) cho loadmore
   */
  private static binarySearchByTime(
    list: ConversationInfo[],
    cursor_time: number
  ) {
    /** Khởi tạo chỉ số đầu (low) */
    let low = 0
    /** Khởi tạo chỉ số cuối (high) */
    let high = list.length - 1

    /** Vòng lặp tìm kiếm nhị phân: chạy khi low <= high */
    while (low <= high) {
      /** Tính chỉ số giữa (mid) */
      const MID = (low + high) >>> 1
      /** Lấy thời gian tin nhắn cuối tại vị trí mid */
      const MID_TIME = list[MID].last_message_time || 0

      /** Nếu tìm thấy phần tử trùng khớp hoàn toàn với cursor */
      if (MID_TIME === cursor_time) {
        /** Trả về vị trí ngay sau nó (để bắt đầu load trang tiếp theo) */
        return MID + 1
      }

      /** DESC order: so sánh để quyết định tìm bên trái hay bên phải */
      /** Nếu mid lớn hơn cursor time */
      if (MID_TIME > cursor_time) {
        /** Giá trị cần tìm nằm ở phía sau (bên phải), tăng low */
        low = MID + 1
      } else {
        /** Giá trị cần tìm nằm ở phía trước (bên trái), giảm high */
        high = MID - 1
      }
    }

    /** Trả về vị trí chèn phù hợp nếu không tìm thấy khớp chính xác */
    return low
  }
}
