const jwt = require(`jsonwebtoken`);

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(` `)[1];
    if (!token) {
        return res.status(401).json({message: `no token provided`});
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userID;
        req.isAdmin = decoded.is_admin;
        next();
    }
    catch (error) {
        return res.status(401).json({message: `invalid token`});
    }
}

const verifyAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(` `)[1];
    if (!token) {
        return res.status(401).json({message: `no token provided`});
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.is_admin) {
            return res.status(403).json({message: `admin access required`});
        }
        req.userId = decoded.userID;
        req.isAdmin = true;
        next();
    }
    catch (error) {
        return res.status(401).json({message: `invalid token`});
    }
}

module.exports = {verifyToken, verifyAdmin};