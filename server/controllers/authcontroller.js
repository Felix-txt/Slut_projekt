const db = require(`../config/database`);
const bcrypt = require(`bcryptjs`);
const jwt = require(`jsonwebtoken`);
const {ROOT_ADMIN_EMAIL, ROOT_ADMIN_CODE} = require(`../config/rootAdmin`);

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

        const token = jwt.sign({userID: user.id, is_admin: user.is_admin}, process.env.JWT_SECRET, {expiresIn: `7d`});

        res.status(200).json({
            ok: true,
            token,
            accountId: user.id,
            email: user.email,
            username: user.username,
            is_admin: user.is_admin,
            profile_picture: user.profile_picture
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

module.exports = {register, login};
