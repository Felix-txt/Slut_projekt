const API = "http://localhost:5001/api";
let users = [];
let search;
let usersList;

function getCurrentTokenPayload() {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
        const payload = token.split(".")[1];
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(atob(base64).split("").map((char) => {
            return `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`;
        }).join(""));

        return JSON.parse(json);
    } catch (error) {
        return null;
    }
}

function showAdminAccessMessage(message) {
    const adminSection = document.querySelector(".admin-section");
    const content = `
        <section class="admin-panel">
            <div class="panel-head">
                <div class="panel-head-left">
                    <h2>Admin access required</h2>
                </div>
            </div>
            <p class="admin-access-message">${escapeHtml(message)}</p>
            <a class="quick-upload-btn" href="../frontend/login-signin.html#login">Login</a>
        </section>
    `;

    if (adminSection) {
        adminSection.innerHTML = content;
    } else {
        document.body.insertAdjacentHTML("beforeend", `<div class="admin-section">${content}</div>`);
    }
}

function guardAdminPage() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "../frontend/login-signin.html#login";
        return false;
    }

    const payload = getCurrentTokenPayload();
    if (!payload?.is_admin) {
        showAdminAccessMessage("You are logged in, but this account is not an admin.");
        return false;
    }

    return true;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderUsers() {
    if (!usersList) return;

    const q = (search?.value || "").toLowerCase().trim();
    const filteredUsers = users.filter((user) => {
        const text = `${user.username} ${user.email}`.toLowerCase();
        return text.includes(q);
    });

    if (filteredUsers.length === 0) {
        usersList.innerHTML = `<li class="user-row user-row-muted">No users found.</li>`;
        return;
    }

    usersList.innerHTML = filteredUsers.map((user) => `
        <li class="user-row">
            <div>
                <strong>${escapeHtml(user.username)}${user.isAdmin ? ` <span class="admin-badge">Admin</span>` : ``}</strong>
                <p>${escapeHtml(user.email)}</p>
                <p>Balance: ${Number(user.balance).toFixed(2)}</p>
            </div>
            <a href="user-profile.html?id=${encodeURIComponent(user.id)}">Profil</a>
        </li>
    `).join("");
}

async function loadUsers() {
    if (!usersList) return;

    const token = localStorage.getItem("token");
    if (!token) {
        usersList.innerHTML = `<li class="user-row user-row-muted">Login as admin to view users.</li>`;
        return;
    }

    try {
        const res = await fetch(`${API}/admin/users`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const data = await res.json();

        if (!data.ok) {
            usersList.innerHTML = `<li class="user-row user-row-muted">${escapeHtml(data.errorMessage || "Could not load users.")}</li>`;
            return;
        }

        users = data.users || [];
        renderUsers();
    } catch (error) {
        usersList.innerHTML = `<li class="user-row user-row-muted">Could not connect to server.</li>`;
    }
}

function initAdminPanel() {
    const burger = document.getElementById("burger");
    const menu = document.getElementById("menu");

    if (burger && menu) {
        burger.addEventListener("click", function() {
            menu.classList.toggle("show");
        });

        document.addEventListener("click", function(event) {
            if (!menu.contains(event.target) && !burger.contains(event.target)) {
                menu.classList.remove("show");
            }
        });
    }

    search = document.getElementById("userSearch");
    usersList = document.getElementById("usersList");

    if (!guardAdminPage()) {
        return;
    }

    if (search) {
        search.addEventListener("input", renderUsers);
    }

    loadUsers();
}

document.addEventListener("DOMContentLoaded", initAdminPanel);
