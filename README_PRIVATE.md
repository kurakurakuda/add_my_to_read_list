# Add My To Read List

A Chrome extension to quickly save the current web page's title, URL, and an optional category to your chosen Google Spreadsheet.

> **Note:** This extension was developed as a personal project for learning purposes and personal use. It is not actively maintained and there are no plans for future updates.

## Features

- Save the current tab's title and URL to Google Sheets with one click.
- Add an optional category for each entry.
- Manage multiple Google Spreadsheets.
- Edit or remove registered spreadsheets from the admin screen.
- No need to leave your current tab.

## How It works  

### Prerequisite   
1. Create GCP Project.  
    This is the [official guide](https://cloud.google.com/resource-manager/docs/creating-managing-projects?hl=ja)  
    You can see the existing projects [here](https://console.cloud.google.com/welcome?hl=ja&project=kurakuda-verify-household-acct)
2. Open 「APIとサービス」＞「認証情報」  
    ![画像](./doc/pic/GCP_認証情報.png)  
3. Create Service Account  
    ![画像](./doc/pic/GCP_クライアントID作成.png)  
    ![画像](./doc/pic/GCP_クライアントID作成詳細.png)  
    - Select `アプリケーションの種類` as `Chrome 拡張機能`  
    - Enter a name to `名前`  
    - Enter ID to `アイテムID`  
    ** You can get アイテムID from `chrome://extensions/` with developer mode.  
    ![画像](./doc/pic/アイテムID.png) 
4. Get Chrome App Application ID  
    ![画像](./doc/pic/GCP_AppID.png)   
    ** You can make use of this [link](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth?hl=ja#upload_to_dashboard) accordingly.  
5. Enable Google Sheets API  
    1. Open 「APIとサービス」＞「有効なAPIとサービス」  
        ![画像](./doc/pic/GCP_GoogleAPI有効化.png)  
    2. Select 「+ APIとサービスの有効化」  
        ![画像](./doc/pic/GCP_GoogleAPI有効化選択.png)  
    3. Select Google Sheets API  

### Steps
1. Copy `manifest.sample.json` to `manifest.json` and replace `oauth2.client_id` with your Chrome App Application ID.  
2. Run `npm run build:prod` to build.  
    ** You can use `npm run build:dev` for development mode.  
3. Load Chrome Extension at `chrome://extensions/` .  