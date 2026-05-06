const bcrypt = require(`bcryptjs`);
const db = require(`./database`);
const {
    ROOT_ADMIN_EMAIL,
    ROOT_ADMIN_USERNAME,
    ROOT_ADMIN_PASSWORD
} = require(`./rootAdmin`);

const seedRootAdmin = async () => {
    const existing = await db.query(`SELECT id, is_admin FROM users WHERE LOWER(email) = $1`, [ROOT_ADMIN_EMAIL]);

    if (existing.rows.length > 0) {
        if (!existing.rows[0].is_admin) {
            await db.query(`UPDATE users SET is_admin = true WHERE id = $1`, [existing.rows[0].id]);
        }
        return;
    }

    const hashedPassword = await bcrypt.hash(ROOT_ADMIN_PASSWORD, 10);
    const client = await db.connect();

    try {
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
        client.release();
    }
};

module.exports = seedRootAdmin;
