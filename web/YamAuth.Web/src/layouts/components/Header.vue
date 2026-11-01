<template>
  <div class="layout-navbars-top">
    <div class="layout-navbars-top-left">
      <el-button
        class="header-icon-btn"
        text
        :title="collapsed ? t('layout.expandSidebar') : t('layout.collapseSidebar')"
        :aria-label="collapsed ? t('layout.expandSidebar') : t('layout.collapseSidebar')"
        @click="$emit('update:collapsed', !collapsed)"
      >
        <el-icon><Expand v-if="collapsed" /><Fold v-else /></el-icon>
      </el-button>
      <Breadcrumb compact />
    </div>
    <div class="layout-navbars-top-right">
      <el-dropdown trigger="click" @command="onLocaleChange">
        <span class="locale-trigger">
          <el-icon><Operation /></el-icon>
          <span>{{ currentLocaleLabel }}</span>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="loc in supportedLocales"
              :key="loc.code"
              :command="loc.code"
              :disabled="loc.code === localeStore.locale"
            >
              {{ loc.label }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-dropdown @command="onCommand">
        <span class="user-trigger">
          <el-avatar :size="28">{{ initial }}</el-avatar>
          <span>{{ nickName }}</span>
          <el-icon><CaretBottom /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="changePwd">{{ t('layout.changePassword') }}</el-dropdown-item>
            <el-dropdown-item command="logout" divided>{{ t('layout.logout') }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <el-dialog
      v-model="pwdVisible"
      :title="t('layout.changePasswordTitle')"
      width="440px"
      destroy-on-close
      @closed="resetPwdForm">
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="100px">
        <el-form-item :label="t('layout.oldPassword')" prop="oldPassword">
          <el-input
            v-model="pwdForm.oldPassword"
            type="password"
            show-password
            autocomplete="current-password" />
        </el-form-item>
        <el-form-item :label="t('layout.newPassword')" prop="newPassword">
          <el-input
            v-model="pwdForm.newPassword"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="t('auth.passwordPlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('auth.confirmPassword')" prop="confirmPassword">
          <el-input
            v-model="pwdForm.confirmPassword"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="t('auth.confirmNewPasswordPlaceholder')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="pwdSubmitting" @click="submitPwd">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { CaretBottom, Fold, Expand, Operation } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { useMenuStore } from '@/stores/menu';
import { useLocaleStore } from '@/stores/locale';
import { changePassword } from '@/api/auth';
import { resetDynamicRoutes } from '@/router/dynamic';
import { supportedLocales } from '@/i18n/supportedLocales';
import { switchLocale } from '@/composables/useLocaleSwitch';
import Breadcrumb from './Breadcrumb.vue';

defineProps<{ collapsed: boolean }>();
defineEmits<{ (e: 'update:collapsed', v: boolean): void }>();

const { t } = useI18n();
const router = useRouter();
const user = useUserStore();
const menu = useMenuStore();
const localeStore = useLocaleStore();
const nickName = computed(() => user.nickName || '');
const initial = computed(() => (user.nickName || 'U').charAt(0));
const currentLocaleLabel = computed(
  () => supportedLocales.find(l => l.code === localeStore.locale)?.label ?? localeStore.locale
);

const pwdVisible = ref(false);
const pwdSubmitting = ref(false);
const pwdFormRef = ref<FormInstance>();
const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const pwdRules = computed<FormRules>(() => ({
  oldPassword: [{ required: true, message: t('layout.enterOldPassword'), trigger: 'blur' }],
  newPassword: [
    { required: true, message: t('layout.enterNewPassword'), trigger: 'blur' },
    { min: 6, max: 128, message: t('validation.passwordLengthRange'), trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: t('validation.enterConfirmPassword'), trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== pwdForm.newPassword) callback(new Error(t('validation.passwordMismatch')));
        else callback();
      },
      trigger: 'blur'
    }
  ]
}));

function resetPwdForm() {
  pwdForm.oldPassword = '';
  pwdForm.newPassword = '';
  pwdForm.confirmPassword = '';
  pwdFormRef.value?.clearValidate();
}

async function onLocaleChange(code: string) {
  if (code === localeStore.locale) return;
  await switchLocale(code);
}

function onCommand(cmd: string) {
  if (cmd === 'logout') {
    doLogout();
  } else if (cmd === 'changePwd') {
    resetPwdForm();
    pwdVisible.value = true;
  }
}

async function doLogout() {
  user.clearLocal();
  menu.clear();
  resetDynamicRoutes(router);
  router.push('/login');
}

async function submitPwd() {
  if (!pwdFormRef.value) return;
  await pwdFormRef.value.validate();
  pwdSubmitting.value = true;
  try {
    await changePassword(pwdForm.oldPassword, pwdForm.newPassword);
    ElMessage.success(t('message.passwordChangeSuccess'));
    pwdVisible.value = false;
    await doLogout();
  } finally {
    pwdSubmitting.value = false;
  }
}
</script>
