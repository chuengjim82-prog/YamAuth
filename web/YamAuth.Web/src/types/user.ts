import { i18n } from '@/i18n';

/** 用户表单（含前端专用 confirmPassword，不提交后端） */
export interface UserForm {
  userName: string;
  nickName: string;
  password?: string;
  confirmPassword?: string;
  phone: string;
  email: string;
  isActived: boolean;
  remark: string;
}

export interface UserDto extends Omit<UserForm, 'password' | 'confirmPassword'> {
  id: number;
}

export type UserCreatePayload = Pick<UserForm, 'userName' | 'nickName' | 'password' | 'phone' | 'email' | 'isActived' | 'remark'> & {
  password: string;
};

export type UserUpdatePayload = Pick<UserForm, 'userName' | 'nickName' | 'phone' | 'email' | 'isActived' | 'remark'> & {
  password?: string;
};

const DEFAULT_CREATE_PASSWORD = 'admin123';

const t = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params ?? {});

export function emptyUserForm(): UserForm {
  return {
    userName: '',
    nickName: '',
    password: DEFAULT_CREATE_PASSWORD,
    confirmPassword: DEFAULT_CREATE_PASSWORD,
    phone: '',
    email: '',
    isActived: true,
    remark: ''
  };
}

export function toUserForm(row: UserDto): UserForm {
  return {
    userName: row.userName ?? '',
    nickName: row.nickName ?? '',
    password: '',
    confirmPassword: '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    isActived: row.isActived ?? true,
    remark: row.remark ?? ''
  };
}

export function toCreatePayload(form: UserForm): UserCreatePayload {
  return {
    userName: form.userName.trim(),
    nickName: form.nickName.trim(),
    password: form.password!.trim(),
    phone: form.phone?.trim() ?? '',
    email: form.email?.trim().toLowerCase() ?? '',
    isActived: form.isActived,
    remark: form.remark?.trim() ?? ''
  };
}

export function toUpdatePayload(form: UserForm): UserUpdatePayload {
  const payload: UserUpdatePayload = {
    userName: form.userName.trim(),
    nickName: form.nickName.trim(),
    phone: form.phone?.trim() ?? '',
    email: form.email?.trim().toLowerCase() ?? '',
    isActived: form.isActived,
    remark: form.remark?.trim() ?? ''
  };
  const pwd = form.password?.trim();
  if (pwd) payload.password = pwd;
  return payload;
}

/** 提交前校验密码（创建必填；编辑可选） */
export function validateUserPassword(form: UserForm, isCreate: boolean): string | null {
  const pwd = form.password?.trim() ?? '';
  const confirm = form.confirmPassword?.trim() ?? '';

  if (isCreate) {
    if (!pwd) return t('validation.enterPassword');
    if (pwd.length < 6) return t('validation.minLength', { n: 6 });
    if (!confirm) return t('validation.enterConfirmPassword');
    if (pwd !== confirm) return t('validation.passwordMismatch');
    return null;
  }

  if (!pwd && !confirm) return null;
  if (pwd && pwd.length < 6) return t('validation.minLength', { n: 6 });
  if (pwd !== confirm) return t('validation.passwordMismatch');
  return null;
}
