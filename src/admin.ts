import { getGssId, invokeGssApi } from './utils';

// インターフェース定義
interface GssInfo {
  gssUrl: string;
  sheetName?: string;
  title: string;
  link: string;
  category: string;
  createdAt: string;
}

interface LatestGssProps {
  title?: string,
  sheets?: string[]
}

const storageKey = "MyToReadList";

// ページ読み込み時にテーブルを描画
document.addEventListener("DOMContentLoaded", async (): Promise<void> => {
  const addNewBtn = document.getElementById("add-new") as HTMLButtonElement;

  const tableBody = document.getElementById("gss-table-body") as HTMLTableSectionElement;

  const resetBtn = document.getElementById("reset") as HTMLButtonElement;
  const saveBtn = document.getElementById("save") as HTMLButtonElement;

  const dialog = document.getElementById("gss-new-dialog") as HTMLDialogElement;
  const dialogInput = document.querySelector("#gss-dialog-input input") as HTMLInputElement;
  const dialogCancelBtn = document.getElementById("cancel-dialog-btn") as HTMLButtonElement;
  const dialogSaveBtn = document.getElementById("add-dialog-btn") as HTMLButtonElement;

  const getStorageData = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get([storageKey], 
        (result) => chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(result[storageKey]));
    });
  };
  
  const setStorageData = (value: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ [storageKey]: value }, 
        () => chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve());
    });
  };

  const getGss = async (data: GssInfo): Promise<LatestGssProps | null> => {
    const gssId = getGssId(data.gssUrl);
    if (!gssId) {return null;}
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${gssId}`;
    const gss = await invokeGssApi(url, "GET");
    if (!gss) {return null;}
    return {
      title: gss.properties.title || undefined,
      sheets: gss.sheets.map((s: any) => s.properties.title) || []
    } as LatestGssProps;
  }

  const addRow = async (rawData: GssInfo, latestInfo: LatestGssProps | null) => {
    const generateColumnDropdwn = (selectedValue?: string) => {
      const dropdown = document.createElement('select') as HTMLSelectElement;
      ["A", "B", "C", "D", "E", "F"].forEach((option) => {
        dropdown.appendChild(new Option(option, option, undefined, option === selectedValue));
      });
      return dropdown;
    }

    const newRow = tableBody.insertRow() as HTMLTableRowElement;    

    const gssLink = document.createElement('a') as HTMLAnchorElement;
    gssLink.href = rawData.gssUrl;
    gssLink.target = "_blank";
    const gssSpan = document.createElement('span') as HTMLSpanElement;
    gssSpan.className = "link";
    gssSpan.textContent = latestInfo?.title || rawData.gssUrl;
    gssLink.appendChild(gssSpan);
    const gssCell = newRow.insertCell(0) as HTMLTableCellElement;
    gssCell.appendChild(gssLink);

    const sheetDropdown = document.createElement('select') as HTMLSelectElement;
    sheetDropdown.appendChild(new Option("", ""));
    latestInfo?.sheets?.forEach((sheet) => {
      sheetDropdown.appendChild(new Option(sheet, sheet, undefined, sheet === rawData.sheetName))
    })
    const sheetCell = newRow.insertCell(1) as HTMLTableCellElement;
    sheetCell.appendChild(sheetDropdown);

    const titleColumnDropdown = generateColumnDropdwn(rawData.title);
    const titleCell = newRow.insertCell(2) as HTMLTableCellElement;
    titleCell.appendChild(titleColumnDropdown);

    const linkColumnDropdown = generateColumnDropdwn(rawData.link);
    const linkSpan = newRow.insertCell(3) as HTMLTableCellElement;
    linkSpan.appendChild(linkColumnDropdown);

    const categoryColmunDropdown = generateColumnDropdwn(rawData.category);
    const categoryCell = newRow.insertCell(4) as HTMLTableCellElement;
    categoryCell.appendChild(categoryColmunDropdown);

    const dateColunDropdown = generateColumnDropdwn(rawData.createdAt);
    const dateCell = newRow.insertCell(5) as HTMLTableCellElement;
    dateCell.appendChild(dateColunDropdown);

    const deleteBtn = document.createElement('button') as HTMLButtonElement;
    deleteBtn.className = "danger";
    deleteBtn.textContent = "削除";
    deleteBtn.addEventListener("click", async () => {
      newRow.remove();
    });
    const actionCell = newRow.insertCell(6) as HTMLTableCellElement;
    actionCell.className = "table-actions";    
    actionCell.appendChild(deleteBtn);
  }

  const extractGssFromTable = ():GssInfo[] => {
    if (!tableBody) {throw Error("tableBody is null");}
    const rows = tableBody.querySelectorAll("tr") as NodeListOf<HTMLTableRowElement>;

    return Array.from(rows).map((row) => {
      const columns = row.querySelectorAll("td");
      return {
        gssUrl: columns[0].querySelector("a")!.href,
        sheetName: columns[1].querySelector("select")?.value || undefined,
        title: columns[2].querySelector("select")?.value || "A",
        link: columns[3].querySelector("select")?.value || "A",
        category: columns[4].querySelector("select")?.value || "A",
        createdAt: columns[5].querySelector("select")?.value || "A",
      } as GssInfo;
    });
  }

  const loadData = async () => {
    tableBody.innerHTML = "";
    try {
      const data:GssInfo[] = (await getStorageData() as GssInfo[]) || [];
      data.forEach(async (item) => {
        const latestGssInfo = await getGss(item);
        if (!latestGssInfo){
          alert(`Google Spreadsheet 情報を取得できませんでした。URLが正しいか、確認してください。 URL: ${item.gssUrl}`);
        }
        addRow(item, latestGssInfo);
      });
    } catch (error) {
      console.error("Error during laoding from storage: " + error);
      alert("予期せぬエラーが発生しました。時間をおいてから、画面をリフレッシュしてください。")
    }
  }

  const closeDialog = () => {
    if (dialogInput) { dialogInput.value = ""; }
    if (dialog) { dialog.close(); }
  }
  
  addNewBtn?.addEventListener("click", () => {
    if (!dialog) {return;}
    dialog.showModal();
  });

  resetBtn?.addEventListener("click", async () => {
    if (confirm('変更した内容をリセットしてもよろしいですか？')) {
      try {
        loadData();
      } catch (error) {
        console.error("Error saving data:", error);
        alert('処理に失敗しました。時間をおいてから再度試してみてください');
      }
    }
  });

  saveBtn?.addEventListener("click", async () => {
   try {
      setStorageData(extractGssFromTable());
      alert('保存しました');
      loadData();
    } catch (error) {
      console.error("Error saving data:", error);
      alert('処理に失敗しました。時間をおいてから再度試してみてください');
    }
  });

  dialogSaveBtn?.addEventListener("click", async () => {
    if (!dialog || !tableBody || !dialogInput) {return;}

    const gssUrl = dialogInput.value;
    const gssId = getGssId(gssUrl);
    if (!gssId) {
      alert('Google Spreadsheet URLが正しくありません');
      return;
    }

    const existingGssIds: string[] = extractGssFromTable().map((item) => getGssId(item.gssUrl)).filter((id) => id !== null);
    if (existingGssIds.length >= 10) {
      alert('最大10件までしか登録できません。');
      return;
    }
    if (existingGssIds.filter((id) => id === gssId).length > 0) {
      alert('既に同じURLが存在しています。');
      return;
    }

    const newItem: GssInfo = {
      gssUrl: gssUrl,
      title: "A",
      link: "A",
      category: "A",
      createdAt: "A"
    }

    const latestGssInfo = await getGss(newItem);
    if (latestGssInfo){
      addRow(newItem, latestGssInfo);
    } else {
      alert(`Google Spreadsheet 情報を取得できませんでした。URLが正しいか、確認してください。 URL: ${newItem.gssUrl}`);
    }
    closeDialog();
  });


  dialogCancelBtn?.addEventListener("click", closeDialog);

  // dialog外にクリック時に、dialogが閉じるようにする
  dialog?.addEventListener('click', (event) => event.target === dialog ? closeDialog() : null);

  loadData();

});
