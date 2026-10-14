# Image Monitor

Angular frontend for the [Picture-AI backend](https://github.com/XaydarovMarufjon/Picture-AI).
It submits website URLs for image scanning, lists recent scans, and displays the
backend's image labels and scores. Crawling and AI inference run in the backend,
not in this repository. The UI does not verify that a provider's label is correct.

## Local development

Use a Node.js version supported by the installed Angular 20 CLI: `^20.19.0`,
`^22.12.0`, or `>=24.0.0`. The repository includes a package lock; keep it when
installing dependencies.

```sh
npm ci
npm start
```

Open `http://localhost:4200/`. If npm 11 reports the existing peer-resolution
failure during `npm ci`, the tested workaround is `npm ci --legacy-peer-deps`.
Do not delete or regenerate the lockfile merely to work around that error.

The frontend expects a separately configured backend at `http://localhost:3000`.
Follow that repository's setup instructions for its database and moderation
providers. Keep provider credentials on the backend; this frontend has no
credential configuration and does not need provider secrets.

### Backend addresses

There is currently no environment-file or development-proxy configuration.
Two source locations must agree when changing the backend address:

- [ScanService](src/app/services/scan.service.ts): REST base `http://localhost:3000/scan`
- [SocketService](src/app/services/socket.service.ts): Socket.IO origin `http://localhost:3000`

`localhost` means the machine running the browser. A remote browser will not
reach a backend on your development machine through this default address.
An HTTPS frontend also needs a compatible HTTPS backend address; do not bypass
browser security warnings. The backend must permit the frontend's origin for
both HTTP and Socket.IO connections.

## Pages and current data flow

- `/`: submit a URL with `POST /scan`, body `{ "url": "https://example.com" }`.
  The expected response contains a numeric `scanId`; successful submission
  schedules navigation to `/scan/:id` after 800 ms.
- `/history`: requests `GET /scan/latest?limit=50` and links to individual scans.
- `/scan/:id`: listens for `scan-progress` Socket.IO events. In the current
  implementation, a `finished` event triggers `GET /scan/detail?id=<id>`.
  Opening an old scan does **not** itself fetch its saved details; see the
  navigation limitation below.
- Unknown routes redirect to `/`.

The expected detail object has `id`, `siteUrl`, `status`, and `items`. Each item
has `id`, `imageUrl`, `label`, `score`, and `provider`; see the
[TypeScript models](src/app/models/scan.model.ts). `getProgress(id)` exposes
`GET /scan/:id/progress` in the service but is not polled by the current pages.

The score slider filters already-loaded items in the browser using
`(score ?? 0) >= threshold`; the initial threshold is `0.3`. It does not rerun
moderation or change the backend's saved label. A filtered-empty view is not
proof that a site has no inappropriate images. The page renders the original
image URLs, so viewing results can load images from their source hosts.

## Checks and build

```sh
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.spec.json
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

Tests use Karma/Jasmine and require a working Chrome/Chromium installation.
Set `CHROME_BIN` to its executable if Karma cannot find it. A compiled test
bundle alone is not evidence that the tests ran. There is currently no lint or
end-to-end target configured in [angular.json](angular.json).

Build output is under `dist/image-monitoring/`. After a successful server build,
`npm run serve:ssr:image-monitoring` starts the generated Express server, using
`PORT` or port `4000` by default. This is a frontend server, not the scan backend.

### Known limitations in the current default branch

These are tracked separately; the linked draft PRs are proposals, not shipped fixes.

- Production build fails because the wildcard prerender configuration includes
  dynamic `scan/:id` without `getPrerenderParams`: [draft #4](https://github.com/XaydarovMarufjon/image-monitoring/pull/4).
- Existing app-shell specs require router setup and contain an outdated welcome
  assertion: [draft #2](https://github.com/XaydarovMarufjon/image-monitoring/pull/2).
- Direct/history navigation can remain in a loading state awaiting a future
  completion event; progress is not isolated to the active scan:
  [draft #5](https://github.com/XaydarovMarufjon/image-monitoring/pull/5).
- Failed history requests have no visible error/retry state:
  [draft #6](https://github.com/XaydarovMarufjon/image-monitoring/pull/6).

Check the current PR state before relying on a proposed fix. This README does
not claim a successful production deployment, live-backend test, or measured
moderation accuracy.
