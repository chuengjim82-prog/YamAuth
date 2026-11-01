import { http } from '@/utils/request'
import { ElMessage } from 'element-plus'

export interface ImportResult {
  successCount: number
  failCount: number
  errors: string[]
}

/**
 * 导入 Excel 文件
 *
 * @example
 * ```ts
 * const { importFile } = useImport('/v1/base/customers/import')
 * const result = await importFile(file)
 * if (result) load() // 刷新列表
 * ```
 */
export function useImport(apiPath: string) {
  async function importFile(file: File): Promise<ImportResult | null> {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const result = (await http.post(apiPath, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })) as unknown as ImportResult

      if (result.failCount > 0) {
        const msg = `导入完成：成功 ${result.successCount} 条，失败 ${result.failCount} 条`
        if (result.errors.length > 0) {
          ElMessage.warning({ message: msg, duration: 5000 })
          console.warn('[导入错误详情]', result.errors.join('\n'))
        } else {
          ElMessage.warning(msg)
        }
      } else {
        ElMessage.success(`成功导入 ${result.successCount} 条记录`)
      }

      return result
    } catch {
      ElMessage.error('导入失败')
      return null
    }
  }

  return { importFile }
}
