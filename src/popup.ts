import { getGssId, invokeGssApi } from './utils';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup loaded.');

    const gssUrlInput = document.querySelector<HTMLInputElement>('#gss-url input');
    const gssUrlSelectBtn = document.querySelector<HTMLButtonElement>('#gss-url button');
    const gssUrlDropdown = document.querySelector<HTMLSelectElement>('#gss-url select');
    const gssTitleArea = document.querySelector<HTMLElement>('#gss-title');

    const titleInput = document.querySelector<HTMLInputElement>('#title input');

    const categoryInput = document.querySelector<HTMLInputElement>('#category input');
    const categorySelectBtn = document.querySelector<HTMLButtonElement>('#category button');
    const categoryDropdown = document.querySelector<HTMLSelectElement>('#category select');
    
    const saveBtn = document.querySelector('#save');
    const cancelBtn = document.querySelector('#cancel');

    const adminLink = document.querySelector<HTMLElement>("#admin-link")

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    const title = currentTab.title;
    if (titleInput && title) {
      titleInput.value = title;
    }

    const toggleDropdown = (dropdown: HTMLSelectElement | null): void => {
      if (dropdown) {
        dropdown.style.display = (dropdown.style.display === 'block') ? 'none' : 'block';
        dropdown.selectedIndex = -1;
      }
    }

    const changeFieldValue = (input: HTMLInputElement | null, dropdown: HTMLSelectElement | null): void => {
      if (input && dropdown) {
        input.value = dropdown.value;
        dropdown.style.display ='none';
      }
    }

    gssUrlInput?.addEventListener('change', async () => {
      const setGssTitle = (title: string | null): void => {
        if (gssTitleArea) {
          gssTitleArea.textContent = title
        }
      }

      const clearCategoryOptions = (): void => {
        while (categoryDropdown?.firstChild) {
          categoryDropdown.removeChild(categoryDropdown.firstChild);
        }
      }

      const gssId = getGssId(gssUrlInput?.value);
      if (!gssId) {
        setGssTitle(null);
        clearCategoryOptions();
        return;
      }

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${gssId}?includeGridData=true&ranges=C:C`;
      const spreadsheet = await invokeGssApi(url, "GET");
      if (!spreadsheet) {
        setGssTitle(null);
        clearCategoryOptions();
        return;
      }

      const gssTitle = spreadsheet.properties.title;
      const categories = Array.from(
        new Set(spreadsheet.sheets[0].data[0].rowData
          .slice(1)
          .map((data : any) => data?.values?.[0]?.formattedValue)
          .filter((data: any) => data)
        ));
      
      clearCategoryOptions();

      categoryDropdown!.size = Math.min(categories.length, 4);
      // 種別に更新ボタンを用意するか？ -> 管理画面の実装時に合わせて考える
      categories.forEach((c: any) => {
        categoryDropdown!.appendChild(new Option(c));
      });

      setGssTitle(gssTitle);

    })

    gssUrlSelectBtn?.addEventListener('click', () => toggleDropdown(gssUrlDropdown));

    // 入力欄は、今のところ、初期値は未入力とする
    // 矢印クリック時に、選択肢一覧が最大5個表示されるべき
    // ５個以上の場合は、スクロールバーが表示されるべき
    gssUrlDropdown?.addEventListener('change', () => changeFieldValue(gssUrlInput, gssUrlDropdown));

    categorySelectBtn?.addEventListener('click', () => toggleDropdown(categoryDropdown));

    // 入力欄は、今のところ、初期値は未入力とする
    // 矢印クリック時に、選択肢一覧が最大5個表示されるべき
    // ５個以上の場合は、スクロールバーが表示されるべき
    categoryDropdown?.addEventListener('change', () => changeFieldValue(categoryInput, categoryDropdown));

    saveBtn?.addEventListener('click', async () => {
      const gssId = getGssId(gssUrlInput?.value);
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

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${gssId}/values/A:D:append?valueInputOption=RAW`;
      const data = [title, link, category, formattedToday];

      const res = await invokeGssApi(url, "POST", data);
      if (!res) {
        alert('処理に失敗しました。設定が正しいか、確認してください。');
        return;
      }
      window.close();
    });

    // キャンセルボタンのクリックイベント
    cancelBtn?.addEventListener('click', () => window.close());

    adminLink?.addEventListener('click', () => {
      chrome.tabs.create({url: "admin.html"});
    });
});

document.addEventListener('click', (event) => {
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

// popup.js での表示処理
// document.addEventListener('DOMContentLoaded', function() {
//   // 管理画面を開くリンク
//   document.getElementById('openDetailLink').addEventListener('click', function() {
//     chrome.tabs.create({url: 'detail.html'});
//   });
  
//   // 保存された項目を表示
//   const itemsContainer = document.getElementById('itemsContainer');
  
//   // 保存されている項目を読み込む
//   chrome.storage.sync.get(['popupItems'], function(result) {
//     const items = result.popupItems || [];
    
//     // 項目を表示
//     if (items.length === 0) {
//       itemsContainer.innerHTML = '<p>表示項目はまだありません</p>';
//     } else {
//       const ul = document.createElement('ul');
      
//       items.forEach(item => {
//         const li = document.createElement('li');
//         li.textContent = item;
//         ul.appendChild(li);
//       });
      
//       itemsContainer.appendChild(ul);
//     }
//   });
// });
// onChangedイベントリスナーを追加して、ストレージの変更を監視する
// chrome.storage.onChanged.addListener(function(changes, namespace) {    
//   if (namespace === 'sync') {
//     // 変更された項目を取
//     for (let key in changes) {