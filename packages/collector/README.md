# Collector

_v0.0.0_

Packages your WordPress install and sends it to Playground.

## Development

-   Install and activate the plugin in your WordPress install
-   Replace the `blueprintUrl` variable in `collector.php` with

```js
const blueprintUrl = query.get('blueprintUrl').replace('https://wordpress.org', 'http://localhost:8010/proxy');`
```

-   Start the CORS proxy:

```bash
npm install -g local-cors-proxy
npx lcp --proxyUrl https://wordpress.org/
```

-   On your site open the _Add Plugins_ page and click the _Preview Now_ button
