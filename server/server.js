const express = require(`express`);
const cors = require(`cors`);
const path = require(`path`);
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

app.listen(PORT, HOST, async (err) => {
    if (err) {
        console.error(`server failed to start on port ${PORT}:`, err.message);
        return;
    }
    await seedRootAdmin().catch((error) => console.error(`root admin seed failed`, error));
    console.log(`server running on http://${HOST}:${PORT}`);
});
