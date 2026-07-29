if (process.argv[2]) {
    process.env.BATTLE_HUB_INTERNAL_URL = process.argv[2];
}

const express = require(`express`);

const app = express();
app.use(express.json({limit: `10mb`}));
app.use(`/api/case-battles`, require(`../routes/casebattles`));

const host = process.env.HOST || `127.0.0.1`;
const port = Number(process.argv[3] || process.env.PORT || 15000);
const server = app.listen(port, host, () => {
    console.log(JSON.stringify({event: `battle_proxy_ready`, host, port}));
});

for (const signal of [`SIGINT`, `SIGTERM`]) {
    process.once(signal, () => {
        server.close(() => process.exit(0));
    });
}
