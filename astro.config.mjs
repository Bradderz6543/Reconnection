import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://bradderz6543.github.io',
  base: '/Reconnection',
  integrations: [sitemap()],
});
