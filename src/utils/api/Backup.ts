import { Botx } from '@/utils/api/Botx'

/**gọi API lên server của AI */
class Backup extends Botx {
  constructor(path: string) {
    /** gọi API lên server của chatbot */
    super(`${$env.host.backup}/${path}`)

    /** tự động nạp id tổ chức đang chọn */
    this.initSelectedOrgId()
  }
}

/**gọi API lên module của app */
class BackupApp extends Backup {
  constructor(path: string) {
    /** gọi API lên module của app */
    super(`${path}`)
  }

  /**gọi api post lên AI */
  protected post(path: string, body?: Record<string, any>): Promise<any> {
    return super.post(path)
  }

  public async preloadBackup(org_id: string): Promise<void> {
    // dùng org_id truyền vào luôn, không dùng this.org_id
    return super.post('preload_backup', { org_id })
  }
}
export { BackupApp }
