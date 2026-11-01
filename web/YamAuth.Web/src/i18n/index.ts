import { createI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';
import { DEFAULT_LOCALE, resolveLocale, type SupportedLocaleCode } from './supportedLocales';

const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('locale') : null;

export const i18n = createI18n({
  legacy: false,
  locale: resolveLocale(saved),
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
});

export function setI18nLocale(locale: string) {
  const code = resolveLocale(locale) as SupportedLocaleCode;
  i18n.global.locale.value = code;
  return code;
}
