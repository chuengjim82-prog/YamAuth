import { computed } from 'vue';
import { useLocaleStore } from '@/stores/locale';

/** 按当前 UI 语言在 cnName / enName 等双语字段间选择展示值 */
export function useLocalizedField() {
  const localeStore = useLocaleStore();
  const preferChinese = computed(() => localeStore.locale.startsWith('zh'));

  function pickLocalizedName(row: { cnName?: string; enName?: string }): string {
    const cn = row.cnName?.trim() ?? '';
    const en = row.enName?.trim() ?? '';
    if (preferChinese.value) return cn || en;
    return en || cn;
  }

  return { preferChinese, pickLocalizedName };
}
