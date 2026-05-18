const fs = require(`fs`);
const path = require(`path`);
const multer = require(`multer`);
const db = require(`../config/database`);
const {ROOT_ADMIN_EMAIL} = require(`../config/rootAdmin`);
const PUBLIC_GAME_ID = `case-clicker`;
const downloadsDir = process.env.DOWNLOADS_DIR || path.resolve(__dirname, `../../frontend/downloads`);
const allowedUploadExtensions = new Set([`.zip`, `.love`, `.exe`]);

fs.mkdirSync(downloadsDir, {recursive: true});

const sanitizeNamePart = (value) => {
    return String(value || `game-build`)
        .replace(/\.[^/.]+$/, ``)
        .replace(/[^a-zA-Z0-9._-]+/g, `-`)
        .replace(/^-+|-+$/g, ``)
        .slice(0, 80) || `game-build`;
};

const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, downloadsDir),
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname || ``).toLowerCase();
        const baseName = sanitizeNamePart(path.basename(file.originalname || `game-build`, extension));
        const stamp = new Date().toISOString().replace(/[:.]/g, `-`);
        cb(null, `${baseName}-${stamp}${extension || `.zip`}`);
    }
});

const gameUpload = multer({
    storage: uploadStorage,
    limits: {
        fileSize: Number(process.env.MAX_GAME_UPLOAD_BYTES || 300 * 1024 * 1024)
    },
    fileFilter: (req, file, cb) => {
        const extension = path.extname(file.originalname || ``).toLowerCase();
        if (!allowedUploadExtensions.has(extension)) {
            return cb(new Error(`Only .zip, .love and .exe uploads are allowed`));
        }
        cb(null, true);
    }
}).single(`file`);

const uploadGameFileMiddleware = (req, res, next) => {
    gameUpload(req, res, (error) => {
        if (!error) {
            return next();
        }

        const status = error instanceof multer.MulterError ? 400 : 415;
        return res.status(status).json({
            ok: false,
            errorType: `upload`,
            errorMessage: error.message
        });
    });
};

const getUsers = async (req, res) => { // hämtar alla användare
    try {
        const result = await db.query(
            `SELECT
                u.id,
                u.username,
                u.email,
                u.is_admin,
                u.created_at,
                COALESCE((s.save_data->>'level')::numeric, 0) AS level
             FROM users u
             LEFT JOIN saves s ON s.user_id = u.id AND s.game_id = $1
             ORDER BY u.created_at DESC, u.id DESC`
            ,
            [PUBLIC_GAME_ID]
        );

        res.json({
            ok: true,
            users: result.rows.map((user) => ({
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin,
                createdAt: user.created_at,
                level: Number(user.level || 0)
            }))
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

const updateUserAdminStatus = async (req, res) => { // uppdaterar en användares admin status, används för att ge eller ta bort admin rättigheter
    try {
        const userId = Number(req.params.id);
        const {isAdmin} = req.body;

        if (!Number.isInteger(userId)) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `invalid user id`
            });
        }

        if (typeof isAdmin !== `boolean`) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `isAdmin must be true or false`
            });
        }

        const protectedUser = await db.query(`SELECT email FROM users WHERE id = $1`, [userId]); //hämtar användade för att veta om den finns och för att skydda root admin så att den inte kan ändras
        if (protectedUser.rows.length === 0) {
            return res.status(404).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `user not found`
            });
        }

        if (protectedUser.rows[0].email.toLowerCase() === ROOT_ADMIN_EMAIL) { // root admin skyddas så att den inte kan ändras eller tas bort
            return res.status(403).json({
                ok: false,
                errorType: `auth`,
                errorMessage: `root admin cannot be changed`
            });
        }

        if (userId === req.userId && !isAdmin) { // skyddar så att admin inte kan ta bort sig själv från admin
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `you cannot remove admin from your own account`
            });
        }

        const result = await db.query( // uppdaterar admin status för användaren
            `UPDATE users
             SET is_admin = $1
             WHERE id = $2
             RETURNING id, username, email, is_admin`,
            [isAdmin, userId]
        );

        const user = result.rows[0]; // returnerar den uppdaterade användaren
        res.json({
            ok: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin
            }
        });
    } catch (error) { // tar hand om fel och skickar server error om något är fel
        console.error(error);
        res.status(500).json({
            ok: false,
            errorType: `server`,
            errorMessage: `server error`
        });
    }
};

const deleteUser = async (req, res) => { // tar bort en användare
    try {
        const userId = Number(req.params.id);

        if (!Number.isInteger(userId)) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `invalid user id`
            });
        }

        if (userId === req.userId) { // skyddar så att admin inte kan ta bort sig själv
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `you cannot delete your own account`
            });
        }

        const protectedUser = await db.query(`SELECT email FROM users WHERE id = $1`, [userId]); // hämtar användade för att veta om den finns och för att skydda root admin så att den inte kan ändras eller tas bort
        if (protectedUser.rows.length === 0) {
            return res.status(404).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `user not found`
            });
        }

        if (protectedUser.rows[0].email.toLowerCase() === ROOT_ADMIN_EMAIL) { // root admin skyddas så att den inte kan ändras eller tas bort
            return res.status(403).json({
                ok: false,
                errorType: `auth`,
                errorMessage: `root admin cannot be deleted`
            });
        }

        const result = await db.query( // tar bort användaren och returnerar den borttagna användaren
            `DELETE FROM users
             WHERE id = $1
             RETURNING id, username, email`,
            [userId]
        );

        res.json({ // returnerar den borttagna användaren
            ok: true,
            deletedUser: result.rows[0]
        });
    } catch (error) { // tar hand om fel och skickar server error om något är fel
        console.error(error);
        res.status(500).json({
            ok: false,
            errorType: `server`,
            errorMessage: `server error`
        });
    }
};

const uploadGameFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                ok: false,
                errorType: `upload`,
                errorMessage: `no file uploaded`
            });
        }

        res.status(201).json({
            ok: true,
            message: `file uploaded`,
            fileName: req.file.filename,
            downloadUrl: `/downloads/${req.file.filename}`,
            versionedDownloadUrl: `/downloads/${req.file.filename}`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            errorType: `upload`,
            errorMessage: `server error`
        });
    }
};

module.exports = {getUsers, updateUserAdminStatus, deleteUser, uploadGameFileMiddleware, uploadGameFile}; // exporterar funktionerna så att de kan användas i routes
