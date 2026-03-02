# Discord to Trello "Big Wins" Bot

Automatically creates Trello cards from Discord messages containing links. Perfect for tracking team achievements, wins, and important resources!

## Features

- **Historical Processing**: Processes all messages from January 21, 2026 onwards
- **Real-time Monitoring**: Continuously watches for new messages with links
- **Duplicate Prevention**: Tracks processed messages to avoid creating duplicate cards
- **Rate Limit Handling**: Built-in delays to respect Discord and Trello API limits
- **Error Resilience**: Graceful error handling with detailed logging

## How It Works

1. Bot scans Discord channel for messages containing URLs
2. For each URL found, creates a Trello card:
   - **Card Title**: Username of the person who posted
   - **Card Description**: The URL link
3. Continues monitoring for new messages in real-time

## Prerequisites

- Node.js v16.9.0 or higher
- A Discord account with server access
- A Trello account
- Admin access to a Trello board

## Setup Instructions

### 1. Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and name it (e.g., "Big Wins Trello Bot")
3. Go to "Bot" tab and click "Add Bot"
4. **IMPORTANT**: Under "Privileged Gateway Intents", enable:
   - ✅ **MESSAGE CONTENT INTENT** (required to read messages)
   - ✅ **SERVER MEMBERS INTENT** (optional)
5. Click "Reset Token" and copy the token (save it for `.env` file)
6. Go to "OAuth2" > "URL Generator":
   - Select scopes: `bot`
   - Select permissions: `Read Messages/View Channels`, `Read Message History`
7. Copy the generated URL and open it to invite the bot to your server

### 2. Trello API Setup

1. Go to [Trello Power-Ups Admin](https://trello.com/power-ups/admin)
2. Create a new Power-Up or use existing to get your **API Key**
3. Click "Token" link to generate a **Token** (or visit the authorization URL shown in `.env.example`)
4. Get your **Board ID** and **List ID**:

**Method 1 - Using Browser:**
- Open your Trello board
- Add `.json` to the URL (e.g., `https://trello.com/b/aBcD1234/my-board.json`)
- Find the board ID in the URL or JSON
- Find the list ID in the `"lists"` array

**Method 2 - Using API:**
```bash
curl "https://api.trello.com/1/boards/YOUR_BOARD_ID/lists?key=YOUR_KEY&token=YOUR_TOKEN"
```

### 3. Get Discord Channel ID

1. Enable Developer Mode in Discord (Settings > Advanced > Developer Mode)
2. Right-click the channel you want to monitor
3. Click "Copy ID"

### 4. Install and Configure

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` and add your credentials:**
   ```env
   DISCORD_BOT_TOKEN=your_actual_bot_token
   DISCORD_CHANNEL_ID=your_actual_channel_id
   TRELLO_API_KEY=your_actual_api_key
   TRELLO_TOKEN=your_actual_token
   TRELLO_LIST_ID=your_actual_list_id
   START_DATE=2026-01-21T00:00:00.000Z
   ```

## Usage

### Run the Bot

```bash
npm start
```

### What Happens on First Run

1. Bot connects to Discord
2. Validates Trello credentials
3. Fetches all historical messages from January 21, 2026
4. Creates Trello cards for each link found
5. Starts real-time monitoring for new messages

### Output Example

```
═══════════════════════════════════════════════════
✓ Logged in as BigWinsBot#1234
═══════════════════════════════════════════════════
Validating Trello credentials...
✓ Trello credentials validated
Fetching channel 123456789...
✓ Connected to channel: #big-wins
Loaded 0 processed message IDs
═══════════════════════════════════════════════════
Starting historical message processing...
═══════════════════════════════════════════════════
Fetching historical messages from 2026-01-21T00:00:00.000Z...
Fetched batch 1: 100 messages (total: 100)
Fetched batch 2: 100 messages (total: 200)
✓ Created card for JohnDoe: https://example.com/win1
✓ Created card for JaneSmith: https://github.com/awesome-project
Progress: 50/200 messages processed...
═══════════════════════════════════════════════════
Historical processing complete!
Messages processed: 200
Messages with links: 15
Trello cards created: 18
═══════════════════════════════════════════════════

✓ Now monitoring for new messages in real-time...
  Press Ctrl+C to stop the bot
```

## Running 24/7 (Production)

For continuous operation, use PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot
pm2 start bot.js --name trello-bot

# Save the process list
pm2 save

# Enable startup on system boot
pm2 startup
```

### PM2 Commands

- `pm2 logs trello-bot` - View live logs
- `pm2 restart trello-bot` - Restart the bot
- `pm2 stop trello-bot` - Stop the bot
- `pm2 delete trello-bot` - Remove from PM2

## Project Structure

```
discord-trello-bot/
├── bot.js              # Main bot logic
├── trello.js           # Trello API functions
├── package.json        # Dependencies
├── .env                # Your credentials (DO NOT COMMIT)
├── .env.example        # Template for .env
├── .gitignore          # Ignore node_modules, .env, etc.
├── processed.json      # Tracks processed messages (auto-generated)
├── DISCORD_BOT_PLAN.md # Detailed implementation plan
└── README.md           # This file
```

## Important Notes

### Rate Limits

- **Trello**: 300 requests per 10 seconds
- **Discord**: 50 requests per second
- Bot includes 100ms delays between operations to stay within limits

### Historical Message Limitations

- Discord limits history to ~50,000 messages OR 2 weeks (whichever comes first)
- If your channel is very active, you may not reach January 21, 2026
- The bot will fetch as far back as possible

### Duplicate Prevention

- The bot tracks processed message IDs in `processed.json`
- If the bot restarts, it won't create duplicate cards
- To reprocess all messages, delete `processed.json`

## Troubleshooting

### Bot doesn't connect
- Check `DISCORD_BOT_TOKEN` in `.env`
- Verify bot is invited to server
- Confirm bot has necessary permissions

### Can't read messages
- Enable **MESSAGE CONTENT INTENT** in Discord Developer Portal
- Re-invite bot with "Read Message History" permission

### Trello cards not created
- Verify `TRELLO_API_KEY`, `TRELLO_TOKEN`, and `TRELLO_LIST_ID`
- Test credentials:
  ```bash
  curl "https://api.trello.com/1/lists/YOUR_LIST_ID?key=YOUR_KEY&token=YOUR_TOKEN"
  ```

### Missing historical messages
- Check if January 21 is beyond Discord's history limit
- Bot will show how many messages it could fetch

## Security

- **Never commit `.env`** - It contains sensitive credentials
- Keep your bot token and Trello credentials secure
- Rotate tokens if accidentally exposed
- Use environment variables for all secrets

## License

ISC

## Support

For issues or questions, refer to the detailed [DISCORD_BOT_PLAN.md](DISCORD_BOT_PLAN.md) file.
