import type { Directive } from 'vue';
import { useUserStore } from '@/stores/user';

function applyPermission(el: HTMLElement, perm: string) {
  const user = useUserStore();
  el.style.display = user.hasPerm(perm) ? '' : 'none';
}

export const vHas: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    applyPermission(el, binding.value);
  },
  updated(el, binding) {
    applyPermission(el, binding.value);
  }
};
