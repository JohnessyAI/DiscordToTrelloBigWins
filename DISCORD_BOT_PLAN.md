# Discord to Trello "Big Wins" Bot - Implementation Plan

## Overview
Create a Discord bot that monitors messages for links, then automatically creates Trello cards with:
- **Card Title**: Username of the person who posted
- **Card Description**: The link to their "big win"

The bot will:
1. Process all historical messages from **January 21, 2026** onwards
2. Continue monitoring and creating cards for new messages in real-time

---

## Prerequisites
- Node.js installed (v16.9.0 or higher)
- A Discord account with server access
- A Trello account
- Admin access to a Trello board

---

## Phase 1: Discord Bot Setup

### Step 1.1: Create Discord Application
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it (e.g., "Big Wins Trello Bot")
4. Navigate to the "Bot" tab
5. Click "Add Bot"
6. Under "Privileged Gateway Intents", enable:
   - **MESSAGE CONTENT INTENT** (REQUIRED to read message content)
   - SERVER MEMBERS INTENT (optional)
7. Click "Reset Token" and copy the bot token
8. Save this token securely - you'll need it in `.env`

### Step 1.2: Invite Bot to Server
1. Go to "OAuth2" > "URL Generator"
2. Select scopes:
   - `bot`
3. Select bot permissions:
   - **Read Messages/View Channels**
   - **Read Message History** (required for historical messages)
4. Copy the generated URL
5. Open URL in browser and invite bot to your Discord server

---

## Phase 2: Trello API Setup

### Step 2.1: Get Trello API Key
1. Go to https://trello.com/power-ups/admin
2. Click "New" to create a new Power-Up (or use existing)
3. You'll see your **API Key** - copy it

### Step 2.2: Get Trello Token
1. While on the same page, click the "Token" link (or manually generate)
2. You can also visit this URL (replace YOUR_KEY):
   ```
   https://trello.com/1/authorize?expiration=never&name=BigWinsBot&scope=read,write&response_type=token&key=YOUR_API_KEY
   ```
3. Authorize the application
4. Copy the **Token** that appears

### Step 2.3: Get Board and List IDs
1. Open your Trello board in browser
2. Add `.json` to the end of the URL:
   - Example: `https://trello.com/b/aBcD1234/my-board.json`
3. Find your board ID in the JSON (or from the URL: `aBcD1234`)
4. Find the list ID where you want cards created:
   - Look for the `"lists"` array in the JSON
   - Find the list name (e.g., "Big Wins")
   - Copy its `"id"` value

**Alternative - Get List ID via API:**
```bash
curl "https://api.trello.com/1/boards/YOUR_BOARD_ID/lists?key=YOUR_KEY&token=YOUR_TOKEN"
```

---

## Phase 3: Project Setup

### Step 3.1: Initialize Project
```bash
mkdir discord-trello-bot
cd discord-trello-bot
npm init -y
```

### Step 3.2: Install Dependencies
```bash
npm install discord.js axios dotenv
```

**Dependencies:**
- `discord.js` - Discord API client
- `axios` - HTTP client for Trello API calls
- `dotenv` - Environment variable management

### Step 3.3: Create Project Structure
```
discord-trello-bot/
├── .env                 # Secrets (NEVER commit)
├── .gitignore
├── bot.js               # Main bot code
├── config.js            # Configuration
├── trello.js            # Trello API functions
└── package.json
```

---

## Phase 4: Configuration

### Step 4.1: Create .env File
```env
# Discord
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CHANNEL_ID=your_channel_id_here

# Trello
TRELLO_API_KEY=your_trello_api_key_here
TRELLO_TOKEN=your_trello_token_here
TRELLO_LIST_ID=your_trello_list_id_here

# Bot Settings
START_DATE=2026-01-21T00:00:00.000Z
```

**How to get DISCORD_CHANNEL_ID:**
1. Enable Developer Mode in Discord (Settings > Advanced > Developer Mode)
2. Right-click the channel you want to monitor
3. Click "Copy ID"

### Step 4.2: Create .gitignore
```
node_modules/
.env
*.log
```

---

## Phase 5: Implementation

### Step 5.1: Create trello.js
This file handles all Trello API interactions.

**Functions needed:**
```javascript
// Create a Trello card
async function createTrelloCard(username, linkUrl)

// Parameters:
// - username: Discord username (for card title)
// - linkUrl: The link to add to card description

// API endpoint: POST https://api.trello.com/1/cards
// Required params: idList, name, desc, key, token
```

### Step 5.2: Create bot.js - Main Logic

**The bot must:**

1. **On startup:**
   - Connect to Discord
   - Fetch historical messages from January 21, 2026 onwards
   - Process each message for links
   - Create Trello cards for each link found

2. **Real-time monitoring:**
   - Listen for new messages
   - When a message contains a link:
     - Extract username
     - Extract all URLs
     - Create a Trello card for each URL

3. **URL Extraction:**
   ```javascript
   const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
   ```

4. **Username Format:**
   - Use `message.author.username` or `message.author.tag`
   - Example: "JohnDoe" or "JohnDoe#1234"

5. **Card Format:**
   - **Title:** `username`
   - **Description:** The URL (can add context if needed)
   - **List:** The list ID from `.env`

### Step 5.3: Historical Message Fetching

**Discord Message History Limits:**
- Can fetch up to 100 messages per API call
- Must paginate to get all messages
- Maximum messages retrievable: Last ~50,000 messages or 2 weeks (whichever is less)

**Implementation approach:**
```javascript
async function fetchHistoricalMessages(channel, afterDate) {
  let allMessages = [];
  let lastMessageId = null;

  while (true) {
    const options = { limit: 100 };
    if (lastMessageId) {
      options.before = lastMessageId;
    }

    const messages = await channel.messages.fetch(options);
    if (messages.size === 0) break;

    for (const message of messages.values()) {
      // Stop if we've gone past the start date
      if (message.createdAt < afterDate) {
        return allMessages;
      }
      allMessages.push(message);
    }

    lastMessageId = messages.last().id;
  }

  return allMessages;
}
```

**After fetching historical messages:**
- Process each message for URLs
- Create Trello cards for each URL found
- Log progress to console

---

## Phase 6: Advanced Features

### Feature 1: Duplicate Prevention
- Track processed message IDs in a file (`processed.json`)
- Before creating a Trello card, check if message was already processed
- Prevents duplicate cards if bot restarts

### Feature 2: Error Handling
- Handle Trello API rate limits (300 requests per 10 seconds)
- Retry failed card creations
- Log errors to file

### Feature 3: Multiple Links Per Message
- If a message contains multiple links, decide:
  - **Option A:** Create one card per link
  - **Option B:** Create one card with all links in description

### Feature 4: Progress Tracking
- Show progress bar when processing historical messages
- Log: "Processing message 150/500..."
- Summary at end: "Created 42 Trello cards from historical messages"

### Feature 5: Bot Commands (Optional)
- `!stats` - Show how many cards created
- `!sync` - Re-sync from January 21st (with confirmation)
- `!test` - Create a test Trello card

---

## Phase 7: Running the Bot

### Step 7.1: First Run
```bash
node bot.js
```

**What will happen:**
1. Bot connects to Discord
2. Fetches all messages from January 21, 2026 onwards
3. Creates Trello cards for each link found
4. Starts monitoring for new messages

### Step 7.2: Keep Bot Running (Production)
Use PM2 to keep bot running 24/7:
```bash
npm install -g pm2
pm2 start bot.js --name trello-bot
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

**PM2 Commands:**
- `pm2 logs trello-bot` - View logs
- `pm2 restart trello-bot` - Restart bot
- `pm2 stop trello-bot` - Stop bot
- `pm2 delete trello-bot` - Remove from PM2

---

## Example Code Structure

### bot.js (Simplified)
```javascript
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { createTrelloCard } = require('./trello');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
const START_DATE = new Date(process.env.START_DATE);

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Fetch the channel
  const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

  // Process historical messages
  console.log('Fetching historical messages from Jan 21, 2026...');
  await processHistoricalMessages(channel);

  console.log('Now monitoring for new messages...');
});

// Handle new messages in real-time
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channelId !== process.env.DISCORD_CHANNEL_ID) return;

  await processMessage(message);
});

async function processMessage(message) {
  const urls = message.content.match(URL_REGEX);

  if (urls && urls.length > 0) {
    const username = message.author.username;

    for (const url of urls) {
      try {
        await createTrelloCard(username, url);
        console.log(`Created card for ${username}: ${url}`);
      } catch (error) {
        console.error(`Failed to create card: ${error.message}`);
      }
    }
  }
}

async function processHistoricalMessages(channel) {
  // Implementation here...
}

client.login(process.env.DISCORD_BOT_TOKEN);
```

### trello.js (Simplified)
```javascript
const axios = require('axios');

async function createTrelloCard(username, linkUrl) {
  const url = 'https://api.trello.com/1/cards';

  const params = {
    key: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_TOKEN,
    idList: process.env.TRELLO_LIST_ID,
    name: username,
    desc: linkUrl,
  };

  const response = await axios.post(url, null, { params });
  return response.data;
}

module.exports = { createTrelloCard };
```

---

## Testing Checklist

- [ ] Bot connects to Discord successfully
- [ ] Bot can access the specified channel
- [ ] Historical messages from Jan 21, 2026 are fetched
- [ ] Links are correctly extracted from messages
- [ ] Trello cards are created with correct format:
  - [ ] Title = username
  - [ ] Description = link URL
  - [ ] Card appears in correct Trello list
- [ ] Multiple links in one message are handled
- [ ] New messages trigger card creation in real-time
- [ ] Bot ignores messages without links
- [ ] Bot ignores messages from other bots
- [ ] Errors are logged and don't crash the bot

---

## Troubleshooting

### Bot doesn't connect
- Check `DISCORD_BOT_TOKEN` in `.env`
- Verify bot is invited to server
- Check bot has correct permissions

### Can't read messages
- Enable **MESSAGE CONTENT INTENT** in Discord Developer Portal
- Re-invite bot with "Read Message History" permission

### Trello cards not created
- Verify `TRELLO_API_KEY` and `TRELLO_TOKEN` are correct
- Check `TRELLO_LIST_ID` is valid
- Test Trello API manually:
  ```bash
  curl "https://api.trello.com/1/lists/YOUR_LIST_ID?key=YOUR_KEY&token=YOUR_TOKEN"
  ```

### Can't fetch historical messages
- Bot needs "Read Message History" permission
- Discord limits history to ~50k messages or 2 weeks
- If Jan 21 is too far back, you may not get all messages

### Rate limiting
- Trello: 300 requests per 10 seconds
- Discord: 50 requests per second
- Add delays between API calls if hitting limits

---

## Important Considerations

### 1. Historical Message Limits
- **Discord's limit:** You can only fetch messages from the last 2 weeks OR the last ~50,000 messages (whichever comes first)
- **For January 21, 2026:** Since today is March 1, 2026, that's ~38 days ago
- **If the channel is very active**, you may not be able to fetch back to Jan 21
- **Solution:** If you can't fetch all history, start from as far back as possible

### 2. Rate Limits
- **Trello:** 300 requests per 10 seconds, 100 per 10 seconds per token
- **Discord:** 50 requests per second per bot
- Add small delays (100-200ms) between card creations to avoid hitting limits

### 3. Duplicate Cards
- Without duplicate prevention, re-running the bot will create duplicate cards
- Implement `processed.json` to track processed message IDs
- Or add Trello card checking (search for existing cards with same name/desc)

### 4. Data Privacy
- Bot can read all messages in the channel
- Be transparent with server members about what the bot does
- Consider adding a privacy notice

---

## Success Criteria

The implementation is complete when:
1. ✅ Bot connects to Discord and Trello
2. ✅ Bot processes all messages from January 21, 2026 onwards
3. ✅ Bot creates Trello cards with format: Title=username, Description=link
4. ✅ Bot monitors new messages and creates cards in real-time
5. ✅ Bot handles errors gracefully without crashing
6. ✅ No duplicate cards are created on restart

---

## Workflow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    Discord Message Posted                    │
│                  "Check out my win! https://..."             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │   Bot Detects Link    │
          │  Extracts: Username   │
          │  Extracts: URL        │
          └──────────┬────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  Create Trello Card   │
          │  Title: "JohnDoe"     │
          │  Desc: "https://..."  │
          └──────────┬────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │   Card Appears in     │
          │    Trello Board       │
          └───────────────────────┘
```

---

## Estimated Time
- **Phase 1-2:** 45 minutes (Discord + Trello setup)
- **Phase 3-4:** 20 minutes (Project setup + config)
- **Phase 5:** 2-3 hours (Core implementation)
- **Phase 6:** 1-2 hours (Advanced features, optional)
- **Testing:** 30 minutes

**Total: 3-5 hours for fully working bot with duplicate prevention**

---

## Next Steps After Implementation

1. **Monitor for a few days** - Ensure cards are being created correctly
2. **Add notification** - Log to Discord when a card is created (optional)
3. **Add labels** - Categorize Trello cards by type of win
4. **Add due dates** - Auto-set due dates based on message timestamp
5. **Deploy to cloud** - Run on Heroku, Railway, or DigitalOcean for 24/7 uptime
