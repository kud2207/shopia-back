const path = require('path')
const { i18n } = require('./next-i18next.config')

module.exports = {
  trailingSlash: true,
  reactStrictMode: false,

  i18n,

  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
    esmExternals: false,
    forceSwcTransforms: true
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**'
      }
    ]
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,OPTIONS,PATCH,DELETE'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, authorization'
          }
        ]
      }
    ]
  },

  webpack: (config, { isServer, webpack }) => {
    // 🔥 Aliases propres
    config.resolve.alias = {
      ...config.resolve.alias,
      apexcharts: path.resolve(__dirname, './node_modules/apexcharts-clevision'),
      '@models': path.resolve(__dirname, 'src/@apiCore/models/')
    }

    // 🔥 fallback browser
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false
      }
    }

    // 🔥 Provide jQuery (si vraiment utilisé)
    config.plugins.push(
      new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery'
      })
    )

    // 🔥 node: compatibility fix
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, resource => {
        resource.request = resource.request.replace(/^node:/, '')
      })
    )

    return config
  }
}