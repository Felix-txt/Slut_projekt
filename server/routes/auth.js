const express = require(`express`);
const router = express.Router();
const { register, login, requestPasswordReset, resetPassword } = require(`../controllers/authcontroller`);

router.post(`/register`, register); // route för att registrera en ny användare, skickar data till authcontroller där det hanteras, ingen autentisering krävs för att registrera sig
router.post(`/login`, login); // route för att logga in, skickar data till authcontroller där det hanteras, ingen autentisering krävs för att logga in
router.post(`/forgot-password`, requestPasswordReset); // route för att begära en lösenordsåterställning, skickar data till authcontroller där det hanteras, ingen autentisering krävs för att begära en lösenordsåterställning
router.post(`/reset-password`, resetPassword); // route för att återställa lösenordet, skickar data till authcontroller där det hanteras, ingen autentisering krävs för att återställa lösenordet

module.exports = router; // exporterar routern så att den kan användas i server.js
