/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Производственные оптимизации
  // Turbopack конфигурация (новый формат)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  experimental: {
    // Оптимизация сборки
    optimizePackageImports: ['@solana/web3.js', '@solana/spl-token', 'lucide-react'],
  },
  
  // Webpack оптимизации для ускорения компиляции
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Оптимизации для разработки
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      }
      
      // Исключаем heavy модули из клиентской сборки
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: false,
          net: false,
          tls: false,
          crypto: false,
        }
      }
    }
    
    // Оптимизация bundle size
    config.resolve.alias = {
      ...config.resolve.alias,
      '@solana/web3.js': '@solana/web3.js/lib/index.browser.esm.js',
    }
    
    return config
  },
  
  // Отключаем source maps в dev для скорости
  productionBrowserSourceMaps: false,
  
  // Оптимизация изображений
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  
  // Минимизация статики
  compress: true,
  
  // Настройки CORS для быстрого Telegram доступа
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ]
  },
}

module.exports = nextConfig