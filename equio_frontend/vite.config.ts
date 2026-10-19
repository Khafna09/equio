import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function cspPlugin(scriptSources: string, connectSources: string): Plugin {
  return {
    name: 'equio-csp',
    transformIndexHtml(html) {
      return html
        .replace('__CSP_SCRIPT_SRC__', scriptSources)
        .replace('__CSP_CONNECT_SRC__', connectSources);
    },
  };
}

function deploymentArtifactsPlugin(contentSecurityPolicy: string): Plugin {
  const headers = [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    '  Referrer-Policy: no-referrer',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()',
    '  Cross-Origin-Opener-Policy: same-origin',
    '  Cross-Origin-Resource-Policy: same-origin',
    `  Content-Security-Policy: ${contentSecurityPolicy}`,
    '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
    '  Cache-Control: no-store, max-age=0',
    '',
    '/assets/*',
    '  ! Cache-Control',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ].join('\n');

  return {
    name: 'equio-deployment-artifacts',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source: headers });
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
  const parsedApiUrl = apiUrl.startsWith('/') ? null : new URL(apiUrl);
  if (mode === 'production'
      && (!env.VITE_API_BASE_URL || parsedApiUrl?.protocol !== 'https:')) {
    throw new Error('Production requires an explicit HTTPS VITE_API_BASE_URL');
  }
  const apiOrigin = apiUrl.startsWith('/')
    ? "'self'"
    : parsedApiUrl!.origin;
  const connectSources = mode === 'development'
    ? `${apiOrigin} ws://localhost:*`
    : apiOrigin;
  const scriptSources = mode === 'development'
    ? "'self' 'unsafe-inline'"
    : "'self'";
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https://images.unsplash.com",
    `connect-src 'self' ${connectSources}`,
    "font-src 'self' data: https://fonts.gstatic.com",
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
      cspPlugin(scriptSources, connectSources),
      deploymentArtifactsPlugin(contentSecurityPolicy),
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
