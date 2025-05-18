// テスト環境フラグを設定
window.IS_TESTING = true;

import '@testing-library/jest-dom';

// Chrome APIのモック化
global.chrome = {
  storage: {
    sync: {
      get: jest.fn((keys: any, callback: (items: any) => void) => callback({"MyToReadList": []})),
      set: jest.fn((items: any, callback?: () => void) => callback && callback()),
    },
  },
  identity: {
    getAuthToken: jest.fn((options: any, callback: (token: string) => void) => callback('mock-token')),
  },
  runtime: {
    lastError: null as any,
  },
  tabs: {
    query: jest.fn((queryInfo: any) => Promise.resolve([{ id: 1, title: 'Mock Tab', url: 'https://example.com' }])),
    create: jest.fn(),
  },
} as any