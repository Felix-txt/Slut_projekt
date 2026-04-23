const express = require(`express`);
const cors = require(`cors`);
require(`dotenv`).config();
const db = require(`./config/database`);

const app = express();

app.use(cors());
app.use(express.json());

app.use(`/api/auth`, require(`./routes/auth`));
app.use(`/api/games`, require(`./routes/games`));
app.use(`/api/saves`, require(`./routes/saves`));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`server running on port http://localhost:${PORT}`);
})