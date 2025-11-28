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
  const WORKER = new WorkerClass() /** worker kiểu module */

  /** Lắng nghe progress từ Worker */
  /** Gán hàm xử lý sự kiện onmessage cho worker */
  WORKER.onmessage = e => {
    /** Lấy dữ liệu từ event data */
    const { orgId, status, count, error } = e.data
    /** Nếu có callback onProgress thì gọi nó để báo cáo tiến độ */
    if (onProgress) onProgress({ orgId, status, count, error })
    /** Nếu trạng thái là done hoặc error thì thêm vào mảng kết quả */
    if (status === 'done' || status === 'error') {
      RESULTS.push({ orgId, status, count, error })
    }
  }

  /** Tạo danh sách URL cho các org chưa load */
  const URLS: string[] = []
  /** Duyệt qua từng org trong danh sách đầu vào */
  for (const org of orgs) {
    /** Lấy org_id */
    const ORG_ID = org.org_id
    /** Kiểm tra thời điểm cập nhật cuối cùng trong DB */
    const LAST_UPDATE = await db.getLastUpdate(ORG_ID)

    /** Nếu chưa có dữ liệu (lastUpdate falsy) */
    if (!LAST_UPDATE) {
      try {
        /** Khởi tạo API client để gọi backup */
        const BACKUP_API = new BackupApp('app')
        /** Gọi API lấy thông tin backup cho org_id */
        const RES = await BACKUP_API.post(
          `backup/get_backup_info?org_id=${ORG_ID}`
        )
        /** Lấy đường dẫn file zip từ response */
        const ZIP_URL = RES?.path_conversation
        /** Nếu có đường dẫn zip, thêm vào danh sách URL cần tải */
        if (ZIP_URL) URLS.push(`${$env.host.backup}/backup/${ZIP_URL}`)
      } catch (err) {
        /** Nếu có lỗi khi gọi API, thêm vào kết quả với trạng thái error */
        RESULTS.push({
          orgId: ORG_ID,
          status: 'error',
          error: (err as Error).message,
        })
      }
    } else {
      /** Nếu đã có dữ liệu, đánh dấu là done ngay lập tức */
      RESULTS.push({ orgId: ORG_ID, status: 'done' })
    }
  }

  /** Nếu có zip nào cần load thì gửi cho Worker */
  /** Gửi message 'load_zips' kèm danh sách URL cho worker xử lý */
  if (URLS.length) WORKER.postMessage({ type: 'load_zips', urls: URLS })

  /** Trả về kết quả khi tất cả org đã load xong */
  return new Promise(resolve => {
    /** Tạo interval để kiểm tra định kỳ */
    const interval = setInterval(() => {
      /** Nếu tất cả org đều có status (done hoặc error) -> resolve */
      if (RESULTS.length >= orgs.length) {
        /** Xóa interval */
        clearInterval(interval)
        /** Dừng worker để giải phóng tài nguyên */
        WORKER.terminate()
        /** Trả về kết quả cuối cùng */
        resolve(RESULTS)
      }
    }, 200)
  })
}
