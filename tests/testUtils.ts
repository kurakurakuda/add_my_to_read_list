import * as utils from '../src/utils';

// sheetName is set
// isisRequireHeader is true
// lastXXX is not set
export const mockGssInfo: utils.GssInfo = {
        gssUrl: 'https://docs.google.com/spreadsheets/d/aaa/edit',
        sheetName: 'Mock sheet1',
        title: 'A',
        link: 'B',
        category: 'C',
        createdAt: 'D',
        isRequireHeader: true
    };
// sheetName is not set
// isisRequireHeader is false
// lastXXX is not set
export const mockGssInfoMinimum: utils.GssInfo = {
        gssUrl: 'https://docs.google.com/spreadsheets/d/ccc/edit',
        title: 'C',
        link: 'D',
        category: 'E',
        createdAt: 'F',
        isRequireHeader: false
    };

// sheetName is set
// isisRequireHeader is true
// lastXXX is set
export const mockGssInfoLastSelected: utils.GssInfo = {
        gssUrl: 'https://docs.google.com/spreadsheets/d/ddd/edit',
        sheetName: '',
        title: 'A',
        link: 'B',
        category: 'C',
        createdAt: 'D',
        isRequireHeader: true,
        lastSelected: true,
        lastSelectedCategory: 'Mock Category'
    };

export const mockGssApiRes = (title: string, sheetName: string, rowData: (string|null)[]) => {
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
export const mockRes = mockGssApiRes('Mock Spreadsheet1', 'Mock sheet1', ['data11', 'data12', null]);
// mock gss api response for mockGssInfo3
export const mockResMinimum = mockGssApiRes('Mock Spreadsheet3', 'Mock sheet3', ['data31', 'data32', null]);
// mock gss api response for mockGssInfo4
export const mockResLastSelected = mockGssApiRes('Mock Spreadsheet4', 'Mock sheet4', ['data41', 'data42', 'data43', 'data44', 'data45', 'data46', null]);

export const mockGetStorageData = (infos: utils.GssInfo[]) => jest.spyOn(utils, 'getStorageData').mockResolvedValue(infos);
export const mockInvokeGssApi = (urlMap: object) => jest.spyOn(utils, 'invokeGssApi').mockImplementation((url: string, method: string) => {
        const urlEntry = Object.entries(urlMap).find(([key]) => url.includes(key));
        return Promise.resolve(urlEntry ? urlEntry[1] : null);
    });