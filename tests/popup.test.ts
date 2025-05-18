import { PopupModule } from '../src/popup';
import * as utils from '../src/utils';
import * as fs from 'fs';
import * as path from 'path';

describe('PopupModule', () => {
  let mockGssUrlInput: HTMLInputElement;
  let mockGssUrlDropdown: HTMLSelectElement;
  let mockGssTitleArea: HTMLElement;
  let mockCategoryInput: HTMLInputElement;
  let mockCategoryDropdown: HTMLSelectElement;
  let mockTitleInput: HTMLInputElement;

  // sheetName is set
  // isisRequireHeader is true
  // lastXXX is not set
  const mockGssInfo: utils.GssInfo = {
          gssUrl: 'https://docs.google.com/spreadsheets/d/aaa/edit',
          sheetName: 'Mock sheet1',
          title: '',
          link: '',
          category: '',
          createdAt: '',
          isRequireHeader: true
        };
  // sheetName is not set
  // isisRequireHeader is false
  // lastXXX is not set
  const mockGssInfoMinimum: utils.GssInfo = {
          gssUrl: 'https://docs.google.com/spreadsheets/d/ccc/edit',
          title: '',
          link: '',
          category: '',
          createdAt: '',
          isRequireHeader: false
        };

  // sheetName is set
  // isisRequireHeader is true
  // lastXXX is set
  const mockGssInfoLastSelected: utils.GssInfo = {
          gssUrl: 'https://docs.google.com/spreadsheets/d/ddd/edit',
          sheetName: 'Mock sheet4',
          title: '',
          link: '',
          category: '',
          createdAt: '',
          isRequireHeader: true,
          lastSelected: true,
          lastSelectedCategory: 'Mock Category'
        };

  const mockGssApiRes = (title: string, sheetName: string, rowData: (string|null)[]) => {
    return {
          properties: { title: title },
          sheets: [
            {
              properties: { title: sheetName },
              data: [{ rowData: rowData.map((d)=> { return { values: [{ formattedValue: d }] }}) }]
            }
          ]
        };
  }
  // mock gss api response for mockGssInfo1
  const mockRes = mockGssApiRes('Mock Spreadsheet1', 'Mock sheet1', ['data11', 'data12', null]);
  // mock gss api response for mockGssInfo3
  const mockResMinimum = mockGssApiRes('Mock Spreadsheet3', 'Mock sheet3', ['data31', 'data32', null]);
  // mock gss api response for mockGssInfo4
  const mockResLastSelected = mockGssApiRes('Mock Spreadsheet4', 'Mock sheet4', ['data41', 'data42', 'data43', 'data44', 'data45', 'data46', null]);

  const mockGetStorageData = (infos: utils.GssInfo[]) => jest.spyOn(utils, 'getStorageData').mockResolvedValue(infos);
  const mockInvokeGssApi = (urlMap: object) => jest.spyOn(utils, 'invokeGssApi').mockImplementation((url: string, method: string) => {
          const urlEntry = Object.entries(urlMap).find(([key]) => url.includes(key));
          return Promise.resolve(urlEntry ? urlEntry[1] : null);
        });

  const verifyGssTitleArea = (link: string, text: string) => {
        const aLink  = mockGssTitleArea.firstChild as HTMLAnchorElement;
        const span = aLink!.firstChild as HTMLSpanElement;
        expect(aLink.href).toBe(link);
        expect(aLink.target).toBe('_blank');
        expect(span.textContent).toBe(text);
        expect(span.className).toBe('link');
      };

  const verifyCategoryDropdown = (length: number, size:number, texts: string[]) => {
    expect(mockCategoryDropdown.options.length).toBe(length);
    expect(mockCategoryDropdown.size).toBe(size);
    for (let i = 0; i < mockCategoryDropdown.options.length; i++) {
      expect(mockCategoryDropdown.options[i].value).toBe(texts[i]);
    }
  };

  beforeEach(() => {
    const htmlPath = path.resolve(__dirname, '../public/popup.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    document.body.innerHTML = htmlContent;
    
    mockGssUrlInput = document.querySelector<HTMLInputElement>('#gss-url input')!;
    mockGssUrlDropdown = document.querySelector<HTMLSelectElement>('#gss-url select')!;
    mockGssTitleArea = document.querySelector<HTMLElement>('#gss-title')!;
    mockCategoryInput = document.querySelector<HTMLInputElement>('#category input')!;
    mockCategoryDropdown = document.querySelector<HTMLSelectElement>('#category select')!;
    mockTitleInput = document.querySelector<HTMLInputElement>('#title input')!;

    jest.spyOn(window, 'close').mockImplementation(() => {});
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Actions independent on Data', () => {
    beforeEach(async () => {
      await PopupModule.init();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    const verifyToggleDropdown = (dropdown: HTMLSelectElement, display: string) => {
      expect(dropdown.style.display).toBe(display);
      expect(dropdown.selectedIndex).toBe(-1);
    };

    it('toggleDropdown : gssUrlSelectBtn is clicked', () => {
      const mockGssUrlSelectBtn = document.querySelector<HTMLButtonElement>('#gss-url button')!;
      mockGssUrlSelectBtn.click();
      verifyToggleDropdown(mockGssUrlDropdown, 'block');

      mockGssUrlSelectBtn.click();
      verifyToggleDropdown(mockGssUrlDropdown, 'none');
    });

    it('toggleDropdown : categorySelectBtn is clicked', () => {
      const mockCategorySelectBtn = document.querySelector<HTMLButtonElement>('#category button')!;
      mockCategorySelectBtn.click();
      verifyToggleDropdown(mockCategoryDropdown, 'block');

      mockCategorySelectBtn.click();
      verifyToggleDropdown(mockCategoryDropdown, 'none');
    });

    it('cancelBtn is clicked', () => {
      const mockCancelBtn = document.querySelector('#cancel')!;
      mockCancelBtn.dispatchEvent(new Event('click'));
      expect(window.close).toHaveBeenCalled();
    });

    it('adminLink is clicked', () => {
      const mockAdminLink = document.querySelector<HTMLElement>("#admin-link")!;
      mockAdminLink.dispatchEvent(new Event('click'));
      expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'admin.html' });
    });
  });

  describe('Initialization', () => {
    // "gsses" is the important variable in popup.ts.
    // Hence loadData function is tested independently.
    describe('loadData', () => {
      it('should load empty data from storage', async () => {
        mockGetStorageData([]);
        const data = await PopupModule._private!.loadData();
        expect(data).toEqual([]);
      });
      
      it('should load valid data from storage', async () => {
        const mockGssInfoInvalid: utils.GssInfo = {
          gssUrl: 'https://docs.google.com/spreadsheets/d/bbb/edit',
          sheetName: 'no match sheet name',
          title: '',
          link: '',
          category: '',
          createdAt: '',
          isRequireHeader: false
        };
        mockGetStorageData([mockGssInfo, mockGssInfoInvalid, mockGssInfoMinimum]);
        mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes,
          'https://sheets.googleapis.com/v4/spreadsheets/bbb': mockGssApiRes('Mock Spreadsheet2', 'Mock sheet2', ['data21', 'data22', null]),
          'https://sheets.googleapis.com/v4/spreadsheets/ccc': mockResMinimum
        });
        
        const data = await PopupModule._private!.loadData();
        expect(data[0].title).toEqual('Mock Spreadsheet1');
        expect(data[0].url).toEqual('https://docs.google.com/spreadsheets/d/aaa/edit');
        expect(data[0].categories.length).toEqual(1);
        expect(data[0].categories[0]).toEqual('data12');
        expect(data[0].info).toEqual(mockGssInfo);
  
        expect(data[1].title).toEqual('Mock Spreadsheet2');
        expect(data[1].url).toEqual('https://docs.google.com/spreadsheets/d/bbb/edit');
        expect(data[1].categories.length).toEqual(0);
        expect(data[1].info).toEqual(mockGssInfoInvalid);

        expect(data[2].title).toEqual('Mock Spreadsheet3');
        expect(data[2].url).toEqual('https://docs.google.com/spreadsheets/d/ccc/edit');
        expect(data[2].categories.length).toEqual(2);
        expect(data[2].categories[0]).toEqual('data31');
        expect(data[2].categories[1]).toEqual('data32');
        expect(data[2].info).toEqual(mockGssInfoMinimum);
      });
  
      it('should load invalid data from storage', async () => {
        const info1: utils.GssInfo = {
          gssUrl: 'http://example.com/',
          title: '',
          link: '',
          category: '',
          createdAt: '',
          isRequireHeader: false
        };
        const info2: utils.GssInfo = {
          gssUrl: 'https://docs.google.com/spreadsheets/d/zzz/edit',
          title: '',
          link: '',
          category: '',
          createdAt: '',
          isRequireHeader: false
        };
        mockGetStorageData([info1, info2]);
        mockInvokeGssApi({});
        const data = await PopupModule._private!.loadData();
  
        expect(data[0].title).toEqual('http://example.com/');
        expect(data[0].url).toEqual('http://example.com/');
        expect(data[0].categories.length).toEqual(0);
        expect(data[0].info).toEqual(info1);
        expect(data[1].title).toEqual('https://docs.google.com/spreadsheets/d/zzz/edit');
        expect(data[1].url).toEqual('https://docs.google.com/spreadsheets/d/zzz/edit');
        expect(data[1].categories.length).toEqual(0);
        expect(data[1].info).toEqual(info2);
      });
      
    });
  
    describe('initialize and dsiplay the data', () => {
      it('should display empty data', async () => {
        mockGetStorageData([]);
        await PopupModule.init();
        expect(mockTitleInput.value).toBe('Mock Tab');
        
        expect(mockGssUrlDropdown.length).toBe(0);
  
        expect(mockGssTitleArea.innerHTML).toBe('');
        expect(mockCategoryDropdown.options.length).toBe(0);
        expect(mockCategoryDropdown.size).toBe(2);
  
        expect(mockGssUrlInput.value).toBe('');
        expect(mockCategoryInput.value).toBe('');
      });
  
      it('should display data', async () => {
        mockGetStorageData([mockGssInfoLastSelected, mockGssInfoMinimum]);
        mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/ddd': mockResLastSelected,
          'https://sheets.googleapis.com/v4/spreadsheets/ccc': mockResMinimum
        });
        
        await PopupModule.init();
        expect(mockTitleInput.value).toBe('Mock Tab');
        
        expect(mockGssUrlDropdown.length).toBe(2);
        expect(mockGssUrlDropdown.options[0].text).toBe('Mock Spreadsheet4');
        expect(mockGssUrlDropdown.options[0].value).toBe('https://docs.google.com/spreadsheets/d/ddd/edit');
        expect(mockGssUrlDropdown.options[0].title).toBe('https://docs.google.com/spreadsheets/d/ddd/edit');
        expect(mockGssUrlDropdown.options[1].text).toBe('Mock Spreadsheet3');
        expect(mockGssUrlDropdown.options[1].value).toBe('https://docs.google.com/spreadsheets/d/ccc/edit');
        expect(mockGssUrlDropdown.options[1].title).toBe('https://docs.google.com/spreadsheets/d/ccc/edit');
  
        verifyGssTitleArea('https://docs.google.com/spreadsheets/d/ddd/edit', 'Mock Spreadsheet4');
        verifyCategoryDropdown(5, 4, ['data42', 'data43', 'data44', 'data45', 'data46']);
        
        expect(mockGssUrlInput.value).toBe('https://docs.google.com/spreadsheets/d/ddd/edit');
        expect(mockCategoryInput.value).toBe('Mock Category');
      });
    });
  });

  describe('Actions User change the values', () => {
    describe('handleGssUrlInput : change the value in gssUrlInput', () => {

      const verifyClearGssTitleAndCategoryOptions = () => {
        expect(mockGssTitleArea.innerHTML).toBe('');
        expect(mockCategoryInput.value).toBe('');
        expect(mockCategoryDropdown.options.length).toBe(0);
      };

      afterEach(() => {
        jest.clearAllMocks();
      });

      it('should clear title and category options for a empty GSS URL', async () => {
        mockGetStorageData([mockGssInfoLastSelected]);
        mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/ddd': mockResLastSelected
        });

        await PopupModule.init();

        mockGssUrlInput.value = '';
        mockGssUrlInput.dispatchEvent(new Event('change'));

        verifyClearGssTitleAndCategoryOptions();
      });

      it('should clear title and category options for a invalid GSS URL', async () => {  
        mockGetStorageData([]);

        await PopupModule.init();

        mockGssUrlInput.value = 'http://example.com';
        mockGssUrlInput.dispatchEvent(new Event('change'));

        verifyClearGssTitleAndCategoryOptions();
      });

      it('should update title and category options with existing gss.', async () => {
        mockGetStorageData([mockGssInfoLastSelected, mockGssInfo]);
        mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/ddd': mockResLastSelected,
          'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes
        });

        await PopupModule.init();

        mockGssUrlInput.value = 'https://docs.google.com/spreadsheets/d/aaa/edit';
        mockGssUrlInput.dispatchEvent(new Event('change'));

        verifyGssTitleArea('https://docs.google.com/spreadsheets/d/aaa/edit', 'Mock Spreadsheet1');
        verifyCategoryDropdown(1, 2, ['data12']);
        expect(mockCategoryInput.value).toBe('');
      });

      it('should clear title and category options when to fail to invoke gss api', async () => {
        mockGetStorageData([mockGssInfoLastSelected, mockGssInfo]);
        mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/ddd': mockResLastSelected,
          'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes
        });

        await PopupModule.init();

        // Set this url for mock to return as null
        mockGssUrlInput.value = 'https://docs.google.com/spreadsheets/d/ccc/edit';
        await mockGssUrlInput.dispatchEvent(new Event('change'));

        verifyClearGssTitleAndCategoryOptions();
      });

      it('should update title and category options with new gss.', async () => {
        mockGetStorageData([mockGssInfoLastSelected]);
        mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/ddd': mockResLastSelected,
          'https://sheets.googleapis.com/v4/spreadsheets/ccc': mockResMinimum
        });

        await PopupModule.init();

        mockGssUrlInput.value = 'https://docs.google.com/spreadsheets/d/ccc/edit';
        await mockGssUrlInput.dispatchEvent(new Event('change'));

        verifyGssTitleArea('https://docs.google.com/spreadsheets/d/ccc/edit', 'Mock Spreadsheet3');
        verifyCategoryDropdown(0, 2, []);
        expect(mockCategoryInput.value).toBe('');
      });
    });

    describe('handleGssUrlDropdown : change the value in gssUrlDropdown', () => {
      it('should update input and options based on dropdown selection', async () => {
        mockGetStorageData([mockGssInfoLastSelected, mockGssInfo]);
        mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/ddd': mockResLastSelected,
          'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes
        });

        await PopupModule.init();

        const mockGssUrlSelectBtn = document.querySelector<HTMLButtonElement>('#gss-url button')!;
        mockGssUrlSelectBtn.click();
        expect(mockGssUrlDropdown.style.display).toBe('block');

        mockGssUrlDropdown.value = 'https://docs.google.com/spreadsheets/d/aaa/edit';
        mockGssUrlDropdown.dispatchEvent(new Event('change'));

        verifyGssTitleArea('https://docs.google.com/spreadsheets/d/aaa/edit', 'Mock Spreadsheet1');
        verifyCategoryDropdown(1, 2, ['data12']);
        expect(mockGssUrlInput.value).toBe('https://docs.google.com/spreadsheets/d/aaa/edit');
        expect(mockGssUrlDropdown.style.display).toBe('none');
      });

      it('should update input and options based on dropdown selection', async () => {
        mockGetStorageData([mockGssInfoLastSelected, mockGssInfo]);
        mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/ddd': mockResLastSelected,
          'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes
        });

        await PopupModule.init();

        const mockGssUrlSelectBtn = document.querySelector<HTMLButtonElement>('#gss-url button')!;
        mockGssUrlSelectBtn.click();
        expect(mockGssUrlDropdown.style.display).toBe('block');

        mockGssUrlDropdown.value = 'https://docs.google.com/spreadsheets/d/ccc/edit';
        mockGssUrlDropdown.dispatchEvent(new Event('change'));

        expect(window.alert).toHaveBeenCalledWith('予期せぬエラーが発生しました。設定が正しいか、確認してください。');
        expect(mockGssUrlDropdown.style.display).toBe('block');
      })
    });

    describe('changeFieldValue : change the value in categoryDropdown', () => {
      it('should update input value and hide dropdown', async () => {
        mockGetStorageData([mockGssInfoLastSelected, mockGssInfo]);
        mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/ddd': mockResLastSelected,
          'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes
        });

        await PopupModule.init();

        const mockCategorySelectBtn = document.querySelector<HTMLButtonElement>('#category button')!;
        mockCategorySelectBtn.click();
        expect(mockCategoryDropdown.style.display).toBe('block');

        mockCategoryDropdown.value = 'data43';
        mockCategoryDropdown.dispatchEvent(new Event('change'));

        expect(mockCategoryInput.value).toBe('data43');
        expect(mockCategoryDropdown.style.display).toBe('none');
      });
    });

    describe('save : save the gss to the spread sheet', () => {

      let mockSaveBtn:HTMLButtonElement;

      beforeEach(() => {
        mockSaveBtn = document.querySelector<HTMLButtonElement>('#save')!;
      });

      it('should alert when gss url is empty', async () => {
        mockGetStorageData([]);
        await PopupModule.init();

        mockGssUrlInput.value = '';
        mockSaveBtn.click();

        expect(window.alert).toHaveBeenCalledWith('Google Spreadsheet URLが正しくありません');
      });

      it('should alert when gss url is invalid', async () => {
        mockGetStorageData([]);
        await PopupModule.init();

        mockGssUrlInput.value = 'http://example.com';
        mockSaveBtn.click();

        expect(window.alert).toHaveBeenCalledWith('Google Spreadsheet URLが正しくありません');
      });

      it('should alert when the existing gss is more than 10', async () => {
        mockGetStorageData(Array(10).fill(mockGssInfo));
        jest.spyOn(utils, 'getStorageData').mockResolvedValue(Array(10).fill(mockGssInfo));
        mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes
        });
        await PopupModule.init();

        mockGssUrlInput.value = 'https://docs.google.com/spreadsheets/d/zzz/edit';
        mockSaveBtn.click();

        expect(window.alert).toHaveBeenCalledWith('最大10件までしか登録できません。');
      });

      it('should alert when invoking Gss API is failed', async () => {
        mockGetStorageData([mockGssInfoLastSelected]);
        mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes
        });
        await PopupModule.init();

        mockGssUrlInput.value = 'https://docs.google.com/spreadsheets/d/zzz/edit';
        await mockSaveBtn.click();

        expect(window.alert).toHaveBeenCalledWith('書込み処理に失敗しました。設定が正しいか、確認してください。');
      });

      it('should save new GSS successfully', async () => {
        mockGetStorageData([]);
        const mockSetStorageData = jest.spyOn(utils, 'setStorageData');
        const mockedmockInvokeGssApi = mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes
        });
        await PopupModule.init();

        mockGssUrlInput.value = 'https://docs.google.com/spreadsheets/d/aaa/edit';
        mockCategoryInput.value = 'Category';
        await mockSaveBtn.click();

        expect(mockedmockInvokeGssApi).toHaveBeenCalledWith(
          'https://sheets.googleapis.com/v4/spreadsheets/aaa/values/A2:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',
          'POST', 
          ['Mock Tab', 'https://example.com', 'Category', expect.any(String), null, null]
        );
        expect(mockSetStorageData).toHaveBeenCalledWith([{
          gssUrl: 'https://docs.google.com/spreadsheets/d/aaa/edit',
          title: 'A',
          link: 'B',
          category: 'C',
          createdAt: 'D',
          isRequireHeader: true,
          lastSelected: true,
          lastSelectedCategory: 'Category'
        }]);
      });

      it('should save existing GSS with isRequireHeader false successfully', async () => {
        const mockGssInfoToSave: utils.GssInfo = {
          gssUrl: 'https://docs.google.com/spreadsheets/d/eee/edit',
          sheetName: 'Mock sheet5',
          title: 'F',
          link: 'E',
          category: 'D',
          createdAt: 'C',
          isRequireHeader: false,
          lastSelected: true,
          lastSelectedCategory: 'Mock Category5'
        };
        mockGetStorageData([mockGssInfoToSave]);
        const mockSetStorageData = jest.spyOn(utils, 'setStorageData');
        const mockedmockInvokeGssApi = mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/eee': mockGssApiRes('Mock Spreadsheet5', 'Mock sheet5', ['data51', 'data52', 'data53', null])
        });
        await PopupModule.init();

        mockGssUrlInput.value = 'https://docs.google.com/spreadsheets/d/eee/edit';
        await mockSaveBtn.click();

        expect(mockedmockInvokeGssApi).toHaveBeenCalledWith(
          'https://sheets.googleapis.com/v4/spreadsheets/eee/values/Mock sheet5!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',
          'POST', 
          [null, null, expect.any(String), 'Mock Category5', 'https://example.com', 'Mock Tab']
        );
        expect(mockSetStorageData).toHaveBeenCalledWith([{
          gssUrl: 'https://docs.google.com/spreadsheets/d/eee/edit',
          sheetName: 'Mock sheet5',
          title: 'F',
          link: 'E',
          category: 'D',
          createdAt: 'C',
          isRequireHeader: false,
          lastSelected: true,
          lastSelectedCategory: 'Mock Category5'
        }]);
      });

      it('should save existing GSS with isRequireHeader true successfully', async () => {
        const mockGssInfoToSave: utils.GssInfo = {
          gssUrl: 'https://docs.google.com/spreadsheets/d/fff/edit',
          sheetName: '',
          title: 'F',
          link: 'E',
          category: 'D',
          createdAt: 'C',
          isRequireHeader: true,
          lastSelected: true,
          lastSelectedCategory: 'Mock Category6'
        };
        mockGetStorageData([mockGssInfoToSave]);
        const mockSetStorageData = jest.spyOn(utils, 'setStorageData')
        const mockedmockInvokeGssApi = mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/fff': mockGssApiRes('Mock Spreadsheet6', 'Mock sheet6', ['data61', 'data62', 'data63', null])
        });
        await PopupModule.init();

        mockGssUrlInput.value = 'https://docs.google.com/spreadsheets/d/fff/edit';
        await mockSaveBtn.click();

        expect(mockedmockInvokeGssApi).toHaveBeenCalledWith(
          'https://sheets.googleapis.com/v4/spreadsheets/fff/values/A2:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',
          'POST', 
          [null, null, expect.any(String), 'Mock Category6', 'https://example.com', 'Mock Tab']
        );
        expect(mockSetStorageData).toHaveBeenCalledWith([{
          gssUrl: 'https://docs.google.com/spreadsheets/d/fff/edit',
          sheetName: '',
          title: 'F',
          link: 'E',
          category: 'D',
          createdAt: 'C',
          isRequireHeader: true,
          lastSelected: true,
          lastSelectedCategory: 'Mock Category6'
        }]);
      });
    });

    describe('close', () => {
      let mockGssUrlArea: HTMLElement;
      let mockCategoryArea: HTMLElement;

      const verifyDisplayState = (gssUrlDropdownState: string, categoryDropdownState: string) => {
        expect(mockGssUrlDropdown.style.display).toBe(gssUrlDropdownState);
        expect(mockCategoryDropdown.style.display).toBe(categoryDropdownState);
      };

      beforeEach(() => {
        mockGssUrlArea = document.querySelector<HTMLElement>('#gss-url')!;
        mockCategoryArea = document.querySelector<HTMLElement>('#category')!;
        // Set dropdowns visible for test
        mockGssUrlDropdown.style.display = 'block';
        mockCategoryDropdown.style.display = 'block';
      });

      it('should hide both dropdowns if click is outside both areas', () => {
        const event = { target: document.body } as unknown as MouseEvent;
        PopupModule.close(event);
        verifyDisplayState('none','none');
      });

      it('should not hide gssUrlDropdown if click is inside #gss-url', () => {
        const event = { target: mockGssUrlArea } as unknown as MouseEvent;
        PopupModule.close(event);
        verifyDisplayState('block','none');
      });

      it('should not hide categoryDropdown if click is inside #category', () => {
        const event = { target: mockCategoryArea } as unknown as MouseEvent;
        PopupModule.close(event);
        verifyDisplayState('none', 'block');
      });
    });
  });
});
