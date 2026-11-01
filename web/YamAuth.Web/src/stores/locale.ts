import { defineStore } from 'pinia';
import { ref } from 'vue';
import { DEFAULT_LOCALE, resolveLocale } from '@/i18n/supportedLocales';
import { setI18nLocale } from '@/i18n';

export const useLocaleStore = defineStore('locale', () => {
  const locale = ref(resolveLocale(localStorage.getItem('locale') ?? DEFAULT_LOCALE));

  function setLocale(code: string) {
    const resolved = setI18nLocale(code);
    locale.value = resolved;
    localStorage.setItem('locale', resolved);
    return resolved;
  }

  return { locale, setLocale };
});
