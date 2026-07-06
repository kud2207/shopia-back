const path = require('path')
const { i18n } = require('./next-i18next.config')

module.exports = {
  trailingSlash: true,
  reactStrictMode: false,
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
    esmExternals: false,
    forceSwcTransforms: true,
  },
  i18n,
  async headers() {
    return [
      {
        // matching all API routes
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
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
          }
        ]
      }
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**'
      }
    ]
  },
  webpack: (config, { isServer, webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      apexcharts: path.resolve(__dirname, './node_modules/apexcharts-clevision'),
      '@models': path.resolve(__dirname, 'src/@apiCore/models/')
    }
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          fs: false,
          path: false,
          os: false,
          net: false,
          dns: false,
          child_process: false,
          tls: false,
          $: 'jquery',
          jQuery: 'jquery',
          'window.jQuery': 'jquery'
        }
      }
    }
    config.plugins.push(
      new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery',
        'window.jQuery': 'jquery'
      })
    )
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, resource => {
        resource.request = resource.request.replace(/^node:/, '')
      })
    )    
    return config
  }
}
