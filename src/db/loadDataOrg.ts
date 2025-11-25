import { BackupApp } from '@/utils/api/Backup'
// main.ts
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
  const results: LoadOrgResult[] = []

  // Khởi tạo Worker

  const worker = new WorkerClass() // worker kiểu module

  // Lắng nghe progress từ Worker
  worker.onmessage = e => {
    const { orgId, status, count, error } = e.data
    if (onProgress) onProgress({ orgId, status, count, error })
    if (status === 'done' || status === 'error') {
      results.push({ orgId, status, count, error })
    }
  }

  // Tạo danh sách URL cho các org chưa load
  const urls: string[] = []
  for (const org of orgs) {
    const orgId = org.org_id
    const lastUpdate = await db.getLastUpdate(orgId)

    // console.log('d83ed336a663471b92828cbe34e110d2', 'lastUpdate', lastUpdate)
    if (!lastUpdate) {
      // console.log(orgId, 'chua co data, load moi')
      try {
        const backupApi = new BackupApp('app')
        const res = await backupApi.post(
          `backup/get_backup_info?org_id=${orgId}`
        )
        const zipUrl = res?.path_conversation
        if (zipUrl) urls.push(`${$env.host.backup}/backup/${zipUrl}`)
      } catch (err) {
        results.push({ orgId, status: 'error', error: (err as Error).message })
      }
    } else {
      results.push({ orgId, status: 'done' })
    }
  }

  // Nếu có zip nào cần load thì gửi cho Worker
  if (urls.length) worker.postMessage({ type: 'load_zips', urls })

  // Trả về kết quả khi tất cả org đã load xong
  return new Promise(resolve => {
    const interval = setInterval(() => {
      // Nếu tất cả org đều có status -> resolve
      if (results.length >= orgs.length) {
        clearInterval(interval)
        worker.terminate()
        resolve(results)
      }
    }, 200)
  })
}
