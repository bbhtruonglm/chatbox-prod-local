import { BackupApp } from '@/utils/api/Backup'
/** main.ts */
import WorkerClass from './zip.worker.ts?worker'
import { db } from './ChatDB'

interface LoadOrgResult {
  orgId: string
  status: 'done' | 'error'
  count?: number
  error?: string
}

export async function loadOrgData(
  orgs: { org_id: string }[],
  onProgress?: (msg: {
    orgId: string
    status: string
    count?: number
    error?: string
  }) => void
): Promise<LoadOrgResult[]> {
  /** Khởi tạo mảng kết quả rỗng */
  const RESULTS: LoadOrgResult[] = []

  /** Khởi tạo Worker */
  /** Tạo instance của WorkerClass để xử lý background task */
  const WORKER = new WorkerClass()

  /** Lắng nghe progress từ Worker */
  WORKER.onmessage = async e => {
    /** Lấy dữ liệu từ event data */
    const { orgId, status, count, error } = e.data
    /** Nếu có callback onProgress thì gọi nó để báo cáo tiến độ */
    if (onProgress) onProgress({ orgId, status, count, error })
    /** Nếu trạng thái là done hoặc error thì thêm vào mảng kết quả */
    if (status === 'done' || status === 'error') {
      /** Xóa batch_index khi worker hoàn thành */
      await db.meta.delete(`batch_index_${orgId}`)
      RESULTS.push({ orgId, status, count, error })
    }
  }

  /**
   * Hàm xử lý iterate orgs
   * Fetch info -> Gửi worker ngay (Pipeline)
   * Giúp resume tốt hơn so với fetch all -> send all
   */
  const Process = async () => {
    console.log(orgs, 'orgs')
    /** Duyệt qua từng org trong danh sách đầu vào */
    for (const org of orgs) {
      /** Lấy org_id */
      const ORG_ID = org.org_id
      /** Kiểm tra thời điểm cập nhật cuối cùng trong DB */
      const LAST_UPDATE = await db.getLastUpdate(ORG_ID)

      /** Lấy batch_index hiện tại (nếu có fetch dở dang) */
      const BATCH_KEY = `batch_index_${ORG_ID}`
      const META_BATCH = await db.meta.get(BATCH_KEY)
      const BATCH_INDEX = META_BATCH?.value || 0

      /** Nếu chưa có dữ liệu (lastUpdate falsy) hoặc đang fetch dở (BATCH_INDEX > 0) */
      if (!LAST_UPDATE || BATCH_INDEX > 0) {
        try {
          /** Đánh dấu đang xử lý bằng cách lưu batch_index (nếu chưa có) */
          if (BATCH_INDEX === 0) {
            await db.meta.put({ key: BATCH_KEY, value: 1 })
          }

          /** Khởi tạo API client để gọi backup */
          const BACKUP_API = new BackupApp('app')

          /** Gọi API lấy thông tin backup cho org_id (không truyền batch_index) */
          const RES = await BACKUP_API.post(
            `backup/get_backup_info?org_id=${ORG_ID}`
          )

          /** Lấy đường dẫn file zip từ response */
          const ZIP_URL = RES?.path_conversation

          if (ZIP_URL) {
            /** Nếu có đường dẫn zip, gửi NGAY cho worker (để worker download và xử lý song song) */
            // Note: Worker xử lý concurrently các message này
            const FULL_URL = `${$env.host.backup}/backup/${ZIP_URL}`
            WORKER.postMessage({ type: 'load_zips', urls: [FULL_URL] })

            // Note: KHÔNG push RESULTS ở đây, đợi worker báo done
          } else {
            /** Trường hợp không có backup (ví dụ org mới tinh, chưa có data) */
            /** Mark done trong DB để lần sau k check lại */
            await db.meta.put({
              key: `last_update_${ORG_ID}`,
              value: Date.now(),
            })
            /** Xóa batch_index vì đã hoàn tất */
            await db.meta.delete(BATCH_KEY)

            /** Push kết quả done */
            RESULTS.push({ orgId: ORG_ID, status: 'done', count: 0 })
          }
        } catch (err) {
          /** Gặp lỗi coi như không có backup -> Mark done luôn để lần sau không check lại */
          await db.meta.put({
            key: `last_update_${ORG_ID}`,
            value: Date.now(),
          })
          await db.meta.delete(BATCH_KEY)

          /** Push kết quả done (kèm error message để debug) */
          RESULTS.push({
            orgId: ORG_ID,
            status: 'done',
            count: 0,
            error: (err as Error).message,
          })
        }
      } else {
        /** Nếu đã có dữ liệu, đánh dấu là done ngay lập tức */
        RESULTS.push({ orgId: ORG_ID, status: 'done' })
      }
    }
  }

  /** Bắt đầu process */
  Process().catch(err => {
    console.error('Error in loadOrgData process loop', err)
  })

  /** Trả về kết quả khi tất cả org đã load xong */
  return new Promise(resolve => {
    /** Tạo interval để kiểm tra định kỳ */
    const INTERVAL = setInterval(() => {
      /** Nếu tất cả org đều có status (done hoặc error) -> resolve */
      if (RESULTS.length >= orgs.length) {
        /** Xóa interval */
        clearInterval(INTERVAL)
        /** Dừng worker để giải phóng tài nguyên */
        WORKER.terminate()
        /** Trả về kết quả cuối cùng */
        resolve(RESULTS)
      }
    }, 200)
  })
}
