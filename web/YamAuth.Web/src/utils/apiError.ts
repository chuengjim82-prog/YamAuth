import { i18n } from '@/i18n';

/** 从统一响应体中提取可读错误信息（含 FluentValidation 字段错误 + 中文 API 消息映射） */
export function formatApiError(body: {
  message?: string;
  data?: Record<string, string[]>;
}): string {
  if (body.data && typeof body.data === 'object') {
    for (const messages of Object.values(body.data)) {
      if (Array.isArray(messages) && messages[0]) {
        return translateApiMessage(messages[0]);
      }
    }
  }
  const msg = body.message ?? '';
  if (msg && !msg.includes('validation errors')) {
    return translateApiMessage(msg);
  }
  return i18n.global.t('message.operationFailed');
}

function translateApiMessage(msg: string): string {
  const key = `apiError.${msg}`;
  if (i18n.global.te(key)) return i18n.global.t(key);
  return msg;
}
