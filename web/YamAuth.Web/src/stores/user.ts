import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { LoginResult } from '@/constants/auth';

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') ?? '');
  const userName = ref<string>(localStorage.getItem('userName') ?? '');
  const nickName = ref<string>(localStorage.getItem('nickName') ?? '');

  function persist() {
    localStorage.setItem('token', token.value);
    localStorage.setItem('userName', userName.value);
    localStorage.setItem('nickName', nickName.value);
  }

  function setLogin(data: LoginResult) {
    token.value = data.token;
    userName.value = data.userName;
    nickName.value = data.nickName;
    persist();
  }

  function clearLocal() {
    token.value = '';
    userName.value = '';
    nickName.value = '';
    localStorage.clear();
  }

  function logout() { clearLocal(); }

  // 去权限：一律放行
  function hasPerm(_perm: string) { return true; }

  return { token, userName, nickName, setLogin, clearLocal, logout, hasPerm };
});
