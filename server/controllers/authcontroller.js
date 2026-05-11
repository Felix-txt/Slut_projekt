const db = require(`../config/database`);
const bcrypt = require(`bcryptjs`);
const jwt = require(`jsonwebtoken`);
const crypto = require(`crypto`);
const nodemailer = require(`nodemailer`);
const {ROOT_ADMIN_EMAIL, ROOT_ADMIN_CODE} = require(`../config/rootAdmin`);

const RESET_TOKEN_MINUTES = 30;

function hashResetToken(token) {
    return crypto.createHash(`sha256`).update(token).digest(`hex`);
}

function buildResetUrl(req, token) {
    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl) {
        return `${frontendUrl.replace(/\/$/, ``)}/login-signin.html#reset=${encodeURIComponent(token)}`;
    }

    const protocol = req.protocol || `http`;
    const host = req.get(`host`) || `localhost:5000`;
    return `${protocol}://${host.replace(/:\d+$/, `:8090`)}/login-signin.html#reset=${encodeURIComponent(token)}`;
}

async function sendPasswordResetEmail(email, resetUrl) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === `true`,
        auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        } : undefined
    });

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || `no-reply@cs-clicker.local`,
        to: email,
        subject: `Reset your CS-Clicker password`,
        text: `Open this link to reset your password. The link expires in ${RESET_TOKEN_MINUTES} minutes:\n\n${resetUrl}`,
        html: `<p>Open this link to reset your password. The link expires in ${RESET_TOKEN_MINUTES} minutes:</p><p><a href="${resetUrl}">Reset password</a></p>`
    });

    return true;
}

async function ensurePasswordResetTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR(64) NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            used_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id)`);
}

const register = async (req, res) => {
    try {
        const {username, email, password} = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `please provide username, email and password`
            });
        }
    
        const usercheck = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
        if (usercheck.rows.length > 0) {
            return res.status(409).json({
                ok: false,
                errorType: `auth`,
                errorMessage: `email already in use`
            });
        }

        const hashedpassword = await bcrypt.hash(password, 10);

        const client = await db.connect();
        try {
            await client.query(`BEGIN`);
            
            const result = await client.query(
                `INSERT INTO users (username, email, password, is_admin)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, username, email`,
                [username, email, hashedpassword, false]
            );
            const user = result.rows[0];
            const userId = user.id;
            
            await client.query('INSERT INTO user_balance (user_id, balance) VALUES ($1, 100.00)', [userId]);
            
            await client.query(`COMMIT`);
            
            res.status(201).json({
                ok: true,
                accountId: user.id,
                email: user.email,
                username: user.username
            });
        } catch (err) {
            await client.query(`ROLLBACK`);
            throw err;
        } finally {
            client.release();
        }
    } 
    catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            errorType: `server`,
            errorMessage: `server error`
        });
    }
};

const login = async (req, res) => {
    try {
        const {email, password, adminCode} = req.body;
        if (!email || !password) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `please provide email and password`
            });
        }
        
        const usercheck = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
        if (usercheck.rows.length === 0) {
            return res.status(401).json({
                ok: false,
                errorType: `auth`,
                errorMessage: `Fel e-post eller losenord.`
            });
        }

        const user = usercheck.rows[0];

        const passwordvalid = await bcrypt.compare(password, user.password);
        if (!passwordvalid) {
            return res.status(401).json({
                ok: false,
                errorType: `auth`,
                errorMessage: `Fel e-post eller losenord.`
            });
        }

        if (user.email.toLowerCase() === ROOT_ADMIN_EMAIL && !adminCode) {
            return res.status(401).json({
                ok: false,
                errorType: `auth`,
                requiresAdminCode: true,
                errorMessage: `Extra verification required.`
            });
        }

        if (user.email.toLowerCase() === ROOT_ADMIN_EMAIL && adminCode !== ROOT_ADMIN_CODE) {
            return res.status(401).json({
                ok: false,
                errorType: `auth`,
                requiresAdminCode: true,
                errorMessage: `Admin code required.`
            });
        }

        const token = jwt.sign(
            {accountId: user.id, userID: user.id, email: user.email, is_admin: user.is_admin},
            process.env.JWT_SECRET,
            {expiresIn: `7d`}
        );

        res.status(200).json({
            ok: true,
            token,
            accountId: user.id,
            email: user.email,
            username: user.username,
            is_admin: user.is_admin,
        });
        
    }
    catch (error){
        console.error(error);
        res.status(500).json({
            ok: false,
            errorType: `server`,
            errorMessage: `server error`
        });
    }
};

const requestPasswordReset = async (req, res) => {
    try {
        const {email} = req.body;
        if (!email) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `please provide email`
            });
        }

        if (!process.env.SMTP_HOST) {
            return res.status(503).json({
                ok: false,
                errorType: `server`,
                errorMessage: `Password reset email is not configured yet.`
            });
        }

        await ensurePasswordResetTable();

        const usercheck = await db.query(`SELECT id, email FROM users WHERE email = $1`, [email]);
        const genericResponse = {
            ok: true,
            message: `If the email exists, a password reset link has been emailed.`
        };

        if (usercheck.rows.length === 0) {
            return res.status(200).json(genericResponse);
        }

        const user = usercheck.rows[0];
        const token = crypto.randomBytes(32).toString(`hex`);
        const tokenHash = hashResetToken(token);

        await db.query(
            `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL`,
            [user.id]
        );

        await db.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 || ' minutes')::interval)`,
            [user.id, tokenHash, RESET_TOKEN_MINUTES]
        );

        const resetUrl = buildResetUrl(req, token);
        await sendPasswordResetEmail(user.email, resetUrl);
        console.log(`Password reset email sent for ${user.email}`);

        res.status(200).json({
            ...genericResponse,
            expiresInMinutes: RESET_TOKEN_MINUTES
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            errorType: `server`,
            errorMessage: `server error`
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const {token, password} = req.body;
        if (!token || !password) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `please provide token and password`
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `password must be at least 6 characters`
            });
        }

        await ensurePasswordResetTable();

        const tokenHash = hashResetToken(token);
        const resetCheck = await db.query(
            `SELECT prt.id, prt.user_id
             FROM password_reset_tokens prt
             WHERE prt.token_hash = $1
               AND prt.used_at IS NULL
               AND prt.expires_at > CURRENT_TIMESTAMP`,
            [tokenHash]
        );

        if (resetCheck.rows.length === 0) {
            return res.status(400).json({
                ok: false,
                errorType: `auth`,
                errorMessage: `Invalid or expired reset link.`
            });
        }

        const reset = resetCheck.rows[0];
        const hashedpassword = await bcrypt.hash(password, 10);

        const client = await db.connect();
        try {
            await client.query(`BEGIN`);
            await client.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashedpassword, reset.user_id]);
            await client.query(
                `UPDATE password_reset_tokens
                 SET used_at = CURRENT_TIMESTAMP
                 WHERE id = $1 OR (user_id = $2 AND used_at IS NULL)`,
                [reset.id, reset.user_id]
            );
            await client.query(`COMMIT`);
        } catch (err) {
            await client.query(`ROLLBACK`);
            throw err;
        } finally {
            client.release();
        }

        res.status(200).json({
            ok: true,
            message: `Password updated. You can now log in.`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            errorType: `server`,
            errorMessage: `server error`
        });
    }
};

module.exports = {register, login, requestPasswordReset, resetPassword};
