const jwt = require(`jsonwebtoken`); // får fram JWT token

const verifyToken = (req, res, next) => { // verifierar JWT token
    const token = req.headers.authorization?.split(` `)[1];
    if (!token) {// om det inte finns en token, så skickas ett 401 error
        return res.status(401).json({
            ok: false,
            errorType: `auth`,
            errorMessage: `no token provided`
        });
    }

    try { // verifierar token och hämtar ut informationen från den, om det inte går så skickas ett 401 error
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.accountId || decoded.userID;
        req.accountId = req.userId;
        req.isAdmin = decoded.is_admin;
        next();
    }
    catch (error) { // om det inte går att verifiera token så skickas ett 401 error
        return res.status(401).json({
            ok: false,
            errorType: `auth`,
            errorMessage: `invalid token`
        });
    }
}

const verifyAdmin = (req, res, next) => { // verifierar att användaren är admin, används för admin routes
    const token = req.headers.authorization?.split(` `)[1];
    if (!token) {
        return res.status(401).json({
            ok: false,
            errorType: `auth`,
            errorMessage: `no token provided`
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.is_admin) {
            return res.status(403).json({
                ok: false,
                errorType: `auth`,
                errorMessage: `admin access required`
            });
        }
        req.userId = decoded.accountId || decoded.userID;
        req.accountId = req.userId;
        req.isAdmin = true;
        next();
    }
    catch (error) {
        return res.status(401).json({
            ok: false,
            errorType: `auth`,
            errorMessage: `invalid token`
        });
    }
}

module.exports = {verifyToken, verifyAdmin}; // exporterar funktionerna så att de kan användas i andra filer, t.ex. i routes
