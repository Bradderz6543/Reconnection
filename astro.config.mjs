import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://hullabalooshipley.co.uk',
  integrations: [sitemap()],
});
