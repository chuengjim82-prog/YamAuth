<template>
  <div class="auth-page" data-testid="login-page">
    <el-card class="auth-card" shadow="never">
      <h2>{{ t('auth.loginTitle') }}</h2>
      <el-form :model="form" ref="formRef" :rules="rules" label-width="120px" class="auth-form">
        <el-form-item :label="t('auth.loginAccount')" prop="userName">
          <el-input v-model="form.userName" autocomplete="username" :placeholder="t('auth.loginAccountPlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('auth.password')" prop="password"><el-input v-model="form.password" type="password" @keyup.enter="onSubmit" /></el-form-item>
        <el-form-item>
          <el-button type="primary" data-testid="login-submit" :loading="loading" @click="onSubmit" style="width:100%">{{ t('auth.login') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { login, fetchMenuTree } from '@/api/auth';
import { useUserStore } from '@/stores/user';
import { useMenuStore } from '@/stores/menu';
import { loadDynamicRoutes } from '@/router/dynamic';
import { localizeMenuTree } from '@/utils/menuI18n';
import router from '@/router';

const { t } = useI18n();
const form = reactive({ userName: 'admin', password: 'Admin@123' });
const rules = computed<FormRules>(() => ({
  userName: [{ required: true, message: t('auth.enterLoginAccount') }],
  password: [{ required: true, message: t('auth.enterPassword') }]
}));
const formRef = ref<FormInstance>();
const loading = ref(false);
const userStore = useUserStore();
const menuStore = useMenuStore();
const r = useRouter();

async function onSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate();
  loading.value = true;
  try {
    const data = await login(form.userName, form.password);
    userStore.setLogin(data);
    const tree = localizeMenuTree(await fetchMenuTree());
    menuStore.setTree(tree);
    loadDynamicRoutes(router, tree);
    r.push('/home');
  } finally {
    loading.value = false;
  }
}
</script>

