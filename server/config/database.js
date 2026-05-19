const {Pool} = require(`pg`);
require(`dotenv`).config();

const pool = new Pool({ // skapar en databaspool och får den informationen från .env filen
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432
});

module.exports = pool; // exporterar databaspoolen så att den kan användas i andra delar av applikationen