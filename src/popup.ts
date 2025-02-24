document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup loaded.');

    const gssUrlInput = document.querySelector<HTMLInputElement>('#gss-url input');
    const gssUrlSelectBtn = document.querySelector<HTMLButtonElement>('#gss-url button');
    const gssUrlDropdown = document.querySelector<HTMLSelectElement>('#gss-url select');

    const titleInput = document.querySelector<HTMLInputElement>('#title input');

    const categoryInput = document.querySelector<HTMLInputElement>('#category input');
    const categorySelectBtn = document.querySelector<HTMLButtonElement>('#category button');
    const categoryDropdown = document.querySelector<HTMLSelectElement>('#category select');
    
    const saveBtn = document.querySelector('#save');
    const cancelBtn = document.querySelector('#cancel');

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    const title = currentTab.title;
    if (titleInput && title) {
      titleInput.value = title;
    }

    gssUrlSelectBtn?.addEventListener('click', function() {
      // TODO リファクタ候補
      if (gssUrlDropdown) {
        gssUrlDropdown.style.display = (gssUrlDropdown.style.display === 'block') ? 'none' : 'block';
        gssUrlDropdown.selectedIndex = -1;
      }
    })

    gssUrlDropdown?.addEventListener('change', function() {
      // TODO リファクタ候補
      if (gssUrlInput) {
        gssUrlInput.value = gssUrlDropdown.value;
        gssUrlDropdown.style.display ='none';
      }
    })

    categorySelectBtn?.addEventListener('click', function() {
      // TODO リファクタ候補
      if (categoryDropdown) {
        categoryDropdown.style.display = (categoryDropdown.style.display === 'block') ? 'none' : 'block';
        categoryDropdown.selectedIndex = -1;
      }
    })

    categoryDropdown?.addEventListener('change', function() {
      // TODO リファクタ候補
      if (categoryInput) {
        categoryInput.value = categoryDropdown.value;
        categoryDropdown.style.display ='none';
      }
    })

    saveBtn?.addEventListener('click', async function() {
      const gssUrl = gssUrlInput?.value;
      if (!gssUrl) {
        alert('Google Spreadsheet URLを入力してください');
        return;
      }

      const gssId = getGssId(gssUrl);
      if (!gssId) {
        alert('Google Spreadsheet URLが正しくありません');
        return;
      }

      const title = titleInput?.value;
      const link = currentTab.url;
      const category = categoryInput?.value;
      // タイムゾーンは、localで取得する
      const today = new Date();
      const formattedToday = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

      const data = [title, link, category, formattedToday];

      try {
        const token = await getAccessToken();
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${gssId}/values/A:D:append?valueInputOption=RAW`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              values: [data]
            })
          }
        );

        if (!response.ok)  {
          console.error(await response.json());
          throw new Error('Google Spread Sheetへの書き込みに失敗しました');
        }
        
      } catch (error) {
        console.error(error);
        alert('処理に失敗しました。設定が正しいか、確認してください。');
        return;
      }
      window.close();
    });

    // キャンセルボタンのクリックイベント
    cancelBtn?.addEventListener('click', function() {
        window.close();
    });
});

document.addEventListener('click', function(event) {
  const gssUrlArea = document.querySelector<HTMLElement>('#gss-url');
  const gssUrlDropdown = document.querySelector<HTMLSelectElement>('#gss-url select');
  const categoryArea = document.querySelector<HTMLElement>('#category');
  const categoryDropdown = document.querySelector<HTMLSelectElement>('#category select');
  if (!gssUrlArea?.contains(event.target as Node) && gssUrlDropdown) {
    gssUrlDropdown.style.display = 'none';
  }
  if (!categoryArea?.contains(event.target as Node) && categoryDropdown) {
    categoryDropdown.style.display = 'none';
  } 
})

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      chrome.runtime.lastError || !token ? reject(chrome.runtime.lastError) : resolve(token);
    });
  });
}

function getGssId(url: string): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    // URLオブジェクトを作成して正しいURLかを検証
    const urlObj = new URL(url);
    
    // Google Spreadsheetのドメインかチェック
    if (!urlObj.hostname.includes('docs.google.com') || !urlObj.pathname.includes('/spreadsheets/d/')) {
      return undefined;
    }

    // パスからIDを直接抽出
    const parts = urlObj.pathname.split('/');
    const spreadsheetIdIndex = parts.indexOf('d') + 1;
    
    if (spreadsheetIdIndex >= parts.length) {
      return undefined;
    }

    const spreadsheetId = parts[spreadsheetIdIndex];
    
    // IDの形式を検証（英数字、ハイフン、アンダースコアのみ許可）
    if (!spreadsheetId.match(/^[a-zA-Z0-9-_]+$/)) {
      return undefined;
    }

    return spreadsheetId;

  } catch (error) {
    return undefined;
  }
}
