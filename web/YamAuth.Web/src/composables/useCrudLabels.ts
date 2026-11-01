import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

/** 标准 CRUD 页常用文案 */
export function useCrudLabels() {
  const { t } = useI18n();

  return {
    t,
    labels: computed(() => ({
      keyword: t('common.keyword'),
      search: t('common.search'),
      reset: t('common.reset'),
      create: t('common.create'),
      edit: t('common.edit'),
      delete: t('common.delete'),
      save: t('common.save'),
      cancel: t('common.cancel'),
      actions: t('common.actions'),
      confirmDelete: t('common.confirmDelete'),
      enabled: t('common.enabled'),
      remark: t('common.remark'),
      saveSuccess: t('message.saveSuccess'),
      deleteSuccess: t('message.deleteSuccess'),
      createTitle: t('common.create'),
      editTitle: t('common.edit')
    }))
  };
}
