import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier/flat'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  globalIgnores(['dist/**', 'coverage/**', '**/*.tsbuildinfo']),
  { linterOptions: { noInlineConfig: true } },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node }
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
    }
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
    rules: {
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: {
            'Record<string, unknown>':
              '业务对象必须定义具体字段；未知外部输入使用 unknown 并收窄。',
            'Record<string, any>': '业务对象必须定义具体字段。'
          }
        }
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'TSIndexSignature[typeAnnotation.typeAnnotation.type=/TSUnknownKeyword|TSAnyKeyword/]',
          message: '不能用宽泛索引签名替代业务类型。'
        }
      ]
    }
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/api/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/api/request',
              importNames: ['apiGet', 'apiPost', 'apiPut', 'apiDelete'],
              message: '页面和组件应调用已经绑定具体契约的资源 API。'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['vite.config.ts'],
    languageOptions: { globals: globals.node }
  },
  prettier
)
