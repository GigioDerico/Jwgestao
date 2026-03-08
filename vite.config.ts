import { defineConfig, loadEnv } from 'vite'
import fs from 'node:fs'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function parseLegacyEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const parsed: Record<string, string> = {}

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    parsed[key] = value
  }

  return parsed
}

function resolveLegacyEnv(mode: string) {
  const candidates = [
    mode === 'development' ? '.env-dev' : '',
    mode === 'production' ? '.env-prod' : '',
    mode === 'homolog' ? '.env-homolog' : '',
    `.env-${mode}`,
  ].filter(Boolean)

  for (const candidate of candidates) {
    const envValues = parseLegacyEnvFile(path.resolve(process.cwd(), candidate))
    if (Object.keys(envValues).length > 0) {
      return envValues
    }
  }

  return {}
}

export default defineConfig(({ mode }) => {
  const standardEnv = loadEnv(mode, process.cwd(), '')
  const legacyEnv = resolveLegacyEnv(mode)

  const supabaseUrl = standardEnv.VITE_SUPABASE_URL || legacyEnv.VITE_SUPABASE_URL || ''
  const supabaseAnonKey =
    standardEnv.VITE_SUPABASE_ANON_KEY || legacyEnv.VITE_SUPABASE_ANON_KEY || ''

  return {
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'app-icon.svg'],
        manifest: {
          name: 'Congregação Vicente Nunes',
          short_name: 'CVN',
          description: 'Aplicativo de gestão da Congregação Vicente Nunes.',
          theme_color: '#082c45',
          background_color: '#f8fafc',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      }),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
