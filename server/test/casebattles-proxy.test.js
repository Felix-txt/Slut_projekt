const test = require(`node:test`);
const assert = require(`node:assert/strict`);
const http = require(`node:http`);
const express = require(`express`);

function listen(server) {
    return new Promise((resolve, reject) => {
        server.once(`error`, reject);
        server.listen(0, `127.0.0.1`, () => {
            server.off(`error`, reject);
            resolve(server.address());
        });
    });
}

function close(server) {
    return new Promise((resolve) => {
        if (!server.listening) {
            return resolve();
        }
        server.close(resolve);
    });
}

test(`battle API route preserves path, query, bearer token, body and response`, async (t) => {
    const received = [];
    const upstream = http.createServer((req, res) => {
        const chunks = [];
        req.on(`data`, (chunk) => chunks.push(chunk));
        req.on(`end`, () => {
            received.push({
                method: req.method,
                url: req.url,
                authorization: req.headers.authorization,
                body: chunks.length ? JSON.parse(Buffer.concat(chunks).toString(`utf8`)) : null
            });
            if (req.url.startsWith(`/api/case-battles/events`)) {
                setTimeout(() => {
                    res.writeHead(200, {
                        "content-type": `application/json`,
                        "cache-control": `no-store`
                    });
                    res.end(JSON.stringify({ok: true, cursor: 7, events: []}));
                }, 25);
                return;
            }
            res.writeHead(202, {"content-type": `application/json`});
            res.end(JSON.stringify({ok: true, requestId: `command-1`}));
        });
    });
    const upstreamAddress = await listen(upstream);
    t.after(() => close(upstream));

    const previousUrl = process.env.BATTLE_HUB_INTERNAL_URL;
    process.env.BATTLE_HUB_INTERNAL_URL = `http://127.0.0.1:${upstreamAddress.port}`;
    t.after(() => {
        if (previousUrl === undefined) {
            delete process.env.BATTLE_HUB_INTERNAL_URL;
        } else {
            process.env.BATTLE_HUB_INTERNAL_URL = previousUrl;
        }
    });

    const app = express();
    app.use(express.json({limit: `10mb`}));
    app.use(`/api/case-battles`, require(`../routes/casebattles`));
    const website = http.createServer(app);
    const websiteAddress = await listen(website);
    t.after(() => close(website));
    const baseUrl = `http://127.0.0.1:${websiteAddress.port}`;

    const commandResponse = await fetch(`${baseUrl}/api/case-battles/command`, {
        method: `POST`,
        headers: {
            authorization: `Bearer ${`a`.repeat(64)}`,
            "content-type": `application/json`
        },
        body: JSON.stringify({
            frame: {v: 1, type: `create_room`, requestId: `command-1`}
        })
    });
    assert.equal(commandResponse.status, 202);
    assert.deepEqual(await commandResponse.json(), {ok: true, requestId: `command-1`});

    const eventsResponse = await fetch(`${baseUrl}/api/case-battles/events?after=4`, {
        headers: {authorization: `Bearer ${`b`.repeat(64)}`}
    });
    assert.equal(eventsResponse.status, 200);
    assert.deepEqual(await eventsResponse.json(), {ok: true, cursor: 7, events: []});

    assert.deepEqual(received, [
        {
            method: `POST`,
            url: `/api/case-battles/command`,
            authorization: `Bearer ${`a`.repeat(64)}`,
            body: {
                frame: {v: 1, type: `create_room`, requestId: `command-1`}
            }
        },
        {
            method: `GET`,
            url: `/api/case-battles/events?after=4`,
            authorization: `Bearer ${`b`.repeat(64)}`,
            body: null
        }
    ]);
});

test(`battle API route rejects unsupported methods before contacting upstream`, async () => {
    const app = express();
    app.use(express.json());
    app.use(`/api/case-battles`, require(`../routes/casebattles`));
    const website = http.createServer(app);
    const address = await listen(website);
    try {
        const response = await fetch(`http://127.0.0.1:${address.port}/api/case-battles/status`, {
            method: `DELETE`
        });
        assert.equal(response.status, 405);
        assert.equal((await response.json()).errorType, `method_not_allowed`);
    } finally {
        await close(website);
    }
});
