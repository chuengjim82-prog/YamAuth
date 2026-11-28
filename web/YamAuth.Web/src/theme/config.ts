import { theme, type ThemeConfig } from 'antd'
import { palettes, type AppPalette } from './palette'

function createTheme(palette: AppPalette, dark: boolean, mobile: boolean): ThemeConfig {
  return {
    algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: palette.accent,
      colorInfo: palette.accent,
      colorLink: palette.accent,
      colorLinkHover: palette.buttonHover,
      colorBgBase: palette.background,
      colorBgLayout: palette.background,
      colorBgContainer: palette.surface,
      colorBgElevated: palette.elevated,
      colorText: palette.text,
      colorTextHeading: palette.text,
      colorTextSecondary: palette.secondary,
      colorTextDescription: palette.secondary,
      colorTextPlaceholder: palette.secondary,
      colorTextDisabled: palette.disabledText,
      colorBgContainerDisabled: palette.disabled,
      colorBorder: palette.border,
      colorBorderSecondary: palette.border,
      colorFillAlter: palette.field,
      controlItemBgActive: palette.selected,
      controlItemBgHover: palette.hover,
      controlOutline: palette.focus,
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      fontSize: 14,
      borderRadius: 10,
      borderRadiusLG: 16,
      borderRadiusSM: 8,
      controlHeight: mobile ? 44 : 36,
      controlHeightLG: mobile ? 44 : 40,
      controlHeightSM: mobile ? 36 : 32,
      boxShadow: palette.shadow,
      boxShadowSecondary: palette.shadow
    },
    components: {
      Layout: { headerBg: palette.background, siderBg: palette.surface },
      Button: {
        controlHeight: 32,
        controlHeightLG: 32,
        controlHeightSM: 32,
        colorPrimary: palette.button,
        colorPrimaryHover: palette.buttonHover,
        colorPrimaryActive: palette.buttonHover,
        primaryColor: palette.onButton,
        primaryShadow: 'none',
        defaultShadow: 'none',
        fontWeight: 500,
        textTextColor: palette.text,
        textTextHoverColor: palette.accent,
        textHoverBg: palette.hover
      },
      Input: {
        colorBgContainer: palette.field,
        hoverBg: palette.field,
        activeBg: palette.surface,
        hoverBorderColor: palette.accent,
        activeBorderColor: palette.accent,
        activeShadow: `0 0 0 3px ${palette.focus}`
      },
      InputNumber: { colorBgContainer: palette.field, activeBorderColor: palette.accent },
      Select: {
        selectorBg: palette.field,
        optionActiveBg: palette.hover,
        optionSelectedBg: palette.selected,
        optionSelectedColor: palette.text,
        activeBorderColor: palette.accent,
        hoverBorderColor: palette.accent
      },
      DatePicker: {
        colorBgContainer: palette.field,
        activeBorderColor: palette.accent,
        colorTextLightSolid: palette.onButton,
        // 日、月、年和年代共用面板宽度，不随手机输入框高度放大到视口之外。
        ...(mobile ? { cellWidth: 36 } : {})
      },
      Form: {
        labelColor: palette.text,
        labelFontSize: 13,
        verticalLabelPadding: '0 0 8px',
        itemMarginBottom: 24
      },
      Menu: {
        itemBg: palette.field,
        subMenuItemBg: palette.field,
        itemColor: palette.secondary,
        itemHoverColor: palette.accent,
        itemHoverBg: palette.menuHover,
        itemSelectedBg: palette.menuSelected,
        itemSelectedColor: palette.accent,
        itemHeight: 29,
        itemBorderRadius: 10,
        itemMarginInline: 8,
        itemMarginBlock: 0,
        iconMarginInlineEnd: 5
      },
      Table: {
        headerBg: palette.field,
        headerColor: palette.secondary,
        rowHoverBg: palette.hover,
        borderColor: palette.border,
        cellPaddingBlockMD: 6,
        cellPaddingInlineMD: 12
      },
      Pagination: { itemSizeSM: 32, itemActiveBg: palette.selected },
      Modal: { contentBg: palette.surface, headerBg: palette.surface },
      Drawer: { colorBgElevated: palette.surface },
      Tooltip: { colorBgSpotlight: palette.text, colorTextLightSolid: palette.background }
    }
  }
}

export const appThemes = {
  desktop: {
    light: createTheme(palettes.light, false, false),
    dark: createTheme(palettes.dark, true, false)
  },
  mobile: {
    light: createTheme(palettes.light, false, true),
    dark: createTheme(palettes.dark, true, true)
  }
}
