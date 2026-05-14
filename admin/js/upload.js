const API = "/api";

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

        // Funktion fÃ¶r att visa statusmeddelanden
        function showStatusMessage(message, type = 'info') {
            const statusDiv = document.getElementById('statusMessage');
            statusDiv.className = `alert alert-${type}`;
            statusDiv.textContent = message;
            statusDiv.style.display = 'block';
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000); // DÃ¶lj efter 5 sekunder
        }

        // Variabel fÃ¶r att lagra den uppladdade filens URL
        let uploadedFileUrl = null;

        // HÃ¤ndelselyssnare fÃ¶r formulÃ¤rskickning - borttagen eftersom vi bara har publiceringsknapp
        // document.getElementById('uploadForm').addEventListener('submit', async function(event) {
        //     ...
        // });

        // HÃ¤ndelselyssnare fÃ¶r publish-knappen
        document.getElementById('publishBtn').addEventListener('click', async function() {
            const fileInput = document.getElementById('fileInput');
            const file = fileInput.files[0];
            const patchNotes = document.getElementById('patchNotes').value;
            const version = document.getElementById('version').value;

            if (!file) {
                showStatusMessage('VÃ¤lj en fil att ladda upp.', 'warning');
                return;
            }

            const title = prompt('Ange titel fÃ¶r spelet:');
            const description = prompt('Ange beskrivning fÃ¶r spelet:');

            if (!title || !description || !version) {
                showStatusMessage('Alla fÃ¤lt mÃ¥ste fyllas i fÃ¶r att publicera.', 'warning');
                return;
            }

            // HÃ¤mta autentiseringstoken
            const token = localStorage.getItem('token');
            if (!token) {
                showStatusMessage('Du mÃ¥ste vara inloggad fÃ¶r att ladda upp filer.', 'danger');
                return;
            }

            try {
                showStatusMessage('Laddar upp fil och publicerar spel...', 'info');

                // FÃ¶rst ladda upp filen
                const formData = new FormData();
                formData.append('file', file);
                if (patchNotes) {
                    formData.append('patchNotes', patchNotes);
                }
                formData.append('publish', 'true');

                const uploadResponse = await apiFetch('/admin/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (!uploadResponse.ok) {
                    showStatusMessage(`Uppladdning misslyckades: ${uploadResponse.errorMessage || 'OkÃ¤nt fel'}`, 'danger');
                    return;
                }

                const downloadUrl = uploadResponse.downloadUrl;
                if (!downloadUrl) {
                    showStatusMessage('Uppladdning lyckades men ingen nedladdnings-URL mottogs.', 'warning');
                    return;
                }

                // Sedan skapa spelet
                const gameResponse = await apiFetch('/games/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: title,
                        description: description,
                        download_url: downloadUrl,
                        version: version
                    })
                });

                if (gameResponse.ok) {
                    showStatusMessage('Fil uppladdad och spel publicerat framgÃ¥ngsrikt!', 'success');
                    fileInput.value = '';
                    document.getElementById('patchNotes').value = '';
                    document.getElementById('version').value = '';
                } else {
                    showStatusMessage(`Publicering misslyckades: ${gameResponse.message || 'OkÃ¤nt fel'}`, 'danger');
                }
            } catch (error) {
                console.error('Fel:', error);
                showStatusMessage('Misslyckades: Kunde inte ansluta till servern.', 'danger');
            }
        });

        // Funktion fÃ¶r att hantera utloggning (antar att den Ã¤r definierad i index.js)
        function logout() {
            // Denna funktion bÃ¶r vara definierad i index.js
            if (typeof window.logout === 'function') {
                window.logout();
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                localStorage.removeItem('email');
                localStorage.removeItem('accountId');
                window.location.href = '../../frontend/html/login-signin.html#login';
            }
        }

