const API = "/api";

async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, options);
    const text = await res.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("API response not JSON:", text);
        throw new Error(`Server returned ${res.status}`);
    }
}

function saveSession(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("accountId", data.accountId || "");
    localStorage.setItem("username", data.username || "");
    localStorage.setItem("email", data.email || "");
    localStorage.setItem("isAdmin", data.is_admin ? "true" : "false");
}

function loadRememberedLogin() {
    const savedEmail = localStorage.getItem("rememberedEmail") || "";
    const rememberMe = document.getElementById("rememberMe");
    const loginEmail = document.getElementById("loginEmail");

    if (savedEmail) {
        loginEmail.value = savedEmail;
        rememberMe.checked = true;
    }
}

function saveRememberedLogin(email) {
    if (document.getElementById("rememberMe").checked) {
        localStorage.setItem("rememberedEmail", email);
    } else {
        localStorage.removeItem("rememberedEmail");
    }
}

function showSignup() {
    document.getElementById("signupForm").classList.remove("hidden");
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("forgotForm").classList.add("hidden");
    document.getElementById("resetForm").classList.add("hidden");
    document.getElementById("signupBtn").classList.add("active");
    document.getElementById("loginBtn").classList.remove("active");
}

function showLogin() {
    document.getElementById("loginForm").classList.remove("hidden");
    document.getElementById("signupForm").classList.add("hidden");
    document.getElementById("forgotForm").classList.add("hidden");
    document.getElementById("resetForm").classList.add("hidden");
    document.getElementById("loginBtn").classList.add("active");
    document.getElementById("signupBtn").classList.remove("active");
}

function showForgotPassword() {
    const loginEmail = document.getElementById("loginEmail").value;
    document.getElementById("forgotEmail").value = loginEmail;
    document.getElementById("forgotMsg").textContent = "";
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("signupForm").classList.add("hidden");
    document.getElementById("resetForm").classList.add("hidden");
    document.getElementById("forgotForm").classList.remove("hidden");
    document.getElementById("signupBtn").classList.remove("active");
    document.getElementById("loginBtn").classList.remove("active");
}

function showResetPassword() {
    document.getElementById("resetMsg").textContent = "";
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("signupForm").classList.add("hidden");
    document.getElementById("forgotForm").classList.add("hidden");
    document.getElementById("resetForm").classList.remove("hidden");
    document.getElementById("signupBtn").classList.remove("active");
    document.getElementById("loginBtn").classList.remove("active");
}

async function signup() {
    const email = document.getElementById("signupEmail").value;
    const username = document.getElementById("signupUsername").value;
    const password = document.getElementById("signupPassword").value;
    const msg = document.getElementById("signupMsg");
    msg.textContent = "";

    try {
        console.log("Sending register request...");
        const data = await apiFetch("/auth/register", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, username, password})
        });
        console.log("Register response:", data);

        if (data.ok === false) {
            msg.textContent = data.errorMessage || "Could not create account";
            return;
        }
        if (!data.ok && !data.userID) {
            msg.textContent = data.errorMessage || "Unknown error";
            return;
        }

        // Registration succeeded - auto login
        

        const loginData = await apiFetch("/auth/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, password})
        });

        if (loginData.token) {
            saveSession(loginData);
            window.location.href = `account.html?id=${encodeURIComponent(loginData.accountId)}`;
        } else {
            msg.textContent = loginData.errorMessage || "Account created, but login failed";
        }
    } catch (error) {
        msg.textContent = "Could not connect to server";
    }
}

async function login() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const adminCode = document.getElementById("adminCode").value;
    const adminCodeWrap = document.getElementById("adminCodeWrap");
    const msg = document.getElementById("loginMsg");
    msg.textContent = "";

    try {
        console.log("Sending login request for:", email);
        const data = await apiFetch("/auth/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, password, adminCode})
        });
        console.log("Login response:", data);

        if (data.token) {
            saveSession(data);
            saveRememberedLogin(email);
            window.location.href = `account.html?id=${encodeURIComponent(data.accountId)}`;
        } else if (data.requiresAdminCode) {
            adminCodeWrap.classList.remove("hidden");
            document.getElementById("adminCode").focus();
            msg.textContent = data.errorMessage || "Extra verification required.";
        } else {
            msg.textContent = data.errorMessage || "Login failed";
        }
    } catch (error) {
        msg.textContent = "Could not connect to server";
    }
}

async function requestPasswordReset() {
    const email = document.getElementById("forgotEmail").value;
    const msg = document.getElementById("forgotMsg");
    msg.textContent = "";

    try {
        const data = await apiFetch("/auth/forgot-password", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email})
        });

        if (!data.ok) {
            msg.textContent = data.errorMessage || "Could not create reset link";
            return;
        }

        msg.textContent = data.message || "If the email exists, a reset link has been created.";
    } catch (error) {
        msg.textContent = "Could not connect to server";
    }
}

async function resetPassword() {
    const token = getResetTokenFromHash();
    const password = document.getElementById("resetPassword").value;
    const passwordConfirm = document.getElementById("resetPasswordConfirm").value;
    const msg = document.getElementById("resetMsg");
    msg.textContent = "";

    if (!token) {
        msg.textContent = "Reset link is missing or invalid.";
        return;
    }

    if (password !== passwordConfirm) {
        msg.textContent = "Passwords do not match.";
        return;
    }

    try {
        const data = await apiFetch("/auth/reset-password", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({token, password})
        });

        if (!data.ok) {
            msg.textContent = data.errorMessage || "Could not reset password";
            return;
        }

        msg.textContent = data.message || "Password updated. You can now log in.";
        window.location.hash = "login";
        setTimeout(showLogin, 1200);
    } catch (error) {
        msg.textContent = "Could not connect to server";
    }
}

function getResetTokenFromHash() {
    const hash = window.location.hash || "";
    if (!hash.startsWith("#reset=")) return "";
    return decodeURIComponent(hash.replace("#reset=", ""));
}

function checkHash() {
    const hash = window.location.hash;
    if (hash.startsWith('#reset=')) showResetPassword();
    else if (hash === '#signup') showSignup();
    else if (hash === '#forgot') showForgotPassword();
    else showLogin();
}

document.addEventListener('DOMContentLoaded', function() {
    loadRememberedLogin();
    checkHash();
});
window.addEventListener('hashchange', checkHash);

