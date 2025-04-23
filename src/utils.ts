const storageKey = "MyToReadList";

// インターフェース定義
export interface GssInfo {
  gssUrl: string;
  sheetName?: string;
  title: string;
  link: string;
  category: string;
  createdAt: string;
  isRequireHeader: boolean;
  lastSelected?: boolean;
  lastSelectedCategory?: string;
}

const getAccessToken = async (): Promise<any>  =>  {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, 
        (token) => chrome.runtime.lastError || !token ? reject(chrome.runtime.lastError) : resolve(token));
    });
  }
  
export const getGssId = (url?: string): string | null => {
    if (!url) {
      return null;
    }

    try {
      // URLオブジェクトを作成して正しいURLかを検証
      const urlObj = new URL(url);
      
      // Google Spreadsheetのドメインかチェック
      if (!urlObj.hostname.includes('docs.google.com') || !urlObj.pathname.includes('/spreadsheets/d/')) {
        return null;
      }

      // パスからIDを直接抽出
      const parts = urlObj.pathname.split('/');
      const spreadsheetIdIndex = parts.indexOf('d') + 1;
      if (spreadsheetIdIndex >= parts.length) {
        return null;
      }

      const spreadsheetId = parts[spreadsheetIdIndex];
      
      // IDの形式を検証（英数字、ハイフン、アンダースコアのみ許可）
      if (!spreadsheetId.match(/^[a-zA-Z0-9-_]+$/)) {
        return null;
      }

      return spreadsheetId;

    } catch (error) {
      return null;
    }
};

export const invokeGssApi = async (url: string, method: string, data?: object): Promise<any | null> => {
    try {
      const req = {
        method: method,
        headers: {
          Authorization: `Bearer ${await getAccessToken()}`,
          "Content-Type": "application/json"
        }
      } as RequestInit;

      if (method !== "GET" && data) {
        req.body = JSON.stringify({
          values: [data]
        });
      }

      const response = await fetch(url, req);
      if (!response.ok)  {
        console.error(await response.json());
        throw new Error('Google Spread Sheet APIの呼び出しに失敗しました');
      }

      return await response.json()
      
    } catch (error) {
      console.error(error);
      return null;
    }
  }

export const getStorageData = (): Promise<GssInfo[]> => {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get([storageKey], 
        (result) => chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(result[storageKey]));
    });
  };
  
export const setStorageData = (value: GssInfo[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ [storageKey]: value }, 
        () => chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve());
    });
  };