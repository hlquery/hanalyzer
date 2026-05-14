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

### What is hanalyzer?

hanalyzer is the browser-based control surface for HLQuery. It gives you a visual way to work with collections, documents, search behavior, health data, and operational settings without manually stitching together API calls, JSON payloads, or ad hoc scripts.

Instead of treating HLQuery like a set of disconnected endpoints, hanalyzer organizes the server into one interface for search operations, collection administration, document inspection, diagnostics, and monitoring.

### Why use it?

Use hanalyzer when you want HLQuery management to feel operational and readable instead of repetitive. It is useful when you need to inspect data quickly, verify behavior during development, watch server health live, or hand a teammate a UI instead of a folder full of `curl` examples.

### Why choose it over raw HTTP?

Raw HTTP is useful when you already know the exact endpoint, payload, and response shape you need. hanalyzer is for the work around those calls: exploring what exists, checking whether a collection has the documents you expect, comparing search behavior, watching health signals, and confirming that operational changes actually took effect.

Instead of moving between `curl`, copied JSON, shell history, and separate notes, hanalyzer keeps the common workflow in one place. You can browse collections, inspect documents, run searches, review modules, check cache and RocksDB state, look at links, and verify SAM availability without rebuilding the same request context each time.

It also gives more context than a raw response body. Search screens make it easier to compare query behavior, collection pages keep schema and document work close together, status views make server health, modules, caches, links, WAL activity, and RocksDB statistics easier to scan, and SAM-aware views help confirm whether semantic assistance is available and current. Raw HTTP remains the stable automation surface; hanalyzer gives humans a faster and more readable way to understand the server while they are working.

For public demo deployments, hanalyzer supports a simple `.demo` marker file. When the browser can fetch `/.demo` from the built app and it is not served as the normal HTML fallback, hanalyzer treats the deployment as a demo instance, uses `/api` as the default HLQuery endpoint, enables proxy-style access, and keeps the connection controls out of the way. This pairs with HLQuery's `demo` runtime module, which allows browsing and searching while blocking write and admin actions, so a public instance can be explored without exposing mutation operations.

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

### 1. Start HLQuery Server

Make sure your HLQuery server is running:

```bash
$ ./run/hlquery start
```

Verify it's accessible:

```bash
$ curl http://localhost:9200/health
```

### 2. Start hanalyzer

```bash
$ cd etc/hanalyzer
$ ./hanalyzer
```

### 3. Access the Dashboard

Open your browser and navigate to:

```
http://localhost:8080
```

You should see the hanalyzer dashboard with connection status to your HLQuery server.
