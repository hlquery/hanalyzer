import vue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**']
  },
  ...vue.configs['flat/base'],
  {
    files: ['**/*.{js,jsx,mjs,cjs,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    files: ['*.config.js', '*.conf.js', 'test/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  }
]
