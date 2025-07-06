# Add My To Read List

A Chrome extension to quickly save the current web page's title, URL, and an optional category to your chosen Google Spreadsheet.

> **Note:** This extension was developed as a personal project for learning purposes and personal use. It is not actively maintained and there are no plans for future updates.

## Features

- Save the current tab's title and URL to Google Sheets with one click.
- Add an optional category for each entry.
- Manage multiple Google Spreadsheets.
- Edit or remove registered spreadsheets from the admin screen.
- No need to leave your current tab.

## Usage

1. **Setup Google Cloud Project**
   - Create a GCP project and enable the Google Sheets API.
   - Register an OAuth2 client for a Chrome extension and get your client ID.
   - See [Google's official guide](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth) for details.

2. **Configure the Extension**
   - Copy `public/manifest.sample.json` to `public/manifest.json`.
   - Replace `YOUR_CLIENT_ID` with your OAuth2 client ID.

3. **Build and Load**
   - Run `npm install` to install dependencies.
   - Build the extension:  
     `npm run build:prod`
   - Load the `dist` folder as an unpacked extension at `chrome://extensions/`.

## How It Works

- Click the extension icon to open the popup.
- Select or enter a Google Spreadsheet URL.
- Optionally enter a category.
- Click "Save" to add the page info to your spreadsheet.
- Use the "Admin" link to manage registered spreadsheets.

## License

MIT
