import type { Language } from 'element-plus/es/locale';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import en from 'element-plus/es/locale/lang/en';

export interface SupportedLocale {
  code: string;
  label: string;
  epLocale: Language;
}

export const DEFAULT_LOCALE = 'zh-CN';

export type SupportedLocaleCode = 'zh-CN' | 'en-US';

export const supportedLocales: SupportedLocale[] = [
  { code: 'zh-CN', label: '简体中文', epLocale: zhCn },
  { code: 'en-US', label: 'English', epLocale: en }
];

export function resolveLocale(code: string | null | undefined): string {
  if (code && supportedLocales.some(l => l.code === code)) return code;
  return DEFAULT_LOCALE;
}

export function getEpLocale(code: string): Language {
  return supportedLocales.find(l => l.code === code)?.epLocale ?? zhCn;
}
