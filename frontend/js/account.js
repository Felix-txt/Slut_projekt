const API = "http://100.126.153.254:5000/api";
const GAME_ID = "case-clicker";
const DEFAULT_PROFILE_PIC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fff'%3E%3Cpath d='M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z'/%3E%3C/svg%3E";

let editing = "";
let viewer = null;
let activeProfile = null;
let canEdit = false;
let activeStats = {level: 0, money: 0, inventoryCount: 0, totalCasesOpened: 0};
let hasCloudSave = false;
let checkedCloudSave = false;
let activeInventoryItems = [];
let lastInventoryOptions = {};
let selectedInventoryIndex = -1;
let activeSort = "value";

const els = {
    burger: document.getElementById("burger"),
    menu: document.getElementById("menu"),
    accountPage: document.getElementById("accountPage"),
    authButtons: document.getElementById("authButtons"),
    accountChip: document.getElementById("accountChip"),
    accountName: document.getElementById("accountName"),
    accountMenuLink: document.getElementById("accountMenuLink"),
    smallPic: document.getElementById("smallPic"),
    usernameText: document.getElementById("usernameText"),
    emailText: document.getElementById("emailText"),
    infoName: document.getElementById("infoName"),
    infoId: document.getElementById("infoId"),
    infoMail: document.getElementById("infoMail"),
    infoLevel: document.getElementById("infoLevel"),
    infoCoins: document.getElementById("infoCoins"),
    infoSync: document.getElementById("infoSync"),
    warning: document.getElementById("warning"),
    inventoryToggle: document.getElementById("inventoryToggle"),
    inventory: document.getElementById("inventory"),
    inventoryTitle: document.getElementById("inventoryTitle"),
    inventoryMeta: document.getElementById("inventoryMeta"),
    inventoryGrid: document.getElementById("inventoryGrid"),
    itemDetails: document.getElementById("itemDetails"),
    modalBg: document.getElementById("modalBg"),
    modalTitle: document.getElementById("modalTitle"),
    editInput: document.getElementById("editInput")
};

els.burger.onclick = function() {
    els.menu.classList.toggle("show");
};

document.addEventListener("click", function(event) {
    if (!els.menu.contains(event.target) && !els.burger.contains(event.target)){
        els.menu.classList.remove("show");
    }
});

async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, options);
    const text = await res.text();
    if (!text) return {};
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("API returned non-JSON:", text.slice(0, 200));
        throw new Error(`Server returned ${res.status}`);
    }

    if (!res.ok) {
        const error = new Error(data.errorMessage || "Request failed");
        error.status = res.status;
        error.data = data;
        throw error;
    }

    return data;
}

function getToken() {
    return localStorage.getItem("token");
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

function authHeaders() {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
    };
}

function requestedAccountId() {
    const id = Number(new URLSearchParams(window.location.search).get("id"));
    return Number.isInteger(id) && id > 0 ? id : null;
}

function syncKey(accountId) {
    return `gameSynced:${accountId}`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number.toLocaleString("sv-SE") : String(value);
}

function persistSessionUser(user) {
    localStorage.setItem("accountId", user.id);
    localStorage.setItem("username", user.username || "");
    localStorage.setItem("email", user.email || "");
    localStorage.setItem("isAdmin", user.is_admin ? "true" : "false");
}

function profilePicKey(accountId) {
    return `profilePic:${accountId}`;
}

function renderProfilePicture(profile) {
    const accountId = profile?.id;
    const savedPic = accountId ? localStorage.getItem(profilePicKey(accountId)) : "";
    const picture = savedPic || DEFAULT_PROFILE_PIC;

    if (els.bigPic) els.bigPic.src = picture;
    if (els.smallPic) els.smallPic.src = picture;
    if (els.avatar) els.avatar.classList.add("has-pic");
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
    console.log("JWT payload:", parsed);
    if (parsed) {
        storedUser.id = Number(parsed.accountId || parsed.userID || parsed.sub || parsed.id) || storedUser.id;
        if (parsed.email) storedUser.email = parsed.email;
        if (parsed.username || parsed.name) storedUser.username = parsed.username || parsed.name || "";
        storedUser.is_admin = parsed.is_admin === true || storedUser.is_admin;
    }

    return storedUser.id ? storedUser : null;
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
    viewer = null;
    activeProfile = null;
    canEdit = false;
    hasCloudSave = false;
    checkedCloudSave = false;
    renderHeader();
    window.location.href = "login-signin.html#login";
}

async function loadViewer() {
    return getStoredSessionUser();
}

async function loadPublicProfile(accountId) {
    const data = await apiFetch(`/users/${encodeURIComponent(accountId)}`);
    return data.user;
}

function renderHeader() {
    if (!viewer) {
        els.authButtons.style.display = "flex";
        els.accountChip.style.display = "none";
        return;
    }

    els.authButtons.style.display = "none";
    els.accountChip.style.display = "flex";
    els.accountName.textContent = viewer.username || viewer.email || "Logged in";
    els.accountMenuLink.href = `account.html?id=${encodeURIComponent(viewer.id)}`;
}

function renderEditMode() {
    els.accountPage.classList.toggle("view-only", !canEdit);
    document.querySelectorAll(".change-btn").forEach((button) => {
        button.disabled = !canEdit;
    });
}

function renderProfile(profile) {
    console.log("renderProfile profile:", JSON.stringify(profile));
    console.log("renderProfile canEdit:", canEdit);
    const username = profile?.username || "USER NAME";
    const email = canEdit ? profile?.email || "MAIL" : "Private";

    document.title = canEdit ? "CS Clicker - Your Account" : `CS Clicker - ${username}`;
    els.inventoryTitle.textContent = `${username}'s Inventory`;
    els.usernameText.textContent = username;
    els.emailText.textContent = email;
    els.infoName.textContent = `Name: ${username}`;
    els.infoId.textContent = `ID: ${profile?.id || "Unknown"}`;
    els.infoMail.textContent = `Mail: ${email}`;

    renderStats(profile?.stats || activeStats);
    renderProfilePicture(profile);
    updateSyncState();
}

function renderStats(stats) {
    activeStats = {
        level: Number(stats?.level || 0),
        money: Number(stats?.money || 0),
        inventoryCount: Number(stats?.inventoryCount || 0),
        totalCasesOpened: Number(stats?.totalCasesOpened || 0)
    };

    els.infoLevel.textContent = `Level: ${formatNumber(activeStats.level)}`;
    els.infoCoins.textContent = `Coins: ${formatNumber(activeStats.money)}`;
}

function updateSyncState() {
    if (!activeProfile || !canEdit) {
        els.warning.style.display = "none";
        els.infoSync.textContent = "View only";
        return;
    }

    const syncedLocally = localStorage.getItem(syncKey(activeProfile.id)) === "true";
    const synced = syncedLocally || hasCloudSave;

    if (!synced && !checkedCloudSave) {
        els.infoSync.textContent = "Checking...";
        els.warning.style.display = "none";
        return;
    }

    els.infoSync.textContent = synced ? "Synced" : "Not synced";
    els.warning.style.display = synced ? "none" : "block";
}

async function loadOwnerSnapshot() {
    try {
        const save = await apiFetch(`/saves/load/${encodeURIComponent(GAME_ID)}`, {
            headers: authHeaders()
        });
        const snapshot = save.snapshot || null;
        hasCloudSave = Boolean(snapshot);
        checkedCloudSave = true;
        const items = normalizeInventory(snapshot);

        renderStats(statsFromSnapshot(snapshot, items));
        renderInventory(items, {
            emptyMessage: snapshot ? "Inventory is empty in your latest game save." : "No cloud save found yet.",
            updatedAt: save.updatedAt || snapshot?.savedAt,
            declaredCount: Number(snapshot?.inventoryCount ?? items.length)
        });
        updateSyncState();
    } catch (error) {
        hasCloudSave = false;
        checkedCloudSave = true;
        renderStats({});
        renderInventory([], {
            emptyMessage: "Could not load game inventory from cloud save."
        });
        updateSyncState();
    }
}

async function loadPublicSnapshot(accountId) {
    try {
        const save = await apiFetch(`/saves/public/${encodeURIComponent(accountId)}/${encodeURIComponent(GAME_ID)}`);
        const snapshot = save.snapshot || null;
        const items = normalizeInventory(snapshot);

        renderStats(statsFromSnapshot(snapshot, items));
        renderInventory(items, {
            emptyMessage: snapshot ? "Inventory is empty in this player's latest game save." : "No public cloud save found yet.",
            updatedAt: save.updatedAt || snapshot?.savedAt,
            declaredCount: Number(snapshot?.inventoryCount ?? items.length)
        });
    } catch (error) {
        renderInventory([], {
            emptyMessage: "Could not load this player's game inventory."
        });
    }
}

function statsFromSnapshot(snapshot, items) {
    if (!snapshot) {
        return {level: 0, money: 0, inventoryCount: 0, totalCasesOpened: 0};
    }

    return {
        level: Number(snapshot.level || 0),
        money: Number(snapshot.money || snapshot.coins || snapshot.balance || 0),
        inventoryCount: Number(snapshot.inventoryCount ?? items.length),
        totalCasesOpened: Number(snapshot.stats?.totalCasesOpened || snapshot.totalCasesOpened || 0)
    };
}

function normalizeInventory(snapshot) {
    if (!snapshot) return [];

    const rawInventory = snapshot.inventory || snapshot.items || snapshot.skins || [];

    if (Array.isArray(rawInventory)) {
        return rawInventory;
    }

    if (rawInventory && typeof rawInventory === "object") {
        return Object.entries(rawInventory).map(([key, value]) => {
            if (value && typeof value === "object" && !Array.isArray(value)) {
                return {
                    id: value.id || key,
                    ...value,
                    name: value.name || value.displayName || value.display_name || key
                };
            }

            return {
                id: key,
                name: key,
                count: value
            };
        });
    }

    return [];
}

function pickFirst(item, keys) {
    if (!item || typeof item !== "object") return "";

    for (const key of keys) {
        if (item[key] !== undefined && item[key] !== null && item[key] !== "") {
            return item[key];
        }
    }

    return "";
}

function inventoryType(item) {
    if (!item || typeof item !== "object") return "skin";

    const explicitType = String(pickFirst(item, ["type", "itemType", "item_type", "category", "class"]) || "").toLowerCase();
    const name = String(pickFirst(item, ["name", "displayName", "display_name"]) || "").toLowerCase();

    if (explicitType.includes("key") || name.includes(" key")) return "key";
    if (item.crate_id || explicitType.includes("crate") || explicitType.includes("case") || name.includes(" case")) return "case";
    if (explicitType.includes("weapon")) return "weapon";
    if (explicitType.includes("skin")) return "skin";

    return "skin";
}

function inventoryLabel(item, index) {
    if (typeof item === "string") return item;
    if (typeof item === "number") return `Item ${index + 1}`;

    return pickFirst(item, [
        "name",
        "displayName",
        "display_name",
        "skinName",
        "skin_name",
        "itemName",
        "item_name",
        "weaponName",
        "weapon_name"
    ]) || `Item ${index + 1}`;
}

function inventoryImage(item) {
    return pickFirst(item, [
        "image",
        "imageUrl",
        "image_url",
        "icon",
        "iconUrl",
        "icon_url",
        "thumbnail",
        "thumbnailUrl",
        "thumbnail_url"
    ]);
}

function inventoryMeta(item) {
    if (!item || typeof item !== "object") return "";

    const parts = [];
    const rarity = pickFirst(item, ["rarity", "quality", "tier"]);
    const weapon = pickFirst(item, ["weapon", "weaponType", "weapon_type"]);
    const wear = pickFirst(item, ["wear", "float", "floatValue", "float_value"]);
    const price = pickFirst(item, ["price", "value", "marketValue", "market_value", "min_price"]);
    const count = pickFirst(item, ["count", "amount", "quantity", "qty"]);

    if (rarity) parts.push(rarity);
    if (weapon) parts.push(weapon);
    if (wear) parts.push(`Wear ${wear}`);
    if (price) parts.push(`Value ${formatNumber(price)}`);
    if (count && Number(count) > 1) parts.push(`x${count}`);
    if (item.stattrak || item.is_stattrak) parts.push("StatTrak");
    if (item.souvenir || item.is_souvenir) parts.push("Souvenir");

    return parts.join(" | ");
}

function detailValue(item, keys, fallback = "Unknown") {
    const value = pickFirst(item, keys);
    return value === "" ? fallback : value;
}

function itemInitials(label) {
    return String(label || "Item")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("") || "IT";
}

function clearItemDetails() {
    selectedInventoryIndex = -1;
    els.itemDetails.classList.remove("show");
    els.itemDetails.innerHTML = "";
    document.querySelectorAll(".slot.selected").forEach(slot => slot.classList.remove("selected"));
}

function showItemDetails(index, slot) {
    const item = activeInventoryItems[index];
    if (!item) {
        clearItemDetails();
        return;
    }

    selectedInventoryIndex = index;
    document.querySelectorAll(".slot.selected").forEach(activeSlot => activeSlot.classList.remove("selected"));
    slot.classList.add("selected");

    const label = inventoryLabel(item, index);
    const type = inventoryType(item);
    const image = inventoryImage(item);
    const meta = inventoryMeta(item) || type;
    const rarity = detailValue(item, ["rarity", "quality", "tier"], "No rarity");
    const value = detailValue(item, ["price", "value", "marketValue", "market_value", "min_price"], "No value");
    const weapon = detailValue(item, ["weapon", "weaponType", "weapon_type", "category", "class"], type);
    const count = detailValue(item, ["count", "amount", "quantity", "qty"], "1");

    els.itemDetails.innerHTML = `
        <div class="item-details-top">
            <div class="item-details-icon">
                ${image ? `<img src="${escapeHtml(image)}" alt="">` : escapeHtml(itemInitials(label))}
            </div>
            <div class="item-details-lines">
                <div class="detail-line" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
                <div class="detail-line">Type: ${escapeHtml(type)}</div>
                <div class="detail-line">Value: ${escapeHtml(String(value))}</div>
            </div>
        </div>
        <div class="detail-line wide" title="${escapeHtml(meta)}">${escapeHtml(meta)}</div>
        <div class="detail-line wide">Rarity: ${escapeHtml(String(rarity))}</div>
        <div class="detail-line wide">Weapon: ${escapeHtml(String(weapon))}</div>
        <div class="detail-line wide">Amount: ${escapeHtml(String(count))}</div>
    `;
    els.itemDetails.classList.add("show");
}

function attachSlotHandlers() {
    document.querySelectorAll(".slot").forEach(function(slot) {
        slot.onclick = function() {
            if (!slot.classList.contains("empty")) {
                showItemDetails(Number(slot.dataset.index), slot);
            }
        };
    });
}

function sortInventoryItems(items) {
    return [...items].sort((a, b) => {
        if (activeSort === "type") {
            return inventoryType(a).localeCompare(inventoryType(b));
        }

        if (activeSort === "date") {
            return itemTime(b) - itemTime(a);
        }

        if (activeSort === "fav") {
            return Number(Boolean(b?.favorite || b?.fav || b?.isFavorite)) - Number(Boolean(a?.favorite || a?.fav || a?.isFavorite));
        }

        return itemValue(b) - itemValue(a);
    });
}

function itemValue(item) {
    const raw = detailValue(item, ["price", "value", "marketValue", "market_value", "min_price"], 0);
    const number = Number(String(raw).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(number) ? number : 0;
}

function itemTime(item) {
    const raw = detailValue(item, ["created_at", "createdAt", "date", "acquiredAt", "acquired_at", "timestamp"], 0);
    const number = Number(raw);
    const date = Number.isFinite(number) && number > 0 ? new Date(number * 1000) : new Date(raw);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function renderInventory(items, options = {}) {
    lastInventoryOptions = options;
    activeInventoryItems = sortInventoryItems(items);
    clearItemDetails();

    const updatedAt = options.updatedAt ? formatSaveTime(options.updatedAt) : "";
    const displayCount = Number.isFinite(options.declaredCount) ? options.declaredCount : items.length;

    els.inventoryMeta.textContent = updatedAt
        ? `${formatNumber(displayCount)} items from latest game save, updated ${updatedAt}`
        : `${formatNumber(displayCount)} items from latest game save`;

    if (!activeInventoryItems.length) {
        els.inventoryGrid.innerHTML = `<div class="slot empty">${escapeHtml(options.emptyMessage || "Inventory is empty.")}</div>`;
        attachSlotHandlers();
        return;
    }

    els.inventoryGrid.innerHTML = activeInventoryItems.map((item, index) => {
        const type = inventoryType(item);
        const label = inventoryLabel(item, index);
        const image = inventoryImage(item);
        const initials = itemInitials(label);

        return `
            <div class="slot" data-index="${index}" data-type="${escapeHtml(type)}" title="${escapeHtml(label)}">
                ${image ? `<img class="slot-image" src="${escapeHtml(image)}" alt="">` : ""}
                ${image ? "" : `<div class="slot-name">${escapeHtml(initials)}</div>`}
            </div>
        `;
    }).join("");

    attachSlotHandlers();
}

async function loadInventory() {
    if (!activeProfile?.id) {
        return;
    }

    if (canEdit) {
        await loadOwnerSnapshot();
        return;
    }

    await loadPublicSnapshot(activeProfile.id);
}

function formatSaveTime(value) {
    if (!value) return "";

    const date = typeof value === "number" || /^\d+$/.test(String(value))
        ? new Date(Number(value) * 1000)
        : new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("sv-SE", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function renderError(message) {
    els.accountPage.classList.add("view-only");
    els.usernameText.textContent = message;
    els.emailText.textContent = "Unavailable";
    els.infoName.textContent = message;
    els.infoId.textContent = "ID: Unknown";
    els.infoMail.textContent = "Mail: Unavailable";
    renderStats({});
    els.warning.style.display = "none";
    els.infoSync.textContent = "Unavailable";
}

async function initAccountPage() {
    const accountId = requestedAccountId();

    try {
        hasCloudSave = false;
        checkedCloudSave = false;
        viewer = await loadViewer();
        renderHeader();

        if (!viewer && !accountId) {
            window.location.href = "login-signin.html#login";
            return;
        }

        const profileId = accountId || viewer.id;
        canEdit = Boolean(viewer && Number(viewer.id) === Number(profileId));

        if (canEdit) {
            activeProfile = viewer;
            console.log("viewer before API fetch:", JSON.stringify(viewer));
            try {
                const profileData = await apiFetch(`/users/${encodeURIComponent(viewer.id)}`, {headers: authHeaders()});
                console.log("API response:", JSON.stringify(profileData));
                if (profileData.user) {
                    viewer = {...viewer, ...profileData.user};
                    persistSessionUser(viewer);
                    activeProfile = viewer;
                    console.log("viewer after API fetch:", JSON.stringify(viewer));
                }
            } catch (e) {
                console.error("API fetch failed, using cached data:", e.message);
            }
        } else {
            activeProfile = await loadPublicProfile(profileId);
        }

        renderEditMode();
        renderProfile(activeProfile);

        await loadInventory();
    } catch (error) {
        console.error("initAccountPage caught:", error);
        renderHeader();
        renderEditMode();
        renderError(error.message || "Could not load account");
    }
}

function openEdit(field) {
    if (!canEdit || !activeProfile) return;

    editing = field;
    els.modalTitle.textContent = field === "username" ? "Change user name" : "Change mail";
    els.editInput.type = field === "email" ? "email" : "text";
    els.editInput.value = activeProfile[field] || "";
    els.modalBg.classList.add("show");
}

function closeEdit() {
    els.modalBg.classList.remove("show");
}

async function saveEdit(event) {
    event.preventDefault();

    if (!canEdit || !activeProfile) {
        alert("You can only edit your own account.");
        return;
    }

    const value = els.editInput.value.trim();
    if (!value) return;

    const body = {};
    body[editing] = value;

    try{
        const data = await apiFetch("/users/update", {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify(body)
        });

        activeProfile = {...activeProfile, ...data.user};
        viewer = {...viewer, ...data.user};
        persistSessionUser(viewer);
        closeEdit();
        renderHeader();
        renderProfile(activeProfile);
    }
    catch(error){
        alert(error.message || "Update failed");
    }
}

function syncGame() {
    if (!canEdit || !activeProfile) return;
    localStorage.setItem(syncKey(activeProfile.id), "true");
    updateSyncState();
}

function toggleInventory() {
    if (activeProfile) {
        const isOpen = els.inventory.classList.toggle("show");
        els.accountPage.classList.toggle("inventory-open", isOpen);
        els.inventoryToggle.innerHTML = isOpen ? "&larr; BACK" : "TOGGLE<br>INVENTORY";
        if (!isOpen) {
            clearItemDetails();
        }
    }
}

document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", function() {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        activeSort = this.dataset.sort || "value";
        renderInventory(activeInventoryItems, lastInventoryOptions);
    });
});

if (els.picUpload) {
    els.picUpload.addEventListener("change", function() {
        const file = this.files?.[0];
        if (!file || !canEdit || !activeProfile) return;

        const reader = new FileReader();
        reader.onload = function() {
            localStorage.setItem(profilePicKey(activeProfile.id), reader.result);
            renderProfilePicture(activeProfile);
        };
        reader.readAsDataURL(file);
    });
}

function goLogin() {
    window.location.href = "login-signin.html#login";
}

function goSignup() {
    window.location.href = "login-signin.html#signup";
}

function goAccount() {
    if (viewer) {
        window.location.href = `account.html?id=${encodeURIComponent(viewer.id)}`;
        return;
    }
    window.location.href = "login-signin.html#login";
}

initAccountPage();

