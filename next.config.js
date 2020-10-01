// next.config.js
const withOffline = require('next-offline')

module.exports = withOffline({
  workboxOpts: {
    runtimeCaching: [
      {
        urlPattern: /.png$/,
        handler: 'CacheFirst'
      },
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheableResponse: {
            statuses: [0, 200],
            headers: {
              'x-test': 'true',
            },
          },
        },
      },
    ],
  },
});
