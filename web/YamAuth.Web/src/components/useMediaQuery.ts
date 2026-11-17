import { useMemo, useSyncExternalStore } from 'react'

export default function useMediaQuery(query: string) {
  const source = useMemo(() => {
    const media = window.matchMedia(query)
    return {
      subscribe: (listener: () => void) => {
        media.addEventListener('change', listener)
        return () => media.removeEventListener('change', listener)
      },
      getSnapshot: () => media.matches
    }
  }, [query])
  return useSyncExternalStore(source.subscribe, source.getSnapshot)
}
