import { AdminModule } from '../src/admin';
import * as utils from '../src/utils';
import {
  mockGssInfo,
  mockGssInfoMinimum,
  mockGssInfoLastSelected,
  mockGssApiRes,
  mockRes,
  mockResMinimum,
  mockResLastSelected,
  mockGetStorageData,
  mockInvokeGssApi
} from './testUtils';
import * as fs from 'fs';
import * as path from 'path';

describe('AdminModule', () => {
  let addNewBtn: HTMLButtonElement;
  let tableBody: HTMLTableSectionElement;
  let resetBtn: HTMLButtonElement;
  let saveBtn: HTMLButtonElement;
  let dialog: HTMLDialogElement;
  let dialogInput: HTMLInputElement;
  let dialogCancelBtn: HTMLButtonElement;
  let dialogSaveBtn: HTMLButtonElement;

  const changeRowValues = (tableBody: HTMLTableSectionElement, rowNum: number, sheetName:string, columns: string[], isisRequireHeader: boolean) => {
    const row = tableBody.rows[rowNum];
    const cell1 = row.cells[1];
    const select1 = cell1.querySelector('select') as HTMLSelectElement;
    select1.value = sheetName;

    for (let i = 2; i <= 5; i++) {
      const cell = row.cells[i];
      const select = cell.querySelector('select') as HTMLSelectElement;
      select.value = columns[i-2];
    }

    const cell6 = row.cells[6];
    const checkbox = cell6.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = isisRequireHeader
  }

  const deleteRow = (tableBody: HTMLTableSectionElement, rowNum: number) => {
    const row = tableBody.rows[rowNum];
    const cell7 = row.cells[7];
    const deleteBtn = cell7.querySelector('button') as HTMLButtonElement;
    deleteBtn.click();
  }

  beforeEach(() => {
    const htmlPath = path.resolve(__dirname, '../public/admin.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    document.body.innerHTML = htmlContent;

    addNewBtn = document.getElementById('add-new')! as HTMLButtonElement;
    tableBody = document.getElementById('gss-table-body')! as HTMLTableSectionElement;
    resetBtn = document.getElementById('reset')! as HTMLButtonElement;
    saveBtn = document.getElementById('save')! as HTMLButtonElement;
    dialog = document.getElementById('gss-new-dialog')! as HTMLDialogElement;
    dialogInput = document.querySelector('#gss-dialog-input input')! as HTMLInputElement;
    dialogCancelBtn = document.getElementById('cancel-dialog-btn')! as HTMLButtonElement;
    dialogSaveBtn = document.getElementById('add-dialog-btn')! as HTMLButtonElement;

    jest.spyOn(window, 'alert').mockImplementation(() => {});

    // 追加: dialog.showModalをモック
    dialog.showModal = jest.fn();
    dialog.close = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const verifyRow = (row:  HTMLTableRowElement, url: string, title: string, sheetDronpwon: string[], 
    slectedSheetName: string, columnsDropdown: string[], isRequireHeader: boolean) => {
    expect(row.cells.length).toBe(8);
    // Cell 0: GSS link
    const cell0 = row.cells[0];
    const a = cell0.querySelector('a') as HTMLAnchorElement;
    expect(a).toBeTruthy();
    expect(a.href).toBe(url);
    expect(a.target).toBe('_blank');
    const span = a.querySelector('span') as HTMLSpanElement;
    expect(span).toBeTruthy();
    expect(span.className).toBe('link');
    expect(span.textContent).toBe(title);

    // Cell 1: Sheet dropdown
    const cell1 = row.cells[1];
    const select1 = cell1.querySelector('select') as HTMLSelectElement;
    expect(select1).toBeTruthy();
    expect(Array.from(select1.options).map(o => o.value)).toEqual(sheetDronpwon);
    expect(select1.value).toBe(slectedSheetName);

    // Cells 2-5: Column dropdowns
    for (let i = 2; i <= 5; i++) {
      const cell = row.cells[i];
      const select = cell.querySelector('select') as HTMLSelectElement;
      expect(select).toBeTruthy();
      expect(Array.from(select.options).map(o => o.value)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
      expect(select.value).toBe(columnsDropdown[i - 2]);
    }

    // Cell 6: Checkbox
    const cell6 = row.cells[6];
    const checkbox = cell6.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    expect(checkbox.checked).toBe(isRequireHeader);

    // Cell 7: Delete button
    const cell7 = row.cells[7];
    const btn = cell7.querySelector('button') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.className).toBe('danger');
    expect(btn.textContent).toBe('削除');
  }

  describe('Dialog Operations', () => {

    const verifyDialogClosed = () => {
      expect(dialogInput.value).toBe("");
      expect(dialog.close).toHaveBeenCalled();
    }

    describe('addNewBtn', () => {
      it('should open dialog when addNewBtn is clicked', async () => {
        await AdminModule.init();
        addNewBtn.click();
        expect(dialog.showModal).toHaveBeenCalled();
      });
    })

    describe('dialogSaveBtn', () => {

      it('should alert if GSS URL is empty on add-dialog-btn click', async () => {
        await AdminModule.init();
        dialogInput.value = '';
        await dialogSaveBtn.click();
        expect(window.alert).toHaveBeenCalledWith('Google Spreadsheet URLが正しくありません');
      });

      it('should alert if GSS URL is invalid on add-dialog-btn click', async () => {
        await AdminModule.init();
        dialogInput.value = 'aaa';
        await dialogSaveBtn.click();
        expect(window.alert).toHaveBeenCalledWith('Google Spreadsheet URLが正しくありません');
      });

      it('should alert if more than 10 GSS URL already exists', async () => {
        mockGetStorageData(Array(10).fill(mockGssInfo));
        mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes
        });
        await AdminModule.init();
        dialogInput.value = 'https://docs.google.com/spreadsheets/d/mock-gss-id/edit';
        await dialogSaveBtn.click();
        expect(window.alert).toHaveBeenCalledWith('最大10件までしか登録できません。');
      });

      it('should alert if duplicated GSS URL is added', async () => {
        mockGetStorageData([mockGssInfo]);
        mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes
        });
        await AdminModule.init();
        dialogInput.value = 'https://docs.google.com/spreadsheets/d/aaa/edit';
        await dialogSaveBtn.click();
        expect(window.alert).toHaveBeenCalledWith('既に同じURLが存在しています。');
      });

      it('should alert if invoking GSS API with added url is failed', async () => {
        mockGetStorageData([mockGssInfo]);
        mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes
        });
        await AdminModule.init();
        dialogInput.value = 'https://docs.google.com/spreadsheets/d/bbb/edit';
        await dialogSaveBtn.click();
        await new Promise(process.nextTick);
        
        expect(window.alert).toHaveBeenCalledWith(`Google Spreadsheet 情報を取得できませんでした。URLが正しいか、確認してください。 URL: https://docs.google.com/spreadsheets/d/bbb/edit`);
        verifyDialogClosed();
      });

      it('should add new GSS info when add-dialog-btn is clicked with valid input', async () => {
        mockGetStorageData([]);
        mockInvokeGssApi({
          'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes
        });
        await AdminModule.init();
        dialogInput.value = 'https://docs.google.com/spreadsheets/d/aaa/edit';
        await dialogSaveBtn.click();
        await new Promise(process.nextTick);

        verifyDialogClosed();
        
        expect(tableBody.rows.length).toBe(1);
        const row = tableBody.rows[0];
        verifyRow(row, "https://docs.google.com/spreadsheets/d/aaa/edit", "Mock Spreadsheet1",
          ['', 'Mock sheet1'], '', ['A', 'B', 'C', 'D'], true);
        
      });
    })

    describe('dialogCancelBtn', () => {
      it('should close dialog and input is changed to empty when input is empty', async () => {
        await AdminModule.init();
        dialogInput.value = '';
        dialogCancelBtn.click();
        verifyDialogClosed();
      });

      it('should close dialog and input is changed to empty when input has value', async () => {
        await AdminModule.init();
        dialogInput.value = 'aaa';
        dialogCancelBtn.click();
        verifyDialogClosed();
      });
    })

    describe('dialog', () => {
      it('should close the dialog when the outside of dialog is clicked', async () => {
        await AdminModule.init();
        dialogInput.value = 'test';
        const event = new MouseEvent('click', { bubbles: true });
        dialog.dispatchEvent(event);
        verifyDialogClosed();
      });

      it('should close the dialog when the inside of dialog is clicked', async () => {
        await AdminModule.init();
        dialogInput.value = 'test';
        const event = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(event, 'target', { value: dialogInput });
        dialog.dispatchEvent(event);
        expect(dialogInput.value).toBe('test')
      })
    });
  })

  describe('Data Load', () => {
    it('should display the data in the table when the data exists, valid ones and invalid ones.', async () => {
      const mockInvalidGssInfo: utils.GssInfo = {
          gssUrl: 'invalid-gss',
          sheetName: 'Mock sheet1',
          title: 'A',
          link: 'B',
          category: 'C',
          createdAt: 'D',
          isRequireHeader: true
      };
      const mockNotExistGssInfo: utils.GssInfo = {
          gssUrl: 'https://docs.google.com/spreadsheets/d/bbb/edit',
          title: 'A',
          link: 'B',
          category: 'C',
          createdAt: 'D',
          isRequireHeader: false
      };
      mockGetStorageData([mockGssInfo, mockGssInfoMinimum, mockNotExistGssInfo, mockInvalidGssInfo]);
      mockInvokeGssApi({
        'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes,
        'https://sheets.googleapis.com/v4/spreadsheets/ccc': mockGssApiRes('Mock Spreadsheet3', 'Mock sheet3', [])
      });
      await AdminModule.init();
      expect(tableBody.rows.length).toBe(4);

      expect(window.alert).toHaveBeenNthCalledWith(1, `Google Spreadsheet 情報を取得できませんでした。URLが正しいか、確認してください。 URL: https://docs.google.com/spreadsheets/d/bbb/edit`);
      expect(window.alert).toHaveBeenNthCalledWith(2, `Google Spreadsheet 情報を取得できませんでした。URLが正しいか、確認してください。 URL: invalid-gss`);

      const row0 = tableBody.rows[0];
      verifyRow(row0, "https://docs.google.com/spreadsheets/d/aaa/edit", "Mock Spreadsheet1",
          ['', 'Mock sheet1'], 'Mock sheet1', ['A', 'B', 'C', 'D'], true);
      const row1 = tableBody.rows[1];
      verifyRow(row1, "https://docs.google.com/spreadsheets/d/ccc/edit", "Mock Spreadsheet3",
          ['', 'Mock sheet3'], '', ['C', 'D', 'E', 'F'], false);
      const row2 = tableBody.rows[2];
      verifyRow(row2, "https://docs.google.com/spreadsheets/d/bbb/edit", "https://docs.google.com/spreadsheets/d/bbb/edit",
          [''], '', ['A', 'B', 'C', 'D'], false);
      const row3 = tableBody.rows[3];
      verifyRow(row3, "http://localhost/invalid-gss", "invalid-gss",
          [''], '', ['A', 'B', 'C', 'D'], true);
      
    })

    it('should display the data in the table when the data is empty', async () => {
      mockGetStorageData([]);
      await AdminModule.init();
      expect(tableBody.rows.length).toBe(0);
    })

    it('should alert if fail to get the data from storage', async () => {
      jest.spyOn(utils, 'getStorageData').mockRejectedValue(chrome.runtime.lastError)
      await AdminModule.init();
      expect(tableBody.rows.length).toBe(0);
      expect(window.alert).toHaveBeenCalledWith("予期せぬエラーが発生しました。時間をおいてから、画面をリフレッシュしてください。");
    })
  })

  describe('Reset', () => {
    beforeEach(async () => {
      mockGetStorageData([mockGssInfo, mockGssInfoMinimum]);
      mockInvokeGssApi({
        'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes,
        'https://sheets.googleapis.com/v4/spreadsheets/ccc': mockResMinimum
      });

      await AdminModule.init();
      expect(tableBody.rows.length).toBe(2);
    })


    it('should reset after clicking the reset button and confirm', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      changeRowValues(tableBody, 0, '', ['A', 'A', 'A', 'A'], false);
      deleteRow(tableBody, 1);
      expect(tableBody.rows.length).toBe(1);

      await resetBtn.click();
      await new Promise(process.nextTick);

      expect(tableBody.rows.length).toBe(2);
      const row0 = tableBody.rows[0];
      verifyRow(row0, "https://docs.google.com/spreadsheets/d/aaa/edit", "Mock Spreadsheet1",
          ['', 'Mock sheet1'], 'Mock sheet1', ['A', 'B', 'C', 'D'], true);
      const row1 = tableBody.rows[1];
      verifyRow(row1, "https://docs.google.com/spreadsheets/d/ccc/edit", "Mock Spreadsheet3",
          ['', 'Mock sheet3'], '', ['C', 'D', 'E', 'F'], false);

    })

    it('should reset after clicking the reset button and not confirm', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);

      changeRowValues(tableBody, 0, '', ['A', 'A', 'A', 'A'], false);  
      deleteRow(tableBody, 1);
      expect(tableBody.rows.length).toBe(1);

      await resetBtn.click();
      await new Promise(process.nextTick);

      expect(tableBody.rows.length).toBe(1);
      const row0 = tableBody.rows[0];
      verifyRow(row0, "https://docs.google.com/spreadsheets/d/aaa/edit", "Mock Spreadsheet1",
          ['', 'Mock sheet1'], '', ['A', 'A', 'A', 'A'], false);
    })

    it('should alert if fail to get the data from the storage', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      jest.spyOn(utils, 'getStorageData').mockRejectedValue(chrome.runtime.lastError)

      changeRowValues(tableBody, 0, '', ['A', 'A', 'A', 'A'], false);   
      deleteRow(tableBody, 1);
      expect(tableBody.rows.length).toBe(1);

      await resetBtn.click();
      await new Promise(process.nextTick);

      expect(tableBody.rows.length).toBe(0);
      expect(window.alert).toHaveBeenCalledWith("予期せぬエラーが発生しました。時間をおいてから、画面をリフレッシュしてください。");
    })
  })

  describe('Save', () => {

    it('should save successfully', async () => {
      mockGetStorageData([mockGssInfoMinimum, mockGssInfoLastSelected]);
      mockInvokeGssApi({
        'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes,
        'https://sheets.googleapis.com/v4/spreadsheets/ccc': mockResMinimum,
        'https://sheets.googleapis.com/v4/spreadsheets/ddd': mockResLastSelected
      });
      const mockSetStorageData = jest.spyOn(utils, 'setStorageData');

      await AdminModule.init();
      // 1行目を削除
      deleteRow(tableBody, 0);

      dialogInput.value = 'https://docs.google.com/spreadsheets/d/aaa/edit';
      await dialogSaveBtn.click();
      await new Promise(process.nextTick);
      expect(tableBody.rows.length).toBe(2);

      changeRowValues(tableBody, 0, 'Mock sheet4', ['F', 'E', 'D', 'C'], false);

      await saveBtn.click();
      await new Promise(process.nextTick);

      expect(mockSetStorageData).toHaveBeenCalledWith([
        {
          gssUrl: 'https://docs.google.com/spreadsheets/d/ddd/edit',
          sheetName: 'Mock sheet4',
          title: 'F',
          link: 'E',
          category: 'D',
          createdAt: 'C',
          isRequireHeader: false,
          lastSelected: true,
          lastSelectedCategory: 'Mock Category'
        },
        {
          gssUrl: 'https://docs.google.com/spreadsheets/d/aaa/edit',
          title: 'A',
          link: 'B',
          category: 'C',
          createdAt: 'D',
          isRequireHeader: true,
          lastSelected: false
        }
      ]);
      expect(window.alert).toHaveBeenCalledWith('保存しました');
    })

    it('should alert if duplicate columns are selected on save', async () => {
      mockGetStorageData([mockGssInfo]);
      mockInvokeGssApi({
        'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes
      });

      await AdminModule.init();
      changeRowValues(tableBody, 0, '', ['A', 'A', 'A', 'A'], false);

      await saveBtn.click();
      expect(window.alert).toHaveBeenCalledWith('同じ列を重複して、指定することはできません。');
    })

    it('should alert if fail to get the date from the storage', async () => {
      mockGetStorageData([mockGssInfo]);
      mockInvokeGssApi({
        'https://sheets.googleapis.com/v4/spreadsheets/aaa': mockRes
      });
      jest.spyOn(utils, 'getStorageData').mockRejectedValue(chrome.runtime.lastError)

      await AdminModule.init();

      await saveBtn.click();
      expect(window.alert).toHaveBeenCalledWith('処理に失敗しました。時間をおいてから再度試してみてください');
    })
  })
});