function getApiBase() {
    const isLocalStaticPage = (
        window.location.protocol === "file:" ||
        ["127.0.0.1", "localhost"].includes(window.location.hostname) &&
        !["80", "90", "5000", "5001"].includes(window.location.port)
    );

    return isLocalStaticPage ? "http://localhost:5001/api" : "/api";
}

const API = getApiBase();

async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, options);
    const text = await res.text();

    let data = {};
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("API returned non-JSON:", text.slice(0, 200));
            throw new Error(`Server returned ${res.status}`);
        }
    }

    if (!res.ok) {
        const error = new Error(data.errorMessage || data.message || `Request failed (${res.status})`);
        error.status = res.status;
        error.data = data;
        throw error;
    }

    return data;
}

function showStatusMessage(message, type = "info") {
    const statusDiv = document.getElementById("statusMessage");
    statusDiv.className = `alert alert-${type}`;
    statusDiv.textContent = message;
    statusDiv.style.display = "block";
}

document.getElementById("publishBtn").addEventListener("click", async function() {
    const publishBtn = document.getElementById("publishBtn");
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];
    const patchNotesInput = document.getElementById("patchNotes");
    const versionInput = document.getElementById("version");
    const patchNotes = patchNotesInput.value.trim();
    const version = versionInput.value.trim();

    if (!file) {
        showStatusMessage("Valj en fil att ladda upp.", "warning");
        return;
    }

    if (!version) {
        showStatusMessage("Version maste fyllas i for att publicera.", "warning");
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        showStatusMessage("Du maste vara inloggad som admin for att ladda upp filer.", "danger");
        return;
    }

    let uploadedFileUrl = null;

    try {
        publishBtn.disabled = true;
        showStatusMessage("Laddar upp fil...", "info");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("version", version);
        formData.append("publish", "true");
        if (patchNotes) {
            formData.append("patchNotes", patchNotes);
        }

        const uploadResponse = await apiFetch("/admin/upload", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        uploadedFileUrl = uploadResponse.downloadUrl;
        if (!uploadedFileUrl) {
            throw new Error("Upload succeeded but no download URL was returned.");
        }

        showStatusMessage("Filen ar uppladdad. Publicerar spelinfo...", "info");

        const title = file.name.replace(/\.[^/.]+$/, "") || "Game build";
        const description = patchNotes || `Version ${version}`;

        await apiFetch("/games/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                description,
                download_url: uploadedFileUrl,
                version
            })
        });

        showStatusMessage(`Fil uppladdad och publicerad: ${uploadedFileUrl}`, "success");
        fileInput.value = "";
        patchNotesInput.value = "";
        versionInput.value = "";
    } catch (error) {
        console.error("Upload/publish failed:", error);

        if (error.status === 404 && !uploadedFileUrl) {
            showStatusMessage("Upload-routen saknas pa servern. Starta om backend sa senaste koden kors.", "danger");
            return;
        }

        if (uploadedFileUrl) {
            showStatusMessage(`Filen laddades upp (${uploadedFileUrl}), men spelinfo kunde inte publiceras: ${error.message}`, "warning");
            return;
        }

        showStatusMessage(`Misslyckades: ${error.message || "Kunde inte ansluta till servern."}`, "danger");
    } finally {
        publishBtn.disabled = false;
    }
});

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("accountId");
    localStorage.removeItem("isAdmin");
    window.location.href = "../../login-signin.html#login";
}
