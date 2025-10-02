# WhatsApp Number Checker

A powerful web application for checking and verifying phone numbers on WhatsApp with support for multiple sessions.

## Features

- 🔐 **Multi-Session Support**: Manage multiple WhatsApp sessions simultaneously
- 📱 **QR Code Authentication**: Easy QR code scanning for session authentication
- 🔍 **Bulk Number Checking**: Verify multiple phone numbers at once
- 📊 **DataTable Results**: View results in an organized, searchable table
- 📥 **Export to CSV**: Export your results for further analysis
- 🎨 **Modern UI**: Clean, responsive design with FontAwesome icons and Google Fonts
- 🌐 **English Interface**: Full English language support

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Chrome/Chromium browser (for Puppeteer)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/MohamdHasan9631/wacheckeravatars.git
cd wacheckeravatars
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

### 1. Create a WhatsApp Session

1. Go to the **Sessions** tab
2. Enter a unique session name (e.g., "session-1")
3. Click **Create New Session**
4. Wait for the QR code to appear
5. Scan the QR code with your WhatsApp mobile app (WhatsApp → Settings → Linked Devices → Link a Device)

### 2. Check Phone Numbers

1. Navigate to the **Number Checker** tab
2. Select an active (connected) session from the dropdown
3. Enter phone numbers in international format (one per line):
   ```
   +1234567890
   +9876543210
   ```
4. Click **Check Numbers**
5. Wait for the verification process to complete

### 3. View Results

1. Go to the **Results** tab to view all checked numbers
2. Results show:
   - Number status (Valid/Invalid)
   - WhatsApp ID
   - Contact name
   - Business account indicator
   - Profile picture availability
3. Export results to CSV for further analysis

## API Endpoints

### Sessions

- `POST /api/session/create` - Create a new WhatsApp session
- `GET /api/sessions` - List all active sessions
- `GET /api/session/:sessionId/qr` - Get QR code for session
- `GET /api/session/:sessionId/status` - Get session status
- `DELETE /api/session/:sessionId` - Delete a session

### Number Checking

- `POST /api/check-numbers` - Check phone numbers
  ```json
  {
    "sessionId": "session-1",
    "numbers": ["+1234567890", "+9876543210"]
  }
  ```

## Technology Stack

- **Backend**: Node.js, Express.js
- **WhatsApp Integration**: whatsapp-web.js
- **Frontend**: HTML5, CSS3, JavaScript
- **UI Components**: DataTables, jQuery
- **Icons**: FontAwesome 6
- **Fonts**: Google Fonts (Inter)

## Security Notes

- Session data is stored locally in the `.wwebjs_auth` folder
- Never commit the `.wwebjs_auth` folder to version control
- Use environment variables for sensitive configuration in production
- This tool is for legitimate verification purposes only

## Troubleshooting

### Puppeteer/Chromium Issues

If you encounter issues with Puppeteer during installation:
```bash
PUPPETEER_SKIP_DOWNLOAD=true npm install
```

Then install Chrome/Chromium manually on your system.

### Session Connection Issues

- Ensure your phone has an active internet connection
- Make sure WhatsApp is updated to the latest version
- Try creating a new session if connection fails

### Port Already in Use

If port 3000 is already in use, modify the `PORT` variable in `server.js`:
```javascript
const PORT = 3001; // Change to any available port
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Disclaimer

This tool is for educational and legitimate business purposes only. Users are responsible for complying with WhatsApp's Terms of Service and applicable laws.
