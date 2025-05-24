import { getGssId, invokeGssApi, getStorageData, setStorageData } from '../src/utils'

// --- getGssId ---
describe('getGssId', () => {
  it('should extract spreadsheet ID from valid Google Sheets URL', () => {
    const url = 'https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0';
    expect(getGssId(url)).toBe('abc1234567');
  });

   it('should return null if no url is provided', () => {
    expect(getGssId()).toBeNull();
  });

   it('should return null if invalid url is provided', () => {
    expect(getGssId('aaa')).toBeNull();
  });

  it('should return null for non-Google Sheets URL', () => {
    const url = 'https://example.com/some/path';
    expect(getGssId(url)).toBeNull();
  });

  it('should return null for Google Docs URL without /spreadsheets/d/', () => {
    const url = 'https://docs.google.com/document/d/abc1234567/edit';
    expect(getGssId(url)).toBeNull();
  });

  it('should return null if spreadsheetId is missing', () => {
    const url = 'https://docs.google.com/spreadsheets/d/';
    expect(getGssId(url)).toBeNull();
  });

  it('should return null if spreadsheetId contains invalid characters', () => {
    const url = 'https://docs.google.com/spreadsheets/d/abc123$%^/edit';
    expect(getGssId(url)).toBeNull();
  });
});

// --- invokeGssApi ---
describe('invokeGssApi', () => {

  it('should call fetch with correct parameters for GET', async () => {
    const mockJson = { data: 'モックデータ' };
    const url = 'https://api.example.com';
    const result = await invokeGssApi(url, 'GET');
    expect(global.fetch).toHaveBeenCalledWith(url, expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({
        Authorization: `Bearer mock-token`,
        "Content-Type": "application/json"
      })
    }));
    expect(result).toEqual(mockJson);
  });

  it('should call fetch with correct parameters for POST and include body', async () => {
    const mockJson = { data: 'モックデータ' };

    const url = 'https://api.example.com';
    const data = { foo: 'bar' };
    const result = await invokeGssApi(url, 'POST', data);
    expect(global.fetch).toHaveBeenCalledWith(url, expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: `Bearer mock-token`,
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({ values: [data] })
    }));
    expect(result).toEqual(mockJson);
  });

  it('should call fetch with correct parameters for POST and without body', async () => {
    const mockJson = { data: 'モックデータ' };

    const url = 'https://api.example.com';
    const result = await invokeGssApi(url, 'POST');
    expect(global.fetch).toHaveBeenCalledWith(url, expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: `Bearer mock-token`,
        "Content-Type": "application/json"
      })
    }));
    expect(result).toEqual(mockJson);
  });

  it('should return null when to fail to get token', async () => {
    jest.spyOn(global.chrome.identity, 'getAuthToken').mockImplementation(
      (options: any, callback: (token: string) => void) => {
        global.chrome.runtime.lastError = { message: 'Failed to get token' };
        callback('global.chrome.runtime.lastError'); 
       }
    );

    const result = await invokeGssApi('https://api.example.com', 'GET');
    expect(result).toBeNull();
  });

  it('should return null when token is null', async () => {
    jest.spyOn(global.chrome.identity, 'getAuthToken').mockImplementation(
      (options: any, callback: (token?: string) => void) => {
        callback(undefined); 
       }
    );

    const result = await invokeGssApi('https://api.example.com', 'GET');
    expect(result).toBeNull();
  });

  it('should return null if fetch response is not ok', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 400,
      } as Response)
    );
    
    const result = await invokeGssApi('https://api.example.com', 'GET');
    expect(result).toBeNull();
  });

  it('should return null if fetch throws', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() => Promise.reject() );
    const result = await invokeGssApi('https://api.example.com', 'GET');
    expect(result).toBeNull();
  });
});

// --- getStorageData ---
describe('getStorageData', () => {
  
  it('should resolve with data when chrome.storage.sync.get succeeds', async () => {
    const result = await getStorageData();
    expect(result).toEqual([]);
  });

  it('should reject when chrome.runtime.lastError is set', async () => {
    jest.spyOn(global.chrome.storage.sync, 'get').mockImplementation(
      (key: any, callback: (items?: any) => void) => {
        global.chrome.runtime.lastError = { message: 'Failed to get token' };
        callback(undefined);
       }
    );
    await expect(getStorageData()).rejects.toEqual(global.chrome.runtime.lastError);
  });
});

// --- setStorageData ---
describe('setStorageData', () => {
  it('should resolve when chrome.storage.sync.set succeeds', async () => {
    await expect(setStorageData([])).resolves.toBeUndefined();
  });

  it('should reject when chrome.runtime.lastError is set', async () => {
    jest.spyOn(global.chrome.storage.sync, 'set').mockImplementation(
      (items: any, callback: () => void) => {
        global.chrome.runtime.lastError = { message: 'Failed to get token' };
        callback();
       }
    );
    await expect(setStorageData([])).rejects.toEqual(global.chrome.runtime.lastError);
  });
});