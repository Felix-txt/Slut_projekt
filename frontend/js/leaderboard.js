const API = "/api";
let currentSort = "money";

async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, options);
    const text = await res.text();
    return text ? JSON.parse(text) : {};


    throw lastError || new Error("Could not connect to server");
}

document.getElementById("burger").addEventListener("click", function() {
    document.getElementById("menu").classList.toggle("show");
});

document.addEventListener('click', function(event) {
    const menu = document.getElementById("menu")
    const burger = document.getElementById("burger")

    if (!menu.contains(event.target) && !burger.contains(event.target)){
        menu.classList.remove('show');
    }
});

function checkAuth(){ // kollar om anvÃ¤'ndaren Ã¤r logged in eller inte
    const token = localStorage.getItem("token");
    if (token){
        document.getElementById("authButtons").style.display = "none";
        document.getElementById("accountChip").style.display = "flex";
        document.getElementById("accountName").textContent = localStorage.getItem("username") || localStorage.getItem("email") || "Logged in";
    }
}

function clearSessionUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("accountId");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("isAdmin");
}

function logout() {
    clearSessionUser();
    document.getElementById("authButtons").style.display = "flex";
    document.getElementById("accountChip").style.display = "none";
    window.location.href = "login-signin.html#login";
}

function goLogin() {
    window.location.href = "login-signin.html";
}

function goSignup() {
    window.location.href = "login-signin.html";
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString("sv-SE");
}

function getMainScore(row) {
    if (currentSort === "level") return `Lvl ${formatNumber(row.level)}`;
    if (currentSort === "casesOpened") return `${formatNumber(row.totalCasesOpened)} cases`;
    if (currentSort === "inventoryCount") return `${formatNumber(row.inventoryCount)} items`;
    return `$${formatNumber(row.money)}`;
}

function renderLeaderboard(rows) {
    const list = document.getElementById("leaderboardList");

    if (!rows.length) {
        list.innerHTML = `<div class="empty-state">No leaderboard saves yet.</div>`;
        return;
    }

    list.innerHTML = rows.map((row) => `
        <div class="player">
            <div class="avatar">#${escapeHtml(row.rank)}</div>
            <div class="info">
                <div class="player-top">
                    <div class="name">${escapeHtml(row.username)}</div>
                    <div class="score">${escapeHtml(getMainScore(row))}</div>
                </div>
                <div class="stats">
                    <span>Level ${formatNumber(row.level)}</span>
                    <span>$${formatNumber(row.money)}</span>
                    <span>${formatNumber(row.totalCasesOpened)} cases</span>
                    <span>${formatNumber(row.inventoryCount)} items</span>
                </div>
            </div>
        </div>
    `).join("");
}

async function loadLeaderboard(sort = currentSort) {
    currentSort = sort;
    const list = document.getElementById("leaderboardList");
    list.innerHTML = `<div class="empty-state">Loading leaderboard...</div>`;

    try {
        const data = await apiFetch(`/leaderboard?sort=${encodeURIComponent(currentSort)}&limit=50`);

        if (!data.ok) {
            list.innerHTML = `<div class="empty-state">${escapeHtml(data.errorMessage || "Could not load leaderboard.")}</div>`;
            return;
        }

        renderLeaderboard(data.rows || []);
    } catch (error) {
        list.innerHTML = `<div class="empty-state">Could not connect to server.</div>`;
    }
}

document.querySelectorAll(".sort-btn").forEach((button) => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".sort-btn").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        loadLeaderboard(button.dataset.sort);
    });
});

function goAccount() {
    const accountId = localStorage.getItem("accountId");
    window.location.href = accountId ? `account.html?id=${encodeURIComponent(accountId)}` : "account.html";
}

checkAuth();
loadLeaderboard();

