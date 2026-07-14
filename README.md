<div align="center">
  <img src="https://docs.hlquery.com/img/hlquery/2.png" alt="hlquery logo" width="200">
</div>

<div align="center">

**A modern dashboard for managing, monitoring, and analyzing hlquery servers.**

[![Follow hlquery](https://img.shields.io/badge/Follow-%40hlquery-blue?logo=x&logoColor=white&labelColor=000000)](https://x.com/hlquery)
[![hanalyzer build](https://img.shields.io/badge/hanalyzer%20build-passing-brightgreen?logo=google-chrome&logoColor=white&labelColor=000000)](https://github.com/hlquery/hanalyzer-api/actions/workflows/ci.yml)
[![hanalyzer](https://img.shields.io/badge/GitHub-hanalyzer-blue?logo=github&logoColor=white&labelColor=000000)](https://github.com/hlquery/hanalyzer/stargazers)
[![Demo](https://img.shields.io/badge/Demo-live-0ea5e9?logo=google-chrome&logoColor=white&labelColor=000000)](https://demo.hlquery.com/)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-a35a0f?logo=open-source-initiative&logoColor=white&labelColor=000000)](https://opensource.org/licenses/BSD-3-Clause)


</div>

> **Development Status**: hanalyzer is currently in active development and should not be used in production environments. The software may contain bugs, incomplete features, and breaking changes may occur without notice.

### What is hanalyzer?

hanalyzer is the browser-based control surface for hlquery. It gives you a visual way to work with collections, documents, search behavior, health data, and operational settings without manually stitching together API calls, JSON payloads, or ad hoc scripts.

Instead of treating hlquery like a set of disconnected endpoints, hanalyzer organizes the server into one interface for search operations, collection administration, document inspection, diagnostics, and monitoring.

### Why use it?

Use hanalyzer when you want hlquery management to feel operational and readable instead of repetitive. It is useful when you need to inspect data quickly, verify behavior during development, watch server health live, or hand a teammate a UI instead of a folder full of `curl` examples.

### Quick Start

Clone the repository normally:

```bash
$ git clone https://github.com/hlquery/hanalyzer.git
$ cd hanalyzer/
```

Install dependencies and start the dashboard:

```bash
$ npm install
$ ./hanalyzer
```

By default, hanalyzer runs on `http://localhost:8080` and connects to hlquery at `http://localhost:9200`.

## Detailed Setup

### Prerequisites

**Node.js and npm:**
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

> **Note**: Make sure your hlquery server is running and accessible. hanalyzer connects to the hlquery API (default: `http://localhost:9200`).

### Installation

```bash
$ npm install
$ npm run dev
```

### Configuration

Static dev/build defaults live in `hanalyzer.conf.js`:

```js
export default {
  runtime: {
    defaultBaseUrl: 'http://localhost:9200',
    // Example fallback token if the UI has nothing saved yet.
    defaultAuthToken: '',
    // Optional fallback HTTP Basic credentials if no token is saved.
    defaultAuthUsername: '',
    defaultAuthPassword: '',
    defaultAuthMethod: 'bearer'
  },
  server: {
    port: 8080,
    host: 'localhost',
    allowedHosts: ['demo.hlquery.com'],
    apiTarget: 'http://localhost:9200',
    baseUrl: './'
  }
}
```

### Running hanalyzer

**Using the hanalyzer CLI (Recommended):**

```bash
$ ./hanalyzer
```

Or with custom options:

```bash
$ ./hanalyzer --port 3000
$ ./hanalyzer --api http://your-server:9200
$ ./hanalyzer --open  # Automatically open browser
```

**Using npm scripts:**

```bash
# Development server
$ npm run dev

# Production build
$ npm run build

# Preview production build
$ npm run preview
```

Important:
- Do not open `dist/index.html` with `file://`.
- Serve the built files over `http://` or `https://`, for example with `npm run preview`.
- The production build now defaults to relative asset paths plus hash-based routing, so `dist/` can be mounted under `/`, `/hanalyzer/`, or another static subdirectory without extra rewrite rules.

> **Note**: hanalyzer runs on port **8080** by default. Ensure this port is available and not blocked by your firewall.

## Getting Started

### 1. Start hlquery Server

Make sure your hlquery server is running:

```bash
$ ./run/hlquery start
```

Verify it's accessible:

```bash
$ curl http://localhost:9200/health
```

### 2. Start hanalyzer

```bash
$ cd hanalyzer/
$ ./hanalyzer
```

### 3. Access the Dashboard

Open your browser and navigate to:

```
http://localhost:8080
```

You should see the hanalyzer dashboard with connection status to your hlquery server.

### Contributing

We welcome contributions from the community! All contributions must be released under the BSD 3-Clause license.

### How to Contribute

- Check existing [hanalyzer issues](https://github.com/hlquery/hanalyzer/issues) or create new ones
- Contribute dashboard changes to [hlquery/hanalyzer](https://github.com/hlquery/hanalyzer)
- Contribute shared server/API changes to [hlquery/hlquery](https://github.com/hlquery/hlquery)
- Test and report UI, integration, and API compatibility bugs
- Improve hanalyzer documentation and examples

### Community

- [Documentation](https://docs.hlquery.com)
- [X (Twitter)](https://x.com/hlquery)
- [hanalyzer GitHub](https://github.com/hlquery/hanalyzer)
- [hlquery GitHub](https://github.com/hlquery/hlquery)

### License

hanalyzer is licensed under the [BSD 3-Clause License](https://opensource.org/licenses/BSD-3-Clause).
