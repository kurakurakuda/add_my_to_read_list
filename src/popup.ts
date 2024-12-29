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

      
      console.log(gssUrl);
      console.log(title);
      console.log(link);
      console.log(category);
      console.log(today, formattedToday);

      // window.close();
    });

  // キャンセルボタンのクリックイベント
  cancelBtn?.addEventListener('click', function() {
      window.close();
  });
});
  