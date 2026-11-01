import { ref, computed } from 'vue';
import { createCrudApi } from '@/api/crud';

export interface CustomerOption {
  id: number;
  code: string;
  name: string;
}

let cache: CustomerOption[] | null = null;
let loadPromise: Promise<void> | null = null;

export function useCustomerOptions() {
  const options = ref<CustomerOption[]>([]);
  const loading = ref(false);

  // 去权限：不再有数据范围限制
  const limited = computed(() => false);

  async function load() {
    if (cache) {
      options.value = cache;
      return;
    }
    if (loadPromise) {
      await loadPromise;
      options.value = cache ?? [];
      return;
    }
    loading.value = true;
    loadPromise = (async () => {
      const api = createCrudApi<any, any, any, any>('/v1/base/customers');
      const { items } = await api.page({ page: 1, size: 500 });
      cache = items.map((c: { id: number; code: string; name: string }) => ({
        id: c.id,
        code: c.code,
        name: c.name
      }));
      options.value = cache;
    })();
    try {
      await loadPromise;
    } finally {
      loading.value = false;
    }
  }

  /** 新建表单默认客户：仅一个可选客户时自动选中 */
  function defaultCustomerId(): number | undefined {
    if (options.value.length === 1) return options.value[0].id;
    return undefined;
  }

  return { options, loading, limited, load, defaultCustomerId };
}
