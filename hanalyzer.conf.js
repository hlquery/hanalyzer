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
    defaultBaseUrl: 'http://localhost:9200',
    // Example: set a fallback token used when the UI does not already have one saved.
    defaultAuthToken: '',
    // Supported values: 'bearer' or 'api-key'.
    defaultAuthMethod: 'bearer',
    // Example per-server override:
    // defaultAuthByServer: {
    //   'http://localhost:9200': {
    //     token: 'replace-me',
    //     method: 'bearer'
    //   }
    // }
    defaultAuthByServer: {}
  },
  server: {
    port: 8080,
    host: 'localhost',
    allowedHosts: ['demo.hlquery.com'],
    apiTarget: 'http://localhost:9200',
    baseUrl: './',
    open: true
  },
  preview: {
    port: 4173
  },
  build: {
    enableAnalytics: false,
    enableErrorReporting: false
  }
}

export default config
