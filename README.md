<div align="center">
  <img src="https://docs.hlquery.com/img/hlquery/2.png" alt="hlquery logo" width="200">
</div>

<div align="center">

**A modern dashboard for managing, monitoring, and analyzing HLQuery servers.**

[![Follow hlquery](https://img.shields.io/badge/Follow-%40hlquery-blue?logo=x&logoColor=white)](https://x.com/hlquery)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/hlquery/hlquery)](https://github.com/hlquery/hlquery/pulse)
[![hanalyzer](https://img.shields.io/badge/GitHub-hanalyzer-181717?logo=github&logoColor=white)](https://github.com/hlquery/hanalyzer)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

</div>

> **Development Status**: hanalyzer is currently in active development and should not be used in production environments. The software may contain bugs, incomplete features, and breaking changes may occur without notice.

### Overview

hanalyzer is a modern web dashboard for HLQuery, built with Vue 3 and Vuetify. It provides a practical interface for managing collections and documents, inspecting server state, and visualizing runtime activity from a browser.

It connects to the HLQuery API for indexing, querying, monitoring, and administration, and includes a local CLI wrapper for development, preview, and production builds.

### Quick Start

Clone the repository normally:

```bash
$ git clone https://github.com/hlquery/hlquery.git
$ cd hlquery/etc/hanalyzer
```

Install dependencies and start the dashboard:

```bash
$ npm install
$ ./hanalyzer
```

By default, hanalyzer runs on `http://localhost:8080` and connects to HLQuery at `http://localhost:9200`.

### Key Features

- **Collection Management**: Create, view, and manage collections with an intuitive interface
- **Document Browser**: Browse, search, and inspect documents with full JSON editing capabilities
- **Advanced Search Interface**: Powerful search UI with query syntax highlighting and result visualization
- **Server Dashboard**: Real-time monitoring of server health, performance metrics, and statistics
- **Cache Monitoring**: View and manage cache statistics and performance
- **Connection Monitoring**: Track active connections and network activity
- **RocksDB Statistics**: Visualize RocksDB tree statistics with 3D dashboard
- **WAL Timeline**: Track Write-Ahead Log activity and performance
- **Modern UI**: Beautiful, responsive interface built with Vuetify and Tailwind CSS

## Detailed Setup

### Prerequisites

**Node.js and npm:**
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

**Installation:**

**Using nvm (recommended):**
```bash
nvm install 18
nvm use 18
```

**Or download from:**
- [Node.js Official Website](https://nodejs.org/)

**Verify installation:**
```bash
node -v  # Should show v18.0.0 or higher
npm -v   # Should show 9.0.0 or higher
```

> **Note**: Make sure your HLQuery server is running and accessible. hanalyzer connects to the HLQuery API (default: `http://localhost:9200`).

### Installation

```bash
npm install
npm run dev
```

### Configuration

Static dev/build defaults live in `hanalyzer.conf.js`:

```js
export default {
  runtime: {
    defaultBaseUrl: 'http://localhost:9200',
    // Example fallback token if the UI has nothing saved yet.
    defaultAuthToken: '',
    defaultAuthMethod: 'bearer'
  },
  server: {
    port: 8080,
    host: 'localhost',
    apiTarget: 'http://localhost:9200',
    baseUrl: '/'
  }
}
```

The `./hanalyzer` CLI can still override `port`, `host`, and `apiTarget` at runtime.
Use `runtime.defaultAuthToken` or `runtime.defaultAuthByServer` in `hanalyzer.conf.js` if you want auth defaults with comments and examples.

Create a runtime JSON config file from the example:

```bash
cp public/hanalyzer.config.json.example public/hanalyzer.config.json
```

Edit `public/hanalyzer.config.json` to configure your settings:

```json
{
  "defaultBaseUrl": "http://localhost:9200",
  "defaultAuthToken": "replace-me",
  "defaultAuthMethod": "bearer",
  "useProxy": false
}
```

Notes:
- `defaultBaseUrl` sets the initial HLQuery server URL.
- `defaultAuthToken` is only used as a fallback when no token is already saved in the UI for the current server.
- `defaultAuthMethod` supports `bearer` and `api-key`.
- `useProxy` forces browser requests through `/api`. Leave it `false` for plain static hosting; set it to `true` only when your web server actually proxies `/api/*` to HLQuery.
- You can also use `defaultAuthByServer` for per-server token overrides.
- This file is intended for deployment-time config, so secrets do not need to be hardcoded into the built bundle.

### Running hanalyzer

**Using the hanalyzer CLI (Recommended):**

```bash
./hanalyzer
```

Or with custom options:

```bash
./hanalyzer --port 3000
./hanalyzer --api http://your-server:9200
./hanalyzer --open  # Automatically open browser
```

**Using npm scripts:**

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

Important:
- Do not open `dist/index.html` with `file://`.
- Serve the built files over `http://` or `https://`, for example with `npm run preview`.

> **Note**: hanalyzer runs on port **8080** by default. Ensure this port is available and not blocked by your firewall.

## Getting Started

### 1. Start HLQuery Server

Make sure your HLQuery server is running:

```bash
./run/hlquery start
```

Verify it's accessible:

```bash
curl http://localhost:9200/health
```

### 2. Start hanalyzer

```bash
cd etc/hanalyzer
./hanalyzer
```

### 3. Access the Dashboard

Open your browser and navigate to:

```
http://localhost:8080
```

You should see the hanalyzer dashboard with connection status to your HLQuery server.

## Features Overview

### Collections Management

- **View Collections**: Browse all collections with statistics and metadata
- **Create Collections**: Create new collections with custom field definitions
- **Collection Details**: View detailed information about each collection
- **Document Management**: Browse, search, and edit documents within collections

### Search Interface

- **Advanced Search**: Full-featured search interface with query syntax support
- **Query Builder**: Visual query builder for complex searches
- **Result Visualization**: Beautiful result display with highlighting and pagination
- **Search History**: Track and replay previous searches

### Server Monitoring

- **Dashboard**: Real-time server health and performance metrics
- **RocksDB Statistics**: 3D visualization of RocksDB structure and performance
- **WAL Timeline**: Track Write-Ahead Log activity over time
- **Cache Statistics**: Monitor cache hit rates and performance
- **Connection Monitoring**: View active connections and network stats

### Document Management

- **Document Browser**: Navigate through documents with pagination
- **JSON Editor**: Full-featured JSON editor for document editing
- **Document Inspector**: Detailed view of document structure and metadata
- **Bulk Operations**: Perform operations on multiple documents

## Command Line Interface

The `hanalyzer` CLI provides convenient commands:

```bash
# Start development server
hanalyzer
hanalyzer start
hanalyzer dev

# Build for production
hanalyzer build

# Preview production build
hanalyzer preview

# Install dependencies
hanalyzer install

# Show help
hanalyzer --help
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--port, -p` | Set server port | `8080` |
| `--host, -H` | Set server host | `localhost` |
| `--api, -a` | Set HLQuery API URL | `http://localhost:9200` |
| `--open, -o` | Open browser automatically | `false` |
| `--help, -h` | Show help message | - |

### Examples

```bash
# Start on custom port
hanalyzer --port 3000

# Connect to remote server
hanalyzer --api http://api.example.com:9200

# Start and open browser
hanalyzer --open

# Build for production
hanalyzer build
```

## Production Deployment

### Building for Production

```bash
npm run build:prod
```

This creates an optimized production build in the `dist/` directory.

### Using Nginx

An example `nginx.conf` is provided for reverse proxy configuration.

### Runtime Config File

Use `hanalyzer.conf.js` for local dev/build settings and `public/hanalyzer.config.json` for browser runtime settings.

For production, prefer `public/hanalyzer.config.json` for app-level configuration.

## Architecture

hanalyzer is built with modern web technologies:

- **Vue.js 3** - Progressive JavaScript framework
- **Vuetify 3** - Material Design component framework
- **Vite** - Next-generation frontend build tool
- **Vue Router** - Official router for Vue.js
- **Axios** - HTTP client for API requests
- **Chart.js** - Data visualization library
- **Three.js** - 3D graphics for RocksDB Visualization

### Project Structure

```
etc/hanalyzer/
├── src/
│   ├── components/     # Reusable Vue components
│   ├── composables/    # Vue composition API utilities
│   ├── views/          # Page components
│   ├── utils/          # Utility functions
│   └── router.js       # Vue Router configuration
├── public/             # Static assets and runtime JSON config
├── assets/             # CSS and design system files
├── hanalyzer.conf.js   # Shared dev/build configuration
├── vite.config.js      # Vite configuration
├── package.json        # Dependencies and scripts
└── hanalyzer           # CLI wrapper script
```

## Troubleshooting

### Cannot Connect to HLQuery Server

1. Verify HLQuery server is running:
   ```bash
   ./run/hlquery status
   ```

2. Check the API URL in `public/hanalyzer.config.json`:
   ```json
   { "defaultBaseUrl": "http://localhost:9200" }
   ```

3. Test connection manually:
   ```bash
   curl http://localhost:9200/health
   ```

### Port Already in Use

Change the port with the CLI option:

```bash
hanalyzer --port 3000
```

### Dependencies Installation Issues

Clear cache and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

Ensure you're using the correct Node.js version:

```bash
node -v  # Should be 18+
npm -v   # Should be 9+
```

## Contributing

We welcome contributions from the community! All contributions must be released under the BSD 3-Clause license.

### How to Contribute

- Check existing [issues](https://github.com/hlquery/hlquery/issues) or create new ones
- Improve the UI/UX
- Add new features and visualizations
- Test and report bugs
- Improve documentation
- Join our [Discord community](https://discord.hlquery.com)

## Community

- 📖 [Documentation](https://docs.hlquery.com)
- 💬 [Discord](https://discord.hlquery.com)
- 🐦 [X (Twitter)](https://x.com/hlquery)
- 📦 [GitHub](https://github.com/hlquery/hlquery)

## License

hanalyzer is licensed under the [BSD 3-Clause License](https://opensource.org/licenses/BSD-3-Clause).

---

<div align="center">

⭐ **Star us on GitHub if you find hanalyzer useful!**

Made with ❤️ by the hlquery team

</div>
