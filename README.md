<div align="center">
  <img src="https://docs.hlquery.com/img/hlquery/2.png" alt="hlquery logo" width="200">
</div>

<div align="center">

**A browser-based workspace for administering, searching, and observing hlquery.**

[![Follow hlquery](https://img.shields.io/badge/Follow-%40hlquery-blue?logo=x&logoColor=white&labelColor=000000)](https://x.com/hlquery)
[![hanalyzer build](https://img.shields.io/badge/hanalyzer%20build-passing-brightgreen?logo=google-chrome&logoColor=white&labelColor=000000)](https://github.com/hlquery/hanalyzer/actions)
[![hanalyzer](https://img.shields.io/badge/GitHub-hanalyzer-blue?logo=github&logoColor=white&labelColor=000000)](https://github.com/hlquery/hanalyzer)
[![Demo](https://img.shields.io/badge/Demo-live-0ea5e9?logo=google-chrome&logoColor=white&labelColor=000000)](https://demo.hlquery.com/)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-a35a0f?logo=open-source-initiative&logoColor=white&labelColor=000000)](https://opensource.org/licenses/BSD-3-Clause)

</div>

> **Development status:** hanalyzer is under active development. Expect incomplete
> features and breaking changes. Do not expose an administrative instance to an
> untrusted network without authentication and an HTTPS reverse proxy.

## What is hanalyzer?

hanalyzer is the web interface for [hlquery](https://github.com/hlquery/hlquery).
It turns the server's HTTP API into a visual workspace for routine development,
data inspection, search tuning, access management, and diagnostics.

It is a Vue application; it does not store or index documents itself. Every data
operation is sent to the hlquery server selected in the connection settings.

## What can it do?

| Area | Capabilities |
| --- | --- |
| Collections | Create collections, inspect schemas and metadata, browse documents, and copy or delete data |
| Search | Run collection and global searches, inspect result metadata, test advanced syntax, and use SQL queries |
| Relevance | Manage collection and global synonyms and stopwords |
| Routing | Create and inspect aliases and browse cluster links |
| Access | Inspect and manage users and API keys when the connected credentials permit it |
| Operations | View server status, profiles, connections, RocksDB statistics, counters, and time-series data |
| Diagnostics | Exercise API behavior from the tests view and inspect errors returned by the server |

Available screens depend on the hlquery version, enabled modules, demo/read-only
mode, and permissions associated with the current credentials.

## Requirements

- Node.js **20.19.0 or newer**
- npm 9 or newer
- A reachable hlquery server
- A current Chromium, Firefox, or Safari browser

Check the local toolchain and server before starting:

```bash
$ node --version
$ npm --version
$ curl --fail-with-body http://localhost:9200/health
```

## Quick start

### From the hlquery source tree

```bash
$ cd hanalyzer/
$ npm install
$ ./hanalyzer --open
```

### From the standalone repository

```bash
$ git clone https://github.com/hlquery/hanalyzer.git
$ cd hanalyzer
$ npm install
$ ./hanalyzer --open
```

The development UI listens on `http://localhost:8080` and proxies `/api` to
`http://localhost:9200` by default.

To use another hlquery server:

```bash
$ ./hanalyzer --api http://192.0.2.10:9200 --open
```

The `--api` value is the server-side Vite proxy target. The browser can keep
using `/api`, which avoids cross-origin requests during local development.

## Launcher reference

The `hanalyzer` wrapper provides consistent defaults for local development:

```text
$ ./hanalyzer [command] [options]

Commands:
  start, dev, run     Start the development server (default)
  install             Install npm dependencies
  build               Create dist/
  preview             Serve dist/ locally

Options:
  --port, -p PORT     UI port (default: 8080)
  --host, -H HOST     UI listen host (default: 0.0.0.0)
  --allow-host HOSTS  Comma-separated Vite host allowlist
  --api, -a URL       hlquery proxy target (default: http://localhost:9200)
  --open, -o          Open the browser
```

Examples:

```bash
# Listen only on the local interface
./hanalyzer --host 127.0.0.1

# Use a different UI port and API server
./hanalyzer --port 3000 --api http://127.0.0.1:9300

# Accept a named development host
./hanalyzer --host 0.0.0.0 --allow-host search-ui.example.test

# Build and inspect the static bundle
$ ./hanalyzer build
$ ./hanalyzer preview --host 127.0.0.1
```

You can also use the underlying npm scripts directly:

```bash
$ npm run dev
$ npm run build
$ npm run build:prod
$ npm run preview
```

## Connect to hlquery

Open the server menu in the header to change the API URL and authentication
method. hanalyzer supports:

- Bearer tokens: `Authorization: Bearer <token>`
- API keys: `X-API-Key: <token>`
- HTTP Basic authentication

Credentials entered in the UI are associated with the normalized server URL and
may be saved in browser storage. Do not use shared browser profiles for
administrative credentials. For a public deployment, prefer short-lived or
least-privileged credentials and serve the UI over HTTPS.

The quickest authentication check outside the UI is:

```bash
curl --fail-with-body \
  -H "X-API-Key: $HLQUERY_API_KEY" \
  http://localhost:9200/collections
```

If that request fails, correct the server configuration or key permissions before
debugging hanalyzer.

## Configuration model

hanalyzer has two configuration layers. They solve different problems:

| Layer | File | Used for |
| --- | --- | --- |
| Build/development | `hanalyzer.conf.js` | Vite host, port, proxy target, asset base, and development defaults |
| Runtime/deployment | `public/hanalyzer.config.json` | API URL, proxy selection, and fallback authentication without rebuilding the bundle |

Environment variables override the server portion of `hanalyzer.conf.js`:

| Variable | Purpose | Default |
| --- | --- | --- |
| `HANALYZER_PORT` | Development server port | `8080` |
| `HANALYZER_PREVIEW_PORT` | Preview server port | configured server port |
| `HANALYZER_HOST` | Development and preview listen host | `localhost` in the config file |
| `HANALYZER_ALLOWED_HOSTS` | Comma-separated hostnames, `true`, or `*` | derived from configuration |
| `HANALYZER_API_TARGET` | `/api` proxy destination in development | `http://localhost:9200` |
| `HANALYZER_BASE_URL` | Production asset and router base | `/` |

The launcher exports these variables from its command-line options for `start`
and `preview`.

`HANALYZER_BASE_URL` must be a stable root-relative path. Keep `/` when
hanalyzer is served from the domain root, or use a trailing-slash path such as
`/hanalyzer/` for a subdirectory deployment. Relative values such as `./` are
normalized to `/` because they resolve below the current browser-history route
and break direct reloads of pages such as `/collections/.../documents/...`.

### Runtime configuration

Copy the example and edit the copy:

```bash
cp public/hanalyzer.config.json.example public/hanalyzer.config.json
```

Direct browser connection:

```json
{
  "defaultBaseUrl": "https://search-api.example.com",
  "useProxy": false,
  "defaultAuthToken": "",
  "defaultAuthMethod": "api-key"
}
```

Same-origin reverse proxy:

```json
{
  "defaultBaseUrl": "/api",
  "useProxy": true,
  "defaultAuthToken": "",
  "defaultAuthMethod": "bearer"
}
```

Supported `defaultAuthMethod` values are `bearer`, `api-key`, and `basic`.
Fallback credentials can also be set per server with `defaultAuthByServer`; see
the commented example in `hanalyzer.conf.js` for its shape.

Do not commit real tokens or passwords to either configuration file. Runtime
configuration is downloaded by every browser that opens the application and is
therefore not a secret store.

## Development connection flow

The default local request path is:

```text
browser → http://localhost:8080/api/* → Vite proxy → http://localhost:9200/*
```

This proxy exists only in the Vite development server. A static `dist/` deployment
must either:

1. connect directly to an API that allows the UI origin through CORS; or
2. configure its web server to proxy `/api` to hlquery.

## Production build and deployment

Create an optimized bundle:

```bash
npm ci
npm run build:prod
```

The output is written to `dist/`. Do not open `dist/index.html` with `file://`;
serve it over HTTP or HTTPS.

A minimal Nginx layout looks like this:

```nginx
server {
    listen 443 ssl;
    server_name search-admin.example.com;

    root /srv/hanalyzer/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:9200/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

The `try_files` fallback is required because hanalyzer uses browser history
routing. Routes such as `/collections`, `/dashboard`, and `/status` must return
`index.html` instead of a web-server 404.

Review the repository's `nginx.conf` for a fuller starting point. Add TLS,
network restrictions, authentication, security headers, and proxy timeouts that
fit your environment.

### The port is already in use

```bash
./hanalyzer --port 8081
```

Vite may choose another port when strict port selection is disabled; use the URL
printed in the terminal.

## Contributing

1. Create a focused branch.
2. Install dependencies with `npm ci`.
3. Run `npm run build` before submitting changes.
4. Test the affected screen against a current local hlquery server.
5. Include reproduction steps for API or browser-specific bugs.

Please report hanalyzer issues in
[hlquery/hanalyzer](https://github.com/hlquery/hanalyzer/issues). Changes to the
server API belong in [hlquery/hlquery](https://github.com/hlquery/hlquery).

## Community and license

- [Documentation](https://docs.hlquery.com/)
- [hanalyzer repository](https://github.com/hlquery/hanalyzer)
- [hlquery repository](https://github.com/hlquery/hlquery)
- [X / Twitter](https://x.com/hlquery)

hanalyzer is available under the
[BSD 3-Clause License](https://opensource.org/licenses/BSD-3-Clause).
