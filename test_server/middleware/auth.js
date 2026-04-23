const jwt = require(`jsonwebtoken`);

const verifyToken = (req, res, next) => {
    const token = req.headers[`authorization`]?.split(` `)[1];
    if (!token) {
        return res.status(401).json({message: `no token provided`});
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    }
    catch (error) {
        return res.status(401).json({message: `invalid token`});
    }
}

module.exports = verifyToken;