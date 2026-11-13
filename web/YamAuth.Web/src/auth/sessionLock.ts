/** 回调必须同步完成；所有会话写入共用同一个跨标签页事务队列。 */
export type SessionLock = <T>(work: () => T) => Promise<T>

const DATABASE = 'yamauth-session-lock:v1'
const STORE = 'mutex'

// IDBOpenDBRequest 的 result 在 DOM 声明中继承了宽类型，open 成功时固定为数据库连接。
interface DatabaseOpenRequest extends IDBOpenDBRequest {
  readonly result: IDBDatabase
}

export function createSessionLock(getFactory: () => IDBFactory): SessionLock {
  let opening: Promise<IDBDatabase> | undefined

  function openDatabase() {
    opening ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request: DatabaseOpenRequest = getFactory().open(DATABASE, 1)
      let failed = false
      const fail = () => {
        failed = true
        reject(request.error ?? new Error('无法打开会话同步存储'))
      }
      request.onupgradeneeded = () => {
        const database: IDBDatabase = request.result
        database.createObjectStore(STORE)
      }
      request.onerror = fail
      request.onblocked = () => {
        failed = true
        reject(new Error('会话同步存储被其他页面占用，请刷新页面后重试'))
      }
      request.onsuccess = () => {
        const database: IDBDatabase = request.result
        if (failed) {
          database.close()
          return
        }
        database.onversionchange = () => {
          database.close()
          opening = undefined
        }
        resolve(database)
      }
    }).catch((error: unknown) => {
      opening = undefined
      throw error
    })
    return opening
  }

  return async <T>(work: () => T) => {
    const database = await openDatabase()
    return new Promise<T>((resolve, reject) => {
      // 同一 object store 的 readwrite 事务跨连接串行调度，HTTP 环境也可使用。
      const transaction = database.transaction(STORE, 'readwrite')
      const request = transaction.objectStore(STORE).get('session')
      let outcome: { value: T } | undefined
      let failure: { error: Error } | undefined
      request.onsuccess = () => {
        try {
          outcome = { value: work() }
        } catch (error: unknown) {
          failure = {
            error: error instanceof Error ? error : new Error('会话同步失败', { cause: error })
          }
          transaction.abort()
        }
      }
      const settle = () => {
        // localStorage 写入不能随 IDB 回滚；回调完成后以其真实结果为准。
        if (outcome) resolve(outcome.value)
        else reject(failure?.error ?? transaction.error ?? new Error('会话同步失败'))
      }
      transaction.oncomplete = settle
      transaction.onabort = settle
    })
  }
}

export const withSessionLock = createSessionLock(() => indexedDB)
