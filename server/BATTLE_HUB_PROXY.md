# Battle hub gateway

The website API remains the only backend exposed through the existing Nginx
configuration. It forwards only `/api/case-battles/*` to the authoritative
battle container:

```text
api.mrhello.se -> existing Nginx -> csgo-clicker-api:5000
                                   -> case-battle-server:8080
```

Environment:

```dotenv
BATTLE_HUB_INTERNAL_URL=http://case-battle-server:8080
BATTLE_HUB_PROXY_TIMEOUT_MS=25000
```

Both containers must share the website API's Docker network. The battle
container publishes no host ports. Do not change Nginx, Jellyfin, firewall or
router rules.

The gateway forwards GET/POST requests, the full battle path and query string,
the bearer credential, JSON bodies, upstream status codes and safe response
headers. Other methods are rejected. Request bodies are limited to 64 KiB and
the upstream timeout is longer than the battle server's 15-second long poll.

Run the gateway contract tests with:

```sh
npm test
```
