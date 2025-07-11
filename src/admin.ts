import { GssInfo,
  getGssId, invokeGssApi, 
  getStorageData, setStorageData } from './utils';

declare global {
  interface Window {
    IS_TESTING?: boolean;
  }
}

interface GssProps {
  title?: string,
  sheets?: string[]
}

interface GssRow {
  gssUrl: string;
  sheetName?: string;
  title: string;
  link: string;
  category: string;
  createdAt: string;
  isRequireHeader: boolean;
}

export const AdminModule = (() => {

  const openDialog = (dialog: HTMLDialogElement) => {
    if (!dialog) {return;}
    dialog.showModal();
  }

  const closeDialog = (dialog: HTMLDialogElement, dialogInput: HTMLInputElement) => {
    if (dialogInput) { dialogInput.value = ""; }
    if (dialog) { dialog.close(); }
  }

  const addNewGssInfo = async (tableBody: HTMLTableSectionElement, dialog: HTMLDialogElement, dialogInput: HTMLInputElement) => {
    if (!dialog || !tableBody || !dialogInput) {return;}

    const gssUrl = dialogInput.value;
    const gssId = getGssId(gssUrl);
    if (!gssId) {
      alert('Google Spreadsheet URLが正しくありません');
      return;
    }

    const existingGssIds: string[] = extractGssFromTable(tableBody).map((item) => getGssId(item.gssUrl)).filter((id) => id !== null);
    if (existingGssIds.length >= 10) {
      alert('最大10件までしか登録できません。');
      return;
    }
    if (existingGssIds.filter((id: string) => id === gssId).length > 0) {
      alert('既に同じURLが存在しています。');
      return;
    }

    const newItem: GssInfo = {
      gssUrl: gssUrl,
      title: "A",
      link: "B",
      category: "C",
      createdAt: "D",
      isRequireHeader: true
    }

    const latestGssInfo = await getGss(newItem);
    if (latestGssInfo){
      addRow(tableBody, newItem, latestGssInfo);
    } else {
      alert(`Google Spreadsheet 情報を取得できませんでした。URLが正しいか、確認してください。 URL: ${newItem.gssUrl}`);
    }
    closeDialog(dialog, dialogInput);
  }

  const addRow = async (tableBody: HTMLTableSectionElement, rawData: GssInfo, latestInfo: GssProps | null) => {
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

    const headerCheckbox = document.createElement('input') as HTMLInputElement;
    headerCheckbox.type = 'checkbox';
    headerCheckbox.checked = rawData.isRequireHeader;
    const checkboxCell = newRow.insertCell(6) as HTMLTableCellElement;
    checkboxCell.appendChild(headerCheckbox);

    const deleteBtn = document.createElement('button') as HTMLButtonElement;
    deleteBtn.className = "danger";
    deleteBtn.textContent = "削除";
    deleteBtn.addEventListener("click", async () => { newRow.remove(); });
    const actionCell = newRow.insertCell(7) as HTMLTableCellElement;
    actionCell.className = "table-actions";    
    actionCell.appendChild(deleteBtn);
  }

  const extractGssFromTable = (tableBody: HTMLTableSectionElement):GssRow[] => {
    if (!tableBody) {throw Error("tableBody is null");}
    const rows = tableBody.querySelectorAll("tr") as NodeListOf<HTMLTableRowElement>;

    return Array.from(rows).map((row: HTMLTableRowElement) => {
      const columns = row.querySelectorAll("td");
      return {
        gssUrl: columns[0].querySelector("a")!.href,
        sheetName: columns[1].querySelector("select")?.value || undefined,
        title: columns[2].querySelector("select")?.value || "A",
        link: columns[3].querySelector("select")?.value || "B",
        category: columns[4].querySelector("select")?.value || "C",
        createdAt: columns[5].querySelector("select")?.value || "D",
        isRequireHeader: columns[6].querySelector("input")?.checked
      } as GssRow;
    });
  }

  const getGss = async (data: GssInfo): Promise<GssProps | null> => {
    const gssId = getGssId(data.gssUrl);
    if (!gssId) {return null;}
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${gssId}`;
    const gss = await invokeGssApi(url, "GET");
    if (!gss) {return null;}
    return {
      title: gss.properties.title || undefined,
      sheets: gss.sheets.map((s: any) => s.properties.title) || []
    } as GssProps;
  }

  const loadData = async (tableBody: HTMLTableSectionElement) => {
    tableBody.innerHTML = "";
    try {
      const gsses:GssInfo[] = (await getStorageData()) || [];
      const gssTupples = await Promise.all(gsses.map(async (gss: GssInfo) => [gss, await getGss(gss)] as [GssInfo, GssProps | null]));

      gssTupples.forEach( tupple => {
        if (!tupple[1]) { alert(`Google Spreadsheet 情報を取得できませんでした。URLが正しいか、確認してください。 URL: ${tupple[0].gssUrl}`); }
        addRow(tableBody, tupple[0], tupple[1]);
      })
    } catch (error) {
      console.error("Error during laoding from storage: " + error);
      alert("予期せぬエラーが発生しました。時間をおいてから、画面をリフレッシュしてください。")
    }
  }

  const reset = async (tableBody: HTMLTableSectionElement) => {
    if (confirm('変更した内容をリセットしてもよろしいですか？')) {
      await loadData(tableBody);
    }
  }

  const save = async (tableBody: HTMLTableSectionElement) => {
    try {
      const rows = extractGssFromTable(tableBody);
      if (rows.filter((r: GssRow) => new Set([r.title, r.link, r.category, r.createdAt]).size !== 4).length > 0) {
        alert(`同じ列を重複して、指定することはできません。`);
        return;
      }
      const info = await getStorageData();
      const updatedInfo = rows.map((r : GssRow) => {
        const matched = info.find((i: GssInfo) => getGssId(r.gssUrl) === getGssId(i.gssUrl));
        if (matched) {
          return {
            gssUrl: r.gssUrl,
            sheetName: r.sheetName,
            title: r.title,
            link: r.link,
            category: r.category,
            createdAt: r.createdAt,
            isRequireHeader: r.isRequireHeader,
            lastSelected: matched.lastSelected,
            lastSelectedCategory: matched.lastSelectedCategory
          } as GssInfo
        }
        return {
          gssUrl: r.gssUrl,
          sheetName: r.sheetName,
          title: r.title,
          link: r.link,
          category: r.category,
          createdAt: r.createdAt,
          isRequireHeader: r.isRequireHeader,
          lastSelected: false
        } as GssInfo
      }).filter((i: GssInfo | undefined) => i !== undefined);
      setStorageData(updatedInfo);
      alert('保存しました');
      loadData(tableBody);
    } catch (error) {
      console.error("Error saving data:", error);
      alert('処理に失敗しました。時間をおいてから再度試してみてください');
    }
  }

  const init = async () => {
    const addNewBtn = document.getElementById("add-new") as HTMLButtonElement;

    const tableBody = document.getElementById("gss-table-body") as HTMLTableSectionElement;

    const resetBtn = document.getElementById("reset") as HTMLButtonElement;
    const saveBtn = document.getElementById("save") as HTMLButtonElement;

    const dialog = document.getElementById("gss-new-dialog") as HTMLDialogElement;
    const dialogInput = document.querySelector("#gss-dialog-input input") as HTMLInputElement;
    const dialogCancelBtn = document.getElementById("cancel-dialog-btn") as HTMLButtonElement;
    const dialogSaveBtn = document.getElementById("add-dialog-btn") as HTMLButtonElement;

    await loadData(tableBody);
    
    addNewBtn?.addEventListener("click", () => openDialog(dialog));
    resetBtn?.addEventListener("click", async () => reset(tableBody));
    saveBtn?.addEventListener("click", async () => save(tableBody));
    dialogSaveBtn?.addEventListener("click", async () => addNewGssInfo(tableBody, dialog, dialogInput));
    dialogCancelBtn?.addEventListener("click", () => closeDialog(dialog, dialogInput));
    // dialog外にクリック時に、dialogが閉じるようにする
    dialog?.addEventListener('click', (event) => event.target === dialog ? closeDialog(dialog, dialogInput) : null);

  };

  return { init };
})();

if (!window.IS_TESTING) {
  document.addEventListener('DOMContentLoaded', AdminModule.init);
}
