import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function cspPlugin(connectSources: string): Plugin {
  return {
    name: 'equio-csp',
    transformIndexHtml(html) {
      return html.replace('__CSP_CONNECT_SRC__', connectSources);
    },
  };
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_BASE_URL || 'http://localhost:8081/api/v1';
  const apiOrigin = apiUrl.startsWith('/')
    ? "'self'"
    : new URL(apiUrl).origin;
  const connectSources = mode === 'development'
    ? `${apiOrigin} ws://localhost:*`
    : apiOrigin;
  const contentSecurityPolicy = [
    "default-src 'self'",
    "script-src 'self' 'sha256-Z2/iFzh9VMlVkEOar1f/oSHWwQk3ve1qk/C2WdsC4Xk='",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://images.unsplash.com",
    `connect-src 'self' ${connectSources}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ');
  const developmentHeaders = {
    ...securityHeaders,
    'Content-Security-Policy': contentSecurityPolicy,
  };

  return {
    plugins: [
      cspPlugin(connectSources),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    build: {
      minify: true,
      sourcemap: false,
    },
    server: {
      headers: developmentHeaders,
    },
    preview: {
      headers: developmentHeaders,
    },
  };
});
