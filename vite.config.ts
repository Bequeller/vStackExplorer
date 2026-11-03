import { defineConfig, type Plugin } from 'vitest/config';

/**
 * The CSP meta tag in index.html applies to the built site. The dev server injects
 * CSS through inline <style> tags, which that CSP blocks, so drop the tag in dev only.
 */
function cspOnlyInBuild(): Plugin {
  return {
    name: 'csp-only-in-build',
    apply: 'serve',
    transformIndexHtml: (html) => html.replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*>/, ''),
  };
}

export default defineConfig({
  base: '/vStackExplorer/',
  plugins: [cspOnlyInBuild()],
  build: {
    target: 'es2022',
    // Keep every asset as a file: the CSP allows only 'self', not data: URIs.
    assetsInlineLimit: 0,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
