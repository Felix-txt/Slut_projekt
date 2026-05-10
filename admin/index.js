const API_CANDIDATES = getApiCandidates();
const ROOT_ADMIN_EMAIL = "admin@test.local";
let users = [];
let search;
let usersList;
let usersTableBody;
let usersCount;
let currentAdminId;

function getApiCandidates() {
    const host = window.location.hostname || "localhost";
    const protocol = window.location.protocol === "file:" ? "http:" : window.location.protocol;
    const candidates = [];

    if (window.location.protocol !== "file:" && window.location.port === "8090") {
        candidates.push(`${window.location.origin}/api`);
    }

    if (window.location.protocol !== "file:" && (window.location.port === "5000" || window.location.port === "5001")) {
        candidates.push(`${window.location.origin}/api`);
    }

    candidates.push(`${protocol}//${host}:5001/api`);
    candidates.push(`${protocol}//${host}:5000/api`);

    return [...new Set(candidates)];
}

async function apiFetch(path, options = {}) {
    let lastError = null;

    for (const baseUrl of API_CANDIDATES) {
        try {
            const res = await fetch(`${baseUrl}${path}`, options);
            const text = await res.text();
            return text ? JSON.parse(text) : {};
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("Could not connect to server");
}

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
    const adminSection = document.querySelector(".admin-section") || document.querySelector(".admin-page");
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

function renderAccountName() {
    const accountName = document.getElementById("accountName");
    if (!accountName) return;

    accountName.textContent = localStorage.getItem("username") || localStorage.getItem("email") || "Logged in";
}

function clearSessionUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("accountId");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("profilePicture");
}

function logout() {
    clearSessionUser();
    window.location.href = "../frontend/login-signin.html#login";
}

function guardAdminPage() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "../frontend/login-signin.html#login";
        return false;
    }

    const payload = getCurrentTokenPayload();
    if (!payload || !payload.is_admin) {
        showAdminAccessMessage("You are logged in, but this account is not an admin.");
        return false;
    }

    currentAdminId = payload.accountId || payload.userID;
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
    const q = ((search && search.value) || "").toLowerCase().trim();
    const filteredUsers = users.filter((user) => {
        const text = `${user.username} ${user.email}`.toLowerCase();
        return text.includes(q);
    });

    if (usersCount) {
        usersCount.textContent = `${filteredUsers.length} user${filteredUsers.length === 1 ? "" : "s"}`;
    }

    renderUsersList(filteredUsers);
    renderUsersTable(filteredUsers);
}

function renderUsersList(filteredUsers) {
    if (!usersList) return;

    if (filteredUsers.length === 0) {
        usersList.innerHTML = `<li class="user-row user-row-muted">No users found.</li>`;
        return;
    }

    usersList.innerHTML = filteredUsers.map((user) => `
        <li class="user-row">
            <div>
                <strong>${escapeHtml(user.username)}${getUserRoleBadges(user)}</strong>
                <p>${escapeHtml(user.email)}</p>
                <p>Balance: ${Number(user.balance).toFixed(2)}</p>
            </div>
            <a href="user-profile.html?id=${encodeURIComponent(user.id)}">Profil</a>
        </li>
    `).join("");
}

function renderUsersTable(filteredUsers) {
    if (!usersTableBody) return;

    if (filteredUsers.length === 0) {
        usersTableBody.innerHTML = `<tr><td colspan="7" class="table-message">No users found.</td></tr>`;
        return;
    }

    usersTableBody.innerHTML = filteredUsers.map((user) => `
        <tr>
            <td>#${escapeHtml(user.id)}</td>
            <td>
                <strong>${escapeHtml(user.username)}</strong>
            </td>
            <td>${escapeHtml(user.email)}</td>
            <td>${getUserRoleBadges(user) || `<span class="user-badge">User</span>`}</td>
            <td>${Number(user.balance).toFixed(2)}</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="table-actions">
                    <a class="table-action" href="user-profile.html?id=${encodeURIComponent(user.id)}">Profil</a>
                    <button class="table-action table-action-secondary" type="button" data-action="toggle-admin" data-user-id="${escapeHtml(user.id)}" ${isProtectedUser(user) ? "disabled" : ""}>
                        ${user.isAdmin ? "Demote" : "Promote"}
                    </button>
                    <button class="table-action table-action-danger" type="button" data-action="delete-user" data-user-id="${escapeHtml(user.id)}" ${isProtectedUser(user) ? "disabled" : ""}>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join("");
}

function isCurrentAdmin(userId) {
    return Number(userId) === Number(currentAdminId);
}

function isRootAdmin(user) {
    return user && String(user.email).toLowerCase() === ROOT_ADMIN_EMAIL;
}

function isProtectedUser(user) {
    return isCurrentAdmin(user.id) || isRootAdmin(user);
}

function getUserRoleBadges(user) {
    let badges = "";

    if (user.isAdmin) {
        badges += ` <span class="admin-badge">Admin</span>`;
    }

    if (isRootAdmin(user)) {
        badges += ` <span class="root-badge">Root</span>`;
    }

    return badges;
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("sv-SE");
}

async function loadUsers() {
    if (!usersList && !usersTableBody) return;

    const token = localStorage.getItem("token");
    if (!token) {
        showUsersError("Login as admin to view users.");
        return;
    }

    try {
        const data = await apiFetch("/admin/users", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!data.ok) {
            showUsersError(data.errorMessage || "Could not load users.");
            return;
        }

        users = data.users || [];
        renderUsers();
    } catch (error) {
        showUsersError("Could not connect to server.");
    }
}

async function setUserAdminStatus(userId, isAdmin) {
    const token = localStorage.getItem("token");

    try {
        const data = await apiFetch(`/admin/users/${encodeURIComponent(userId)}/admin`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({isAdmin})
        });

        if (!data.ok) {
            alert(data.errorMessage || "Could not update admin status.");
            return;
        }

        await loadUsers();
    } catch (error) {
        alert("Could not connect to server.");
    }
}

async function deleteUser(userId) {
    const user = users.find((item) => Number(item.id) === Number(userId));
    const label = user ? `${user.username} (${user.email})` : `#${userId}`;

    if (!confirm(`Delete ${label}? This cannot be undone.`)) {
        return;
    }

    const token = localStorage.getItem("token");

    try {
        const data = await apiFetch(`/admin/users/${encodeURIComponent(userId)}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!data.ok) {
            alert(data.errorMessage || "Could not delete user.");
            return;
        }

        await loadUsers();
    } catch (error) {
        alert("Could not connect to server.");
    }
}

function handleUsersTableClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const userId = button.getAttribute("data-user-id");
    const user = users.find((item) => Number(item.id) === Number(userId));
    if (!user) return;

    if (button.getAttribute("data-action") === "toggle-admin") {
        setUserAdminStatus(userId, !user.isAdmin);
    }

    if (button.getAttribute("data-action") === "delete-user") {
        deleteUser(userId);
    }
}

function showUsersError(message) {
    const safeMessage = escapeHtml(message);

    if (usersList) {
        usersList.innerHTML = `<li class="user-row user-row-muted">${safeMessage}</li>`;
    }

    if (usersTableBody) {
        usersTableBody.innerHTML = `<tr><td colspan="7" class="table-message">${safeMessage}</td></tr>`;
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
    usersTableBody = document.getElementById("usersTableBody");
    usersCount = document.getElementById("usersCount");

    renderAccountName();

    if (!guardAdminPage()) {
        return;
    }

    if (search) {
        search.addEventListener("input", renderUsers);
    }

    if (usersTableBody) {
        usersTableBody.addEventListener("click", handleUsersTableClick);
    }

    loadUsers();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdminPanel);
} else {
    initAdminPanel();
}
