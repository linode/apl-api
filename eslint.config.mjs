// eslint.config.js
import { fixupPluginRules } from '@eslint/compat'
import pluginTs from '@typescript-eslint/eslint-plugin'
import parserTs from '@typescript-eslint/parser'
import pluginImport from 'eslint-plugin-import'
import pluginUnused from 'eslint-plugin-unused-imports'
import pluginPrettier from 'eslint-plugin-prettier'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    '.history',
    '.vscode',
    'build/*',
    'dist/*',
    'coverage/*',
    'node_modules/*',
    'vendors/*',
    'src/generated-schema.ts',
  ]),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: parserTs,
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.json'],
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      '@typescript-eslint': fixupPluginRules(pluginTs),
      import: fixupPluginRules(pluginImport),
      'unused-imports': fixupPluginRules(pluginUnused),
      prettier: fixupPluginRules(pluginPrettier),
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.ts'],
          paths: ['src'],
        },
        typescript: {},
      },
    },
    rules: {
      // TS rules
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/member-delimiter-style': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-shadow': [
        'error',
        {
          allow: ['deps', 'secrets', 'values'],
        },
      ],
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^(_|next)',
          varsIgnorePattern: '^_',
        },
      ],
      
      '@typescript-eslint/no-use-before-define': ['error'],
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'function',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
      ],

      // Base rules
      'comma-dangle': ['error', 'only-multiline'],
      'eol-last': ['error', 'always'],
      'func-names': 'off',
      'import/extensions': 'off',
      'import/no-extraneous-dependencies': 'off',
      'no-console': 'off',
      'no-debugger': 'warn',
      'no-fallthrough': 'warn',
      'no-param-reassign': [
        'error',
        {
          props: true,
          ignorePropertyModificationsFor: ['memo'],
        },
      ],
      'no-shadow': 'off',
      'no-unused-vars': 'off',
      'no-use-before-define': 'off',
      'object-shorthand': 'error',
      'prefer-destructuring': 'warn',
      'prefer-template': 'error',

      // Plugins
      'prettier/prettier': 'error',
    },
  },
])
