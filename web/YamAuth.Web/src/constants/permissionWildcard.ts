/** 超级管理员通配符 */
export const WILDCARD_ALL = '*:*:*';
export const WILDCARD_ALL_CANONICAL = 'system.wildcard.all';

export function toCanonicalPermission(code: string): string {
  if (!code) return code;
  if (code === WILDCARD_ALL) return WILDCARD_ALL_CANONICAL;
  if (code.includes(':')) return code.replace(/:/g, '.');
  return code;
}

export function toLegacyPermission(code: string): string {
  if (!code) return code;
  if (code === WILDCARD_ALL_CANONICAL) return WILDCARD_ALL;
  if (code.includes('.')) return code.replace(/\./g, ':');
  return code;
}

export function hasPermission(granted: string[], required: string): boolean {
  if (!granted.length) return false;

  const canonical = toCanonicalPermission(required);
  const legacy = toLegacyPermission(canonical);

  if (granted.includes(required) || granted.includes(canonical) || granted.includes(legacy))
    return true;

  return granted.includes(WILDCARD_ALL) || granted.includes(WILDCARD_ALL_CANONICAL);
}
