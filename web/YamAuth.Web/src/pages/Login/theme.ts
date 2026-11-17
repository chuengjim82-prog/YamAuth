import type { CSSProperties } from 'react'
import type { ConfigProviderProps, ThemeConfig } from 'antd'
import { palettes, type AppPalette } from '@/theme/palette'

export const loginInputConfig: NonNullable<ConfigProviderProps['input']> = {
  styles: { prefix: { marginInlineEnd: 12, color: 'var(--login-secondary)' } }
}

function loginPalette(palette: AppPalette) {
  return {
    '--login-bg': palette.background,
    '--login-heading': palette.text,
    '--login-secondary': palette.secondary,
    '--login-accent': palette.accent,
    '--login-field': palette.field,
    '--login-border': palette.border,
    '--login-focus': palette.focus,
    '--login-button': palette.button,
    '--login-button-hover': palette.buttonHover,
    '--login-on-button': palette.onButton
  }
}

type LoginPalette = ReturnType<typeof loginPalette>

function createAppearance(palette: LoginPalette) {
  // 页面 CSS 与组件主题共用色板；错误状态及深浅算法继续继承全站主题。
  const style: CSSProperties & LoginPalette = palette
  const theme: ThemeConfig = {
    token: {
      colorPrimary: palette['--login-accent'],
      colorText: palette['--login-heading'],
      colorTextPlaceholder: palette['--login-secondary'],
      colorBgContainer: palette['--login-field'],
      colorBorder: palette['--login-border'],
      controlHeightLG: 54,
      controlHeight: 32,
      controlHeightSM: 24,
      borderRadius: 10,
      borderRadiusLG: 10
    },
    components: {
      Input: {
        colorBgContainer: palette['--login-field'],
        inputFontSizeLG: 16,
        paddingInlineLG: 16,
        hoverBorderColor: palette['--login-accent'],
        activeBorderColor: palette['--login-accent'],
        activeShadow: `0 0 0 4px ${palette['--login-focus']}`,
        hoverBg: palette['--login-field'],
        activeBg: palette['--login-bg']
      },
      Form: {
        labelColor: palette['--login-heading'],
        labelFontSize: 13,
        labelHeight: 'auto',
        verticalLabelPadding: '0 0 9px',
        itemMarginBottom: 24
      },
      Button: {
        colorPrimary: palette['--login-button'],
        colorPrimaryHover: palette['--login-button-hover'],
        colorPrimaryActive: palette['--login-button-hover'],
        primaryColor: palette['--login-on-button'],
        primaryShadow: '0 5px 12px rgb(27 57 40 / 8%)',
        colorBgContainerDisabled: palette['--login-button'],
        colorTextDisabled: palette['--login-on-button'],
        colorBorderDisabled: palette['--login-button'],
        contentFontSize: 13,
        contentFontSizeLG: 15,
        fontWeight: 500,
        iconGap: 14,
        // 主题按钮在手机端位于照片上，文字和底色随容器的媒体查询切换。
        textTextColor: 'var(--login-theme-label)',
        textTextHoverColor: 'var(--login-theme-label)',
        textTextActiveColor: 'var(--login-theme-label)',
        textHoverBg: 'transparent'
      }
    }
  }
  return { style, theme }
}

// 稳定的配置引用避免输入或提交状态更新时重复构造主题。
export const loginAppearances = {
  light: createAppearance(loginPalette(palettes.light)),
  dark: createAppearance(loginPalette(palettes.dark))
}
