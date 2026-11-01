import { request } from '@/utils/request';
import type { LoginResult } from '@/constants/auth';

export function login(userName: string, password: string) {
  return request<LoginResult>({ url: '/v1/auth/login', method: 'POST', data: { userName, password } });
}

export function fetchMenuTree() {
  return request<import('@/stores/menu').MenuNode[]>({ url: '/v1/auth/menus', method: 'GET' });
}

export function changePassword(oldPassword: string, newPassword: string) {
  return request<void>({ url: '/v1/auth/change-password', method: 'POST', data: { oldPassword, newPassword } });
}
