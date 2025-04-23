import { GssInfo, 
  getGssId, invokeGssApi, 
  getStorageData, setStorageData } from './utils';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup loaded.');

    interface GssDto {
      title: string;
      url: string;
      categories: string[]
      info?: GssInfo;
    }

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

    const changeGssOption = (title: string | null, url?: string, categories?: string[] | null): void => {
      while (gssTitleArea?.firstChild) {
        gssTitleArea.removeChild(gssTitleArea.firstChild);
      }

      if (categoryInput) {
        categoryInput.value = '';
      }
      
      while (categoryDropdown?.firstChild) {
        categoryDropdown.removeChild(categoryDropdown.firstChild);
      }

      if (title && url) {
        const titleLink = document.createElement('a') as HTMLAnchorElement;
        titleLink.href = url;
        titleLink.target = "_blank";
        const titleSpan = document.createElement('span') as HTMLSpanElement;
        titleSpan.className = "link";
        titleSpan.textContent = title;
        titleLink.appendChild(titleSpan)
        gssTitleArea!.appendChild(titleLink)
      }
      
      if (categories && categories.length > 0) {
        categoryDropdown!.size = Math.min(Math.max(categories.length, 2), 4);
        categories.forEach((c: any) => categoryDropdown!.appendChild(new Option(c)));
      } else {
        categoryDropdown!.size = 2;
      }
    }

    const gsses = await getStorageData().then( async (info: GssInfo[]) => {
          const fetchCategories = async (baseUrl: string, column: string, sheet?: string, isRequireHeader?: boolean): Promise<string[]> => {
            const urlWithRange = `${baseUrl}?includeGridData=true&ranges=${sheet ? sheet + "!" : ""}${column + ":" + column}`;
            console.log(`started. timestamp: ${new Date().toISOString()} : url: ${urlWithRange}`);
            const res = await invokeGssApi(urlWithRange, "GET");
            console.log(`completed. timestamp: ${new Date().toISOString()} : url: ${urlWithRange}`);
            const rowData = res?.sheets[0]?.data?.[0]?.rowData;
            return rowData ? Array.from(
              new Set(rowData.slice(isRequireHeader ? 1 : 0).map((data: any) => data?.values?.[0]?.formattedValue).filter((data: any) => data))
            ) as string[]
            : [] as string[];
          }

          if (info.length === 0) { throw Error(`The data from storage is empty`) }
          return await Promise.all(
            info.map(async (i): Promise<GssDto> => {
              try {
                const gssUrlId = getGssId(i.gssUrl);
                if (!gssUrlId) { throw Error(`The invalid gss id`) }
                const url = `https://sheets.googleapis.com/v4/spreadsheets/${gssUrlId}`;
                console.log(`started. timestamp: ${new Date().toISOString()} : url: ${url}`);
                const spreadsheet = await invokeGssApi(url, "GET");
                console.log(`completed. timestamp: ${new Date().toISOString()} : url: ${url}`);
                if (!spreadsheet) { throw Error("Invalid Gss API Res"); }
                const title = spreadsheet.properties.title;
                const matched = i.sheetName ? spreadsheet.sheets.filter((s: any) => s.properties.title === i.sheetName).length > 0 : true;
                const categories = matched ? await fetchCategories(url, i.category, i.sheetName, i.isRequireHeader) : [] as string[];
                return { title: title, url: i.gssUrl, categories: categories, info: i } as GssDto;
              } catch (error) {
                console.error(`error: ${error}`);
                return { title: i.gssUrl, url: i.gssUrl, categories: [], info: i } as GssDto;
              }
            })
          );
        })
      .catch((error) => {
        console.error(`Failed while calling storage api. error: ${error}`);
        return [] as GssDto[];
      })

    gssUrlInput?.addEventListener('change', async () => {
      const gssUrl = gssUrlInput?.value;
      const gssId = getGssId(gssUrl);
      if (!gssId) {
        changeGssOption(null);
        return;
      }

      const existingGss = gsses.find(g => getGssId(g.url) === gssId) || null;
      if (existingGss) {
        changeGssOption(existingGss.title, existingGss.url, existingGss.categories);
        return;
      }

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${gssId}`;
      const spreadsheet = await invokeGssApi(url, "GET");
      if (!spreadsheet) {
        changeGssOption(null);
        return;
      }

      changeGssOption(spreadsheet.properties.title, gssUrl, null);
    })

    gssUrlSelectBtn?.addEventListener('click', () => toggleDropdown(gssUrlDropdown));

    gssUrlDropdown?.addEventListener('change', () => {
      const selectedGss = gsses.find(g => getGssId(g.url) === getGssId(gssUrlDropdown.value)) || null;
      if (!selectedGss) {
        alert('予期せぬエラーが発生しました。設定が正しいか、確認してください。');
        return;
      }
      changeGssOption(selectedGss.title, selectedGss.url, selectedGss.categories);
      changeFieldValue(gssUrlInput, gssUrlDropdown);
    });

    categorySelectBtn?.addEventListener('click', () => toggleDropdown(categoryDropdown));

    categoryDropdown?.addEventListener('change', () => changeFieldValue(categoryInput, categoryDropdown));

    saveBtn?.addEventListener('click', async () => {
      const defineRange = (info?: GssInfo): string => info?.sheetName! ? `${info.sheetName}!A:F` : "A:F";
      const generatePostValue = (formattedToday: string, title?: string, link?: string, category?: string, info?: GssInfo): (string | null)[] => {
        const mapValuePerColumn = (column: string, info: GssInfo): (string | null) => {
          if (info.title === column) { return title?? null; } 
          else if (info.link === column) { return link?? null; } 
          else if (info.category === column) { return category?? null; } 
          else if (info.createdAt === column) { return formattedToday; } 
          else { return null; }
        }

        if (!info) {
          return [title?? null, link?? null, category?? null, formattedToday, null, null]
        }

        return [
          mapValuePerColumn("A", info),
          mapValuePerColumn("B", info),
          mapValuePerColumn("C", info),
          mapValuePerColumn("D", info),
          mapValuePerColumn("E", info),
          mapValuePerColumn("F", info)
        ]
      }
      
      const gssUrl = gssUrlInput?.value
      const gssId = getGssId(gssUrl);
      const existed = gsses.find((g: GssDto) => gssId === getGssId(g.url));
      if (!gssId) {
        alert('Google Spreadsheet URLが正しくありません');
        return;
      }

      if (!existed && gsses.length >= 10) {
        alert('最大10件までしか登録できません。');
        return;
      }

      const title = titleInput?.value;
      const link = currentTab.url;
      const category = categoryInput?.value;
      // タイムゾーンは、localで取得する
      const today = new Date();
      const formattedToday = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

      const range = defineRange(existed?.info);

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${gssId}/values/${range}:append?valueInputOption=RAW`;
      const data = generatePostValue(formattedToday,title, link, category, existed?.info);

      const res = await invokeGssApi(url, "POST", data);
      if (!res) {
        alert('書込み処理に失敗しました。設定が正しいか、確認してください。');
        return;
      }

      const gssInfo = gsses.map((gss: GssDto) => gss.info!).map(gss => {
        const isSelected = gssId === getGssId(gss.gssUrl);
        gss.lastSelected = isSelected;
        gss.lastSelectedCategory = isSelected ? category : undefined;
        return gss;
      }) as GssInfo[];

      if (!existed) {
        const newGss = {
          gssUrl: gssUrl,
          title: 'A',
          link: 'B',
          category: 'C',
          createdAt: 'D',
          isRequireHeader: true,
          lastSelected: true,
          lastSelectedCategory: category
        } as GssInfo;
        gssInfo.push(newGss);
      }

      try {
        await setStorageData(gssInfo);
      } catch (error) {
        console.error("Error saving data:", error);
      }
      window.close();
    });

    // キャンセルボタンのクリックイベント
    cancelBtn?.addEventListener('click', () => window.close());

    adminLink?.addEventListener('click', () => chrome.tabs.create({url: "admin.html"}));

    gsses.forEach((gss: GssDto) => {
      const option = new Option(gss.title, gss.url);
      option.title = gss.url;
      gssUrlDropdown!.appendChild(option);
    });
    gsses.filter((gss: GssDto) => gss.info!.lastSelected).map(gss => {
      changeGssOption(gss.title, gss.url, gss.categories);
      gssUrlInput!.value = gss.url;
      categoryInput!.value = gss.info!.lastSelectedCategory?? ''
    })
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
