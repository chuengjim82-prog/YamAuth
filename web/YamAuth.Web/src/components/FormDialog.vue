<template>
  <el-dialog v-model="visible" :title="title" width="560px" @close="$emit('update:modelValue', false)">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
      <slot :form="form" />
    </el-form>
    <template #footer>
      <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="loading" @click="onConfirm">{{ t('common.save') }}</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { ref, watch, reactive } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps<{
  modelValue: boolean;
  title: string;
  initial: Record<string, any>;
  rules?: Record<string, any>;
}>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void; (e: 'submit', form: any): Promise<void> | void }>();
const visible = ref(props.modelValue);
const form = reactive({ ...props.initial });
const formRef = ref();
const loading = ref(false);

watch(() => props.modelValue, v => visible.value = v);
watch(() => props.initial, v => Object.assign(form, v));

async function onConfirm() {
  await formRef.value.validate();
  loading.value = true;
  try {
    await emit('submit', form);
    visible.value = false;
    emit('update:modelValue', false);
  } finally { loading.value = false; }
}
</script>
