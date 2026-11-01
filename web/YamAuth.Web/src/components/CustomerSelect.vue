<template>
  <div class="customer-select">
    <el-select
      :model-value="modelValue"
      filterable
      clearable
      :loading="loading"
      :placeholder="t('entity.customer.selectCustomer')"
      :disabled="disabled || (limited && options.length === 0)"
      class="customer-select__input"
      @update:model-value="emit('update:modelValue', $event)"
    >
      <el-option
        v-for="c in options"
        :key="c.id"
        :label="`${c.code} - ${c.name}`"
        :value="c.id"
      />
    </el-select>
    <div v-if="limited && !loading && options.length === 0" class="hint">
      {{ t('entity.customer.noScopeOptions') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCustomerOptions } from '@/composables/useCustomerOptions';

defineProps<{
  modelValue?: number | null;
  disabled?: boolean;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: number | undefined | null] }>();

const { t } = useI18n();
const { options, loading, limited, load } = useCustomerOptions();

onMounted(load);
</script>

<style scoped>
.customer-select {
  width: 100%;
}

.customer-select__input {
  width: 100%;
}

.customer-select .hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-color-warning);
}
</style>
