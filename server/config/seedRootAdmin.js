const bcrypt = require(`bcryptjs`);
const db = require(`./database`);
const { // hämtar root admin uppgifter från config
    ROOT_ADMIN_EMAIL,
    ROOT_ADMIN_USERNAME,
    ROOT_ADMIN_PASSWORD
} = require(`./rootAdmin`); // hämtar root admin uppgifter från config

const seedRootAdmin = async () => {
    const existing = await db.query(`SELECT id, is_admin FROM users WHERE LOWER(email) = $1`, [ROOT_ADMIN_EMAIL]); // hämtar existerande root admin

    if (existing.rows.length > 0) {
        if (!existing.rows[0].is_admin) {
            await db.query(`UPDATE users SET is_admin = true WHERE id = $1`, [existing.rows[0].id]);
        }
        return;
    }

    const hashedPassword = await bcrypt.hash(ROOT_ADMIN_PASSWORD, 10); // crypterrar root admin lösenord
    const client = await db.connect();

    try { // kollar så att allt skapas korekt, om något går fel så rullas det tillbaka och inget skapas i databasen
        await client.query(`BEGIN`);

        const result = await client.query(
            `INSERT INTO users (username, email, password, is_admin)
             VALUES ($1, $2, $3, true)
             RETURNING id`,
            [ROOT_ADMIN_USERNAME, ROOT_ADMIN_EMAIL, hashedPassword]
        );

        await client.query(
            `INSERT INTO user_balance (user_id, balance)
             VALUES ($1, 100.00)
             ON CONFLICT (user_id) DO NOTHING`,
            [result.rows[0].id]
        );

        await client.query(`COMMIT`);
        console.log(`root admin seeded: ${ROOT_ADMIN_EMAIL}`);
    } catch (error) {
        await client.query(`ROLLBACK`);
        throw error;
    } finally {
        client.release(); // släpper databaskopplingen så att den kan användas av andra delar av applikationen
    }
};

module.exports = seedRootAdmin; // exporterar funktionen så att den kan användas i server.js för att seed root admin när servern startar
