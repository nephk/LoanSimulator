import dadsPlugin from '@digital-go-jp/tailwind-theme-plugin';
import containerQueries from '@tailwindcss/container-queries';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  plugins: [dadsPlugin, containerQueries],
};
