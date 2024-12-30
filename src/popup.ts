document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup loaded.');

    const gssUrlInput = document.querySelector<HTMLInputElement>('#gss-url input');
    const titleInput = document.querySelector<HTMLInputElement>('#title input');
    const categoryInput = document.querySelector<HTMLInputElement>('#category input');
    const saveBtn = document.querySelector('#save');
    const cancelBtn = document.querySelector('#cancel');

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    const title = currentTab.title;
    if (titleInput && title) {
      titleInput.value = title;
    }

    saveBtn?.addEventListener('click', async function() {
      const gssUrl = gssUrlInput?.value;
      if (!gssUrl) {
        alert('Google Spreadsheet URLを入力してください');
        return;
      }

      const title = titleInput?.value;
      const link = currentTab.url;
      const category = categoryInput?.value;
      // タイムゾーンは、localで取得する
      const today = new Date();
      const formattedToday = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

      const data = [title, link, category, formattedToday];
      console.log(data);

      try {
        const token = await getAccessToken();
        console.log(token);
      } catch (error) {
        console.error(error);
        alert('処理に失敗しました。設定が正しいか、確認してください。');
        return;
      }
      // window.close();
    });

  // キャンセルボタンのクリックイベント
  cancelBtn?.addEventListener('click', function() {
      window.close();
  });
});

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      chrome.runtime.lastError || !token ? reject(chrome.runtime.lastError) : resolve(token);
    });
  });
}