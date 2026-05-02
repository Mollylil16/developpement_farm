import { defineConfig } from 'tsx';

export default defineConfig({
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
  },
  ignore: ['**/node_modules/**', '**/react-native/**', '**/expo*/**'],
});
