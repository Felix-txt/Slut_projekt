const express = require(`express`);
const cors = require(`cors`);
const fs = require(`fs`);
const path = require(`path`);
const https = require(`https`);
require(`dotenv`).config();
const db = require(`./config/database`);
const seedRootAdmin = require(`./config/seedRootAdmin`);

const app = express();

app.use(cors());
app.use(express.json({ limit: `10mb` }));

app.use(`/api/auth`, require(`./routes/auth`));
app.use(`/api/games`, require(`./routes/games`));
app.use(`/api/saves`, require(`./routes/saves`));
app.use(`/api/skins`, require(`./routes/skins`));
app.use(`/api/crates`, require(`./routes/crates`));
app.use(`/api/inventory`, require(`./routes/inventory`));
app.use(`/api/admin`, require(`./routes/admin`));
app.use(`/api/users`, require(`./routes/users`));
app.use(`/api/leaderboard`, require(`./routes/leaderboard`));

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || `0.0.0.0`;

const useHttps = process.env.HTTPS === `true`;

if (useHttps) {
    const certPath = process.env.SSL_CERT_PATH || `./ssl/cert.pem`;
    const keyPath = process.env.SSL_KEY_PATH || `./ssl/key.pem`;
    
    let httpsServer;
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const httpsOptions = {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath)
        };
        httpsServer = https.createServer(httpsOptions, app);
        httpsServer.listen(PORT, HOST, async () => {
            await seedRootAdmin().catch((error) => console.error(`root admin seed failed`, error));
            console.log(`server running on https://${HOST}:${PORT}`);
        });
        console.log(`HTTPS enabled`);
    } else {
        console.log(`SSL certificates not found at ${certPath} and ${keyPath}`);
        console.log(`Run with HTTPS=true to enable, or generate self-signed certs`);
        app.listen(PORT, HOST, async (err) => {
            if (err) {
                console.error(`server failed to start on port ${PORT}:`, err.message);
                return;
            }
            await seedRootAdmin().catch((error) => console.error(`root admin seed failed`, error));
            console.log(`server running on http://${HOST}:${PORT}`);
        });
    }
} else {
    app.listen(PORT, HOST, async (err) => {
        if (err) {
            console.error(`server failed to start on port ${PORT}:`, err.message);
            return;
        }
        await seedRootAdmin().catch((error) => console.error(`root admin seed failed`, error));
        console.log(`server running on http://${HOST}:${PORT}`);
    });
}
