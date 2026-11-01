/** 品牌主色，与 Osoo.EC admin.ui.plus 默认一致 */
export const THEME_PRIMARY = '#6954f0';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16)
  ];
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`;
}

function lighten(hex: string, level: number): string {
  const [r, g, b] = hexToRgb(hex);
  return toHex(
    Math.floor((255 - r) * level + r),
    Math.floor((255 - g) * level + g),
    Math.floor((255 - b) * level + b)
  );
}

function darken(hex: string, level: number): string {
  const [r, g, b] = hexToRgb(hex);
  return toHex(
    Math.floor(r * (1 - level)),
    Math.floor(g * (1 - level)),
    Math.floor(b * (1 - level))
  );
}

/** 注入 Element Plus 主色阶与布局 CSS 变量 */
export function applyTheme(primary = THEME_PRIMARY) {
  const root = document.documentElement;
  root.style.setProperty('--el-color-primary', primary);
  root.style.setProperty('--el-menu-active-color', primary);
  root.style.setProperty('--el-color-primary-dark-2', darken(primary, 0.1));
  for (let i = 1; i <= 9; i++) {
    root.style.setProperty(`--el-color-primary-light-${i}`, lighten(primary, i / 10));
  }
}
