function getApiBase() {
    const isLocalStaticPage = (
        window.location.protocol === "file:" ||
        ["127.0.0.1", "localhost"].includes(window.location.hostname) &&
        !["80", "90", "5000", "5001"].includes(window.location.port)
    );

    return isLocalStaticPage ? "http://localhost:5001/api" : "/api";
}

const API = getApiBase();
let latestPublishedGame = null;

function resolveDownloadUrl(downloadUrl) {
    if (!downloadUrl) return "";
    if (/^https?:\/\//i.test(downloadUrl)) return downloadUrl;

    if (API.startsWith("http://") || API.startsWith("https://")) {
        return new URL(downloadUrl, API.replace(/\/api\/?$/, "/")).href;
    }

    return downloadUrl;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function splitPatchNotes(description) {
    return String(description || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function renderPatchFallback(message) {
    const patchTitle = document.getElementById("patchTitle");
    const patchSummary = document.getElementById("patchSummary");
    const patchNotesList = document.getElementById("patchNotesList");

    if (patchTitle) patchTitle.textContent = "PATCH";
    if (patchSummary) patchSummary.textContent = message;
    if (patchNotesList) {
        patchNotesList.innerHTML = `
            <div class="patch-note">
                <h3>No patch notes found</h3>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }
}

function renderLatestPatch(game) {
    latestPublishedGame = game;

    const patchTitle = document.getElementById("patchTitle");
    const patchSummary = document.getElementById("patchSummary");
    const patchNotesList = document.getElementById("patchNotesList");
    const notes = splitPatchNotes(game.description);
    const versionText = game.version ? `PATCH ${game.version}` : "PATCH";

    if (patchTitle) patchTitle.textContent = versionText;
    if (patchSummary) patchSummary.textContent = game.title || "Latest published build";

    if (!patchNotesList) return;

    if (!notes.length) {
        patchNotesList.innerHTML = `
            <div class="patch-note">
                <h3>${escapeHtml(versionText)}</h3>
                <p>No patch notes were added for this upload.</p>
            </div>
        `;
        return;
    }

    patchNotesList.innerHTML = notes.map((note, index) => `
        <div class="patch-note">
            <h3>${index === 0 ? escapeHtml(versionText) : `Note ${index + 1}`}</h3>
            <p>${escapeHtml(note)}</p>
        </div>
    `).join("");
}

async function loadLatestPatch() {
    try {
        const res = await fetch(`${API}/games/all`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);

        const games = await res.json();
        const latestGame = Array.isArray(games) ? games.find((game) => game.download_url) : null;

        if (!latestGame) {
            renderPatchFallback("No published upload exists yet.");
            return;
        }

        renderLatestPatch(latestGame);
    } catch (error) {
        console.error("Could not load latest patch:", error);
        renderPatchFallback("Could not load the latest patch from the server.");
    }
}

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
    const startDownload = (game) => {
        if (!game?.download_url) throw new Error("No uploaded game file found");
        window.location.href = resolveDownloadUrl(game.download_url);
    };

    if (latestPublishedGame) {
        startDownload(latestPublishedGame);
        return;
    }

    fetch(`${API}/games/all`)
        .then((res) => {
            if (!res.ok) throw new Error("Could not load download link");
            return res.json();
        })
        .then((games) => {
            const latestGame = Array.isArray(games) ? games.find((game) => game.download_url) : null;
            startDownload(latestGame);
        })
        .catch((error) => {
            console.error(error);
            alert("Ingen uppladdad fil hittades att ladda ner.");
        });
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
loadLatestPatch();

