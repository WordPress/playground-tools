## Loopback Service Worker

This service worker is used to handle requests in the browser extension. Every time it captures a `fetch` event, it posts a message to the parent window and awaits a response.

This worker is hosted on a separate URL to avoid intertwining with WordPress Playground service worker:

https://playground-editor-extension.pages.dev/service-worker.js

This is only required because Google Chrome Manifest v3 makes it extremely difficult to serve Playground from the extension itself – there's a lot of restrictions on how the extension is allowed to interact with websites. This is a workaround that provides us an HTTP context where these restrictions are relaxed.
