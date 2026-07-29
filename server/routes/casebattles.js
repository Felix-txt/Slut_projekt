const express = require(`express`);
const {Readable} = require(`stream`);
const {pipeline} = require(`stream/promises`);

const router = express.Router();
const DEFAULT_UPSTREAM = `http://case-battle-server:8080`;
const DEFAULT_TIMEOUT_MS = 25000;
const MAX_PROXY_BODY_BYTES = 64 * 1024;

function getUpstreamOrigin() {
    const configured = process.env.BATTLE_HUB_INTERNAL_URL || DEFAULT_UPSTREAM;
    let url;
    try {
        url = new URL(configured);
    } catch {
        throw new Error(`BATTLE_HUB_INTERNAL_URL must be a valid HTTP URL`);
    }

    if (![`http:`, `https:`].includes(url.protocol) || url.username || url.password) {
        throw new Error(`BATTLE_HUB_INTERNAL_URL must use HTTP or HTTPS without credentials`);
    }

    url.pathname = `/`;
    url.search = ``;
    url.hash = ``;
    return url;
}

function getTimeoutMs() {
    const configured = Number(process.env.BATTLE_HUB_PROXY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    if (!Number.isSafeInteger(configured) || configured < 5000 || configured > 60000) {
        return DEFAULT_TIMEOUT_MS;
    }
    return configured;
}

function sendProxyError(res, status, errorType, errorMessage) {
    if (res.headersSent || res.writableEnded) {
        return;
    }
    res.status(status).json({
        ok: false,
        errorType,
        errorMessage
    });
}

router.use(async (req, res) => {
    if (![`GET`, `POST`].includes(req.method)) {
        res.set(`Allow`, `GET, POST`);
        return res.status(405).json({
            ok: false,
            errorType: `method_not_allowed`,
            errorMessage: `Use GET or POST.`
        });
    }

    const upstreamUrl = new URL(req.originalUrl, getUpstreamOrigin());
    if (!upstreamUrl.pathname.startsWith(`/api/case-battles/`)) {
        return res.status(400).json({
            ok: false,
            errorType: `invalid_battle_path`,
            errorMessage: `Invalid battle API path.`
        });
    }

    const headers = {
        accept: `application/json`
    };
    if (req.headers.authorization) {
        headers.authorization = req.headers.authorization;
    }

    let body;
    if (req.method === `POST`) {
        try {
            body = JSON.stringify(req.body || {});
        } catch {
            return sendProxyError(res, 400, `invalid_json`, `Request body must be valid JSON.`);
        }
        if (Buffer.byteLength(body) > MAX_PROXY_BODY_BYTES) {
            return sendProxyError(res, 413, `request_too_large`, `Battle API request is too large.`);
        }
        headers[`content-type`] = `application/json`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error(`upstream timeout`)), getTimeoutMs());
    const cancelIfClientLeaves = () => {
        if (!res.writableEnded) {
            controller.abort(new Error(`client disconnected`));
        }
    };
    req.once(`aborted`, cancelIfClientLeaves);
    res.once(`close`, cancelIfClientLeaves);

    try {
        const upstream = await fetch(upstreamUrl, {
            method: req.method,
            headers,
            body,
            signal: controller.signal,
            redirect: `manual`
        });

        res.status(upstream.status);
        for (const headerName of [`content-type`, `cache-control`, `x-content-type-options`]) {
            const value = upstream.headers.get(headerName);
            if (value) {
                res.set(headerName, value);
            }
        }

        if (!upstream.body) {
            return res.end();
        }
        await pipeline(Readable.fromWeb(upstream.body), res);
    } catch (error) {
        if (req.aborted || res.destroyed) {
            return;
        }
        if (error && error.name === `AbortError`) {
            return sendProxyError(res, 504, `battle_hub_timeout`, `The battle hub did not respond in time.`);
        }
        return sendProxyError(res, 502, `battle_hub_unavailable`, `The battle hub is unavailable.`);
    } finally {
        clearTimeout(timeout);
        req.off(`aborted`, cancelIfClientLeaves);
        res.off(`close`, cancelIfClientLeaves);
    }
});

module.exports = router;
