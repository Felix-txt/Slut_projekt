const express = require(`express`);
const cors = require(`cors`);
const path = require(`path`);
require(`dotenv`).config();
const db = require(`./config/database`);
const seedRootAdmin = require(`./config/seedRootAdmin`);

const app = express(); // skapar en express app

app.use(cors()); // tillåter cross-origin requests så att serven och hemsidan kan prata utan att servern behöver veta var hemsidan är
app.use(express.json({ limit: `10mb` })); // sätter maxstorlek för JSON-förfrågningar
app.use(`/downloads`, express.static(process.env.DOWNLOADS_DIR || path.resolve(__dirname, `../frontend/downloads`)));

// för api routes 
app.use(`/api/auth`, require(`./routes/auth`));
app.use(`/api/games`, require(`./routes/games`));
app.use(`/api/saves`, require(`./routes/saves`));
app.use(`/api/skins`, require(`./routes/skins`));
app.use(`/api/crates`, require(`./routes/crates`));
app.use(`/api/inventory`, require(`./routes/inventory`));
app.use(`/api/admin`, require(`./routes/admin`));
app.use(`/api/users`, require(`./routes/users`));
app.use(`/api/leaderboard`, require(`./routes/leaderboard`));

const PORT = process.env.PORT || 5000;  // förljer port från .env annars blir port 5000
const HOST = process.env.HOST || `0.0.0.0`; // start server på alla nätverksgränssnitt, bra för docker

app.listen(PORT, HOST, async (err) => {
    if (err) {                          // hantera eventuella fel vid serverstart
        console.error(`server failed to start on port ${PORT}:`, err.message); // skriver ut felmeddelande i konsolen
        return;
    }
    await seedRootAdmin().catch((error) => console.error(`root admin seed failed`, error)); /// seedar root admin, om det misslyckas loggas det i konsolen
    console.log(`server running on http://${HOST}:${PORT}`); // säger vilken address och port severn är på
});
