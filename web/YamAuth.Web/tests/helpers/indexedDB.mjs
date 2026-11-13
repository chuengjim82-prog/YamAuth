/** 测试替身仅模拟共享 readwrite 队列；真实跨标签页调度另做浏览器验证。 */
export function memoryIndexedDB() {
  let tail = Promise.resolve()
  let created = false
  let queued = 0
  const database = {
    createObjectStore() {},
    close() {},
    transaction() {
      queued += 1
      const previous = tail
      let release
      tail = new Promise((resolve) => (release = resolve))
      const request = {}
      let aborted = false
      const transaction = {
        error: null,
        objectStore: () => ({ get: () => request }),
        abort: () => (aborted = true)
      }
      setImmediate(async () => {
        await previous
        request.onsuccess?.()
        if (aborted) transaction.onabort?.()
        else transaction.oncomplete?.()
        release()
      })
      return transaction
    }
  }
  return {
    get queued() {
      return queued
    },
    factory: {
      open() {
        const request = { result: database }
        setImmediate(() => {
          if (!created) {
            created = true
            request.onupgradeneeded?.()
          }
          request.onsuccess?.()
        })
        return request
      }
    },
    hold() {
      const previous = tail
      let release
      const held = new Promise((resolve) => (release = resolve))
      tail = previous.then(() => held)
      return release
    }
  }
}
