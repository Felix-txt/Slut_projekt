const db = require(`../config/database`);
const bcrypt = require(`bcryptjs`);
const jwt = require(`jsonwebtoken`);

const register = async (req, res) => {
    try {
        const {username, email, password} = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({message: `please provide username, email and password`});
        }
    
        const usercheck = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
        if (usercheck.rows.length > 0) {
            return res.status(400).json({message: `email already in use`});
        }

        const hashedpassword = await bcrypt.hash(password, 10);

        const result = await db.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id', [username, email, hashedpassword]);

        res.status(201).json({message: `user registered successfully`, userID: result.rows[0].id});

    } 
    catch (error) {
        console.error(error);
        res.status(500).json({message: `server error`});
    }
};

const login = async (req, res) => {
    try {
        const {email, password} = req.body;
        if (!email || !password) {
            return res.status(400).json({message: `please provide email and password`});
        }
        
        const usercheck = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
        if (usercheck.rows.length === 0) {
            return res.status(400).json({message: `incorrect email`});
        }

        const user = usercheck.rows[0];

        const passwordvalid = await bcrypt.compare(password, user.password);
        if (!passwordvalid) {
            return res.status(400).json({message: `incorrect password`});
        }

        const token = jwt.sign({userID: user.id}, process.env.JWT_SECRET, {expiresIn: `7d`});

        res.status(200).json({message: `login successful`, token});
        
    }
    catch (error){
        console.error(error);
        res.status(500).json({message: `server error`});
    }
};

module.exports = {register, login};