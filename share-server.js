const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.SHARE_PORT || 8090);
const API_TARGET = {
    hostname: "127.0.0.1",
    port: 5001
};

const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};

function sendFile(res, filePath) {
    fs.readFile(filePath, (error, data) => {
        if (error) {
            res.writeHead(error.code === "ENOENT" ? 404 : 500, {"Content-Type": "text/plain; charset=utf-8"});
            res.end(error.code === "ENOENT" ? "Not found" : "Server error");
            return;
        }

        res.writeHead(200, {"Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"});
        res.end(data);
    });
}

function proxyApi(req, res) {
    const proxyReq = http.request({
        hostname: API_TARGET.hostname,
        port: API_TARGET.port,
        path: req.url,
        method: req.method,
        headers: {
            ...req.headers,
            host: `${API_TARGET.hostname}:${API_TARGET.port}`
        }
    }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on("error", () => {
        res.writeHead(502, {"Content-Type": "application/json; charset=utf-8"});
        res.end(JSON.stringify({ok: false, errorMessage: "Backend is not reachable."}));
    });

    req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
        proxyApi(req, res);
        return;
    }

    const safePath = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    const requestedPath = path.join(ROOT, safePath === path.sep ? "frontend/index.html" : safePath);
    const resolvedPath = path.resolve(requestedPath);

    if (!resolvedPath.startsWith(ROOT)) {
        res.writeHead(403, {"Content-Type": "text/plain; charset=utf-8"});
        res.end("Forbidden");
        return;
    }

    fs.stat(resolvedPath, (error, stats) => {
        if (error) {
            res.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"});
            res.end("Not found");
            return;
        }

        if (stats.isDirectory()) {
            sendFile(res, path.join(resolvedPath, "index.html"));
            return;
        }

        sendFile(res, resolvedPath);
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`share server running on http://localhost:${PORT}`);
});
