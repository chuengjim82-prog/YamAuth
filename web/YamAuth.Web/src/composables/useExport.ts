import { http } from '@/utils/request'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

/**
 * 解析 Content-Disposition 获取文件名
 * 优先取 filename*=UTF-8''...，降级到 filename="..."
 */
function parseFileName(disposition: string): string | null {
  // filename*=UTF-8''%E4%B8%AD%E6%96%87.xlsx
  const starMatch = disposition.match(/filename\*=(?:UTF-8'')?([^;\s]+)/)
  if (starMatch) return decodeURIComponent(starMatch[1])

  // filename="中文.xlsx" 或 filename=file.xlsx
  const nameMatch = disposition.match(/filename=(?:UTF-8'')?"?([^";\s]+)"?/)
  if (nameMatch) return nameMatch[1]

  return null
}

/**
 * 触发浏览器文件下载
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 导出 Excel 文件
 *
 * @example
 * ```ts
 * const { exportExcel } = useExport('/v1/base/customers/export', '客户数据')
 * await exportExcel({ keyword: 'xxx' })
 * ```
 */
export function useExport(apiPath: string, defaultName: string) {
  const { t } = useI18n()

  async function exportExcel(params: Record<string, any> = {}): Promise<void> {
    try {
      const resp = await http.get(apiPath, { params, responseType: 'blob' })
      const blob = resp.data as Blob

      const disposition: string = resp.headers?.['content-disposition'] ?? ''
      const fileName = parseFileName(disposition) ?? `${defaultName}.xlsx`

      triggerDownload(blob, fileName)
      ElMessage.success(t('common.export'))
    } catch {
      ElMessage.error(t('message.operationFailed'))
    }
  }

  return { exportExcel }
}
