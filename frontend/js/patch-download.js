const API = "/api";

function decodeJwtPayload(token) {
    try {
        if (!token || typeof token !== "string") return null;
        const parts = token.trim().split(".");
        if (parts.length !== 3) return null;
        const payload = parts[1];
        if (!payload) return null;
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const decoded = atob(base64);
        try {
            return JSON.parse(decoded);
        } catch (e) {
            const bytes = new Uint8Array(decoded.length);
            for (let i = 0; i < decoded.length; i++) {
                bytes[i] = decoded.charCodeAt(i);
            }
            return JSON.parse(new TextDecoder().decode(bytes));
        }
    } catch (e) {
        return null;
    }
}

function getStoredSessionUser() {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const storedUser = {
        id: Number(localStorage.getItem("accountId")) || null,
        username: localStorage.getItem("username") || "",
        email: localStorage.getItem("email") || "",
        is_admin: localStorage.getItem("isAdmin") === "true"
    };
    const parsed = decodeJwtPayload(token);
    if (parsed) {
        storedUser.id = Number(parsed.accountId || parsed.userID || parsed.sub || parsed.id) || storedUser.id;
        if (parsed.email) storedUser.email = parsed.email;
        if (parsed.username || parsed.name) storedUser.username = parsed.username || parsed.name || "";
        storedUser.is_admin = parsed.is_admin === true || storedUser.is_admin;
    }
    return storedUser.id ? storedUser : null;
}

function renderHeader() {
    const viewer = getStoredSessionUser();
    const authButtons = document.getElementById("authButtons");
    const accountChip = document.getElementById("accountChip");
    const accountName = document.getElementById("accountName");
    const accountMenuLink = document.getElementById("accountMenuLink");

    if (!viewer) {
        authButtons.classList.add("show");
        accountChip.classList.remove("show");
        if (accountMenuLink) accountMenuLink.href = "../account.html";
        return;
    }

    authButtons.classList.remove("show");
    accountChip.classList.add("show");
    accountName.textContent = viewer.username || viewer.email || "Logged in";
    if (accountMenuLink) accountMenuLink.href = `../account.html?id=${encodeURIComponent(viewer.id)}`;
}

document.getElementById("burger").addEventListener("click", function() {
    document.getElementById("menu").classList.toggle("show");
});

document.addEventListener("click", function(event){

    const menu = document.getElementById("menu");
    const burger = document.getElementById("burger");

    if(!menu.contains(event.target) && !burger.contains(event.target)){
        menu.classList.remove("show");
    }
});

const downloadBtn = document.getElementById("downloadBtn");
const overlay = document.getElementById("pageOverlay");

if (downloadBtn && overlay) {
    downloadBtn.addEventListener("mouseenter", () => {
        overlay.classList.add("active");
    });

    downloadBtn.addEventListener("mouseleave", () => {
        overlay.classList.remove("active");
    });
}


function goLogin(){
    window.location.href = "../login-signin.html#login";
}

function goSignup(){
    window.location.href = "../login-signin.html#signup";
}

function downloadClient(){
    window.location.href = "../../downloads/LuCS-Clicker-latest.zip";
}

function goAccount() {
    const viewer = getStoredSessionUser();
    if (viewer) {
        window.location.href = `../account.html?id=${encodeURIComponent(viewer.id)}`;
        return;
    }
    window.location.href = "../login-signin.html#login";
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("accountId");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("isAdmin");
    renderHeader();
}

renderHeader();

