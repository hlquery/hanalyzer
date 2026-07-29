const packageVersion =
  typeof process !== 'undefined' &&
  process &&
  process.env &&
  process.env.npm_package_version
    ? process.env.npm_package_version
    : '1.0.0'

const config = {
  app: {
    title: 'hlquery Analyzer',
    description: 'Professional web interface for managing hlquery search server',
    version: packageVersion
  },
  runtime: {
    defaultBaseUrl: '/api',
    // Example: set a fallback token used when the UI does not already have one saved.
    defaultAuthToken: '',
    // Example: set fallback basic auth credentials used when no token is saved.
    defaultAuthUsername: '',
    defaultAuthPassword: '',
    // Supported values: 'bearer', 'api-key', or 'basic'.
    defaultAuthMethod: 'bearer',
    // Example per-server override:
    // defaultAuthByServer: {
    //   'http://localhost:9200': {
    //     token: 'replace-me',
    //     method: 'bearer'
    //   },
    //   'http://private.example:9200': {
    //     username: 'replace-me',
    //     password: 'replace-me',
    //     method: 'basic'
    //   }
    // }
    defaultAuthByServer: {}
  },
  server: {
    port: 8080,
    host: 'localhost',
    // Host/IP allowlist used only when defaultAuthUsername and defaultAuthPassword are set.
    allowedHosts: ['demo.hlquery.com', 'localhost'],
    apiTarget: 'http://localhost:9200',
    // Browser-history routes require a root-relative asset base so a direct
    // reload on /collections/... resolves assets from /assets, not from the
    // current route directory. Use an explicit path such as /hanalyzer/ when
    // deploying below a subdirectory.
    baseUrl: '/',
    open: true
  },
  build: {
    enableAnalytics: false,
    enableErrorReporting: false
  }
}

export default config
