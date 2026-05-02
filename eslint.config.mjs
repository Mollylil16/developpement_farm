// ESLint v9 Flat Config (ES Module)
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Configuration globale
  js.configs.recommended,
  
  // Fichiers à ignorer
  {
    ignores: [
      'node_modules/**',
      'admin-web/**',
      'developpement_farm/**',
      '.expo/**',
      'dist/**',
      'coverage/**',
      '*.config.js',
      '.eslintrc.js',
      '.prettierrc.js',
      'babel.config.js',
      'metro.config.js',
      'jest.setup.js',
      'scripts/**/*.js',
      '__mocks__/**',
      'backend/**', // Le backend a sa propre config ESLint
    ],
  },
  
  // Configuration pour tous les fichiers
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        __DEV__: 'readonly',
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        jest: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        require: 'readonly',
        module: 'readonly',
        // APIs du navigateur/Node.js
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        NodeJS: 'readonly',
        WebSocket: 'readonly',
        FormData: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        EventTarget: 'readonly',
        Event: 'readonly',
        Window: 'readonly',
        requestAnimationFrame: 'readonly',
        AbortController: 'readonly',
        RequestInit: 'readonly',
        HeadersInit: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: react,
      'react-hooks': reactHooks,
      'react-native': reactNative,
      prettier: prettier,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Prettier
      'prettier/prettier': 'warn',
      
      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Désactiver no-floating-promises pour certaines situations
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          ignoreVoid: true,
          ignoreIIFE: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': [
        'warn',
        {
          fixToUnknown: true,
          ignoreRestArgs: false,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      
      // React
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'warn',
      'react/jsx-key': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // React Native
      'react-native/no-inline-styles': 'warn',
      'react-native/no-color-literals': 'off', // Trop strict pour nos besoins
      'react-native/no-raw-text': 'off',
      'react-native/split-platform-components': 'off',
      
      // Code Quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      
      // Best Practices
      'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 20],
      
      // Désactiver les règles en conflit avec Prettier
      ...prettierConfig.rules,
    },
  },
  
  // Configuration pour les fichiers de test (règles moins strictes)
  {
    files: [
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/e2e/**',
      '**/*.e2e.ts',
      '**/integration/**',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'max-lines-per-function': 'off',
      'prettier/prettier': 'warn', // Garder Prettier mais en warning seulement
    },
  },
  
  // Configuration pour les scripts utilitaires
  {
    files: ['scripts/**/*.ts', 'scripts/**/*.js'],
    rules: {
      'no-console': 'off', // Les scripts peuvent utiliser console.log
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  
  // Configuration spéciale pour index.ts (déclarations de types globaux)
  {
    files: ['index.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },
];

