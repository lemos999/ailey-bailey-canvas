/*
--- Ailey & Bailey Data Bridge ---
File: bridge.js
Version: 1.0
Architect: [Username] & System Architect Ailey
Description: Handles all client-side logic for the data bridge page, including Google OAuth, Drive API calls (import/export), and clipboard operations.
*/

// [GLOBAL SCOPE] Functions called by HTML onload attribute
function handleGapiLoad() {
    gapi.load('client:picker', () => {
        gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
        window.gapiInited = true;
    });
};

function handleGisLoad() {
    // IMPORTANT: Use the same Client ID as your main application.
    const CLIENT_ID = '464743950938-qm5uidbabg4cuvccje11drdk07jaahd.apps.googleusercontent.com';
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';

    if (!CLIENT_ID || CLIENT_ID.startsWith('YOUR_CLIENT_ID')) {
        updateStatus('오류: Google Client ID가 설정되지 않았습니다.', true);
        return;
    }

    window.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Callback is handled by the promise
    });
    window.gisInited = true;
};

document.addEventListener('DOMContentLoaded', () => {
    const dataArea = document.getElementById('data-area');
    const importBtn = document.getElementById('import-btn');
    const exportBtn = document.getElementById('export-btn');
    const copyBtn = document.getElementById('copy-btn');
    const statusDiv = document.getElementById('status');
    
    // IMPORTANT: This API Key is required for Google Picker to work.
    const API_KEY = '💥 Google Cloud Console의 "API 키" 섹션에서 생성한 키를 여기에 붙여넣으세요 💥';

    function updateStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.style.color = isError ? '#ff453a' : '#8e8e93';
    }

    function requestGoogleAuth() {
        return new Promise((resolve, reject) => {
            if (!window.gapiInited || !window.gisInited) {
                const errorMsg = "Google API가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.";
                updateStatus(errorMsg, true);
                return reject(new Error(errorMsg));
            }
            window.tokenClient.callback = (resp) => {
                if (resp.error !== undefined) {
                    reject(resp);
                } else {
                    resolve(resp);
                }
            };
            if (gapi.client.getToken() === null) {
                window.tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                window.tokenClient.requestAccessToken({ prompt: '' });
            }
        });
    }

    async function handleExport() {
        const dataToExport = dataArea.value;
        if (!dataToExport.trim()) {
            updateStatus('오류: 내보낼 데이터가 없습니다. 텍스트 상자에 데이터를 붙여넣으세요.', true);
            return;
        }

        updateStatus('Google Drive 인증 중...');
        try {
            await requestGoogleAuth();
            updateStatus('데이터를 내보내는 중...');

            const fileName = `[Ailey & Bailey] 백업_${new Date().toISOString().split('T')[0]}.json`;
            const metadata = { 'name': fileName, 'mimeType': 'application/json' };
            
            const boundary = '-------314159265358979323846';
            const multipartRequestBody =
                `--${boundary}\r\n` +
                `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
                `${JSON.stringify(metadata)}\r\n` +
                `--${boundary}\r\n` +
                `Content-Type: application/json\r\n\r\n` +
                `${dataToExport}\r\n` +
                `--${boundary}--`;

            await gapi.client.request({
                'path': 'https://www.googleapis.com/upload/drive/v3/files',
                'method': 'POST',
                'params': {'uploadType': 'multipart'},
                'headers': {'Content-Type': `multipart/related; boundary="${boundary}"`},
                'body': multipartRequestBody
            });
            updateStatus(`✅ "${fileName}" 이름으로 Google Drive에 백업이 완료되었습니다!`);
        } catch (error) {
            console.error("Google Drive 내보내기 오류:", error);
            const errorMsg = error.result?.error?.message || error.details || error.message || '알 수 없는 오류';
            updateStatus(`❌ 내보내기 오류: ${errorMsg}`, true);
        }
    }

    async function handleImport() {
        if (API_KEY.startsWith('💥')) {
            updateStatus('오류: 불러오기 기능을 사용하려면 API 키가 필요합니다.', true);
            alert('Google Picker를 사용하려면 API 키가 필요합니다. bridge.js 파일을 수정해주세요.');
            return;
        }
        updateStatus('Google Drive 인증 중...');
        try {
            await requestGoogleAuth();
            updateStatus('파일 선택창을 여는 중...');
            
            const view = new google.picker.View(google.picker.ViewId.DOCS);
            view.setMimeTypes("application/json");

            const picker = new google.picker.PickerBuilder()
                .setOAuthToken(gapi.client.getToken().access_token)
                .addView(view)
                .setDeveloperKey(API_KEY)
                .setCallback(async (data) => {
                    if (data.action === google.picker.Action.PICKED) {
                        const fileId = data.docs[0].id;
                        updateStatus('백업 파일 다운로드 중...');
                        const fileResponse = await gapi.client.drive.files.get({ fileId: fileId, alt: 'media' });
                        dataArea.value = fileResponse.body;
                        updateStatus(`✅ "${data.docs[0].name}" 파일을 성공적으로 불러왔습니다. 이제 아래 텍스트를 복사하여 사용하세요.`);
                    }
                })
                .build();
            picker.setVisible(true);
        } catch (error) {
            console.error("Google Drive 불러오기 오류:", error);
            const errorMsg = error.result?.error?.message || error.details || error.message || '알 수 없는 오류';
            updateStatus(`❌ 불러오기 오류: ${errorMsg}`, true);
        }
    }

    function handleCopy() {
        if (!dataArea.value) {
            updateStatus('복사할 내용이 없습니다.', true);
            return;
        }
        navigator.clipboard.writeText(dataArea.value).then(() => {
            updateStatus('✅ 클립보드에 복사되었습니다!');
        }).catch(err => {
            updateStatus('복사 실패. 브라우저 설정을 확인해주세요.', true);
            console.error('Copy failed', err);
        });
    }

    importBtn.addEventListener('click', handleImport);
    exportBtn.addEventListener('click', handleExport);
    copyBtn.addEventListener('click', handleCopy);
});
