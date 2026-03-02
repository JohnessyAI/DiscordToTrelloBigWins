require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { createTrelloCard, validateTrelloCredentials } = require('./trello');
const fs = require('fs');
const path = require('path');

// Configuration
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
const START_DATE = new Date(process.env.START_DATE || '2026-01-21T00:00:00.000Z');
const PROCESSED_FILE = path.join(__dirname, 'processed.json');
const PROCESSED_URLS_FILE = path.join(__dirname, 'processed-urls.json');

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Load processed message IDs and URLs (for duplicate prevention)
let processedMessages = new Set();
let processedUrls = new Set();

function loadProcessedMessages() {
  try {
    if (fs.existsSync(PROCESSED_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8'));
      processedMessages = new Set(data);
      console.log(`Loaded ${processedMessages.size} processed message IDs`);
    }
  } catch (error) {
    console.error('Error loading processed messages:', error.message);
  }
}

function saveProcessedMessages() {
  try {
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify([...processedMessages], null, 2));
  } catch (error) {
    console.error('Error saving processed messages:', error.message);
  }
}

function addProcessedMessage(messageId) {
  processedMessages.add(messageId);
  saveProcessedMessages();
}

function loadProcessedUrls() {
  try {
    if (fs.existsSync(PROCESSED_URLS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROCESSED_URLS_FILE, 'utf8'));
      // Normalize all URLs when loading to handle legacy non-normalized URLs
      const normalizedUrls = data.map(url => normalizeUrl(url));
      processedUrls = new Set(normalizedUrls);
      console.log(`Loaded ${processedUrls.size} processed URLs`);
    }
  } catch (error) {
    console.error('Error loading processed URLs:', error.message);
  }
}

function saveProcessedUrls() {
  try {
    fs.writeFileSync(PROCESSED_URLS_FILE, JSON.stringify([...processedUrls], null, 2));
  } catch (error) {
    console.error('Error saving processed URLs:', error.message);
  }
}

function addProcessedUrl(url) {
  processedUrls.add(url);
  saveProcessedUrls();
}

/**
 * Normalize URL to prevent duplicates
 * Examples: "https://example.com/" -> "https://example.com"
 */
function normalizeUrl(url) {
  try {
    let normalized = url.toLowerCase().trim();

    // Remove trailing slash
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    // Remove common tracking parameters
    normalized = normalized.split('?')[0].split('#')[0];

    return normalized;
  } catch (error) {
    return url.toLowerCase().trim();
  }
}

/**
 * Convert username to Camel Case
 * Examples: "ceaser1270" -> "Ceaser1270", "mike.hael" -> "Mike.Hael"
 */
function toCamelCase(username) {
  return username
    .split(/([._-])/) // Split by dots, underscores, or hyphens but keep them
    .map((part, index) => {
      // Keep separators as-is
      if (part === '.' || part === '_' || part === '-') {
        return part;
      }
      // Capitalize first letter of each word
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Format date as "Feb 27, 2026"
 */
function formatDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

/**
 * Process a single message - extract URLs and create Trello cards
 */
async function processMessage(message) {
  // Skip if already processed
  if (processedMessages.has(message.id)) {
    return 0;
  }

  // Skip bot messages
  if (message.author.bot) {
    return 0;
  }

  // Extract URLs from message content
  const urls = message.content.match(URL_REGEX);

  if (!urls || urls.length === 0) {
    return 0;
  }

  // Filter out Tenor links
  const filteredUrls = urls.filter(url => !url.includes('tenor.com'));

  if (filteredUrls.length === 0) {
    return 0;
  }

  // Use display name (e.g., "Jamie") instead of username (e.g., "ceaser1270")
  const displayName = message.member?.displayName || message.author.displayName || message.author.username;
  const formattedDisplayName = toCamelCase(displayName);
  const messageDate = formatDate(message.createdAt);
  const cardTitle = `${formattedDisplayName} : ${messageDate}`;

  let cardsCreated = 0;

  // Create a Trello card for each URL found
  for (const url of filteredUrls) {
    // Normalize URL to prevent duplicates (e.g., "site.com" vs "site.com/")
    const normalizedUrl = normalizeUrl(url);

    // Skip if this URL has already been processed
    if (processedUrls.has(normalizedUrl)) {
      console.log(`⊘ Skipped duplicate URL: ${url}`);
      continue;
    }

    try {
      await createTrelloCard(cardTitle, url);
      console.log(`✓ Created card for ${formattedDisplayName}: ${url}`);
      addProcessedUrl(normalizedUrl);
      cardsCreated++;

      // Small delay to avoid rate limits (100ms between cards)
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`✗ Failed to create card for ${formattedDisplayName} (${url}): ${error.message}`);
    }
  }

  // Mark message as processed
  addProcessedMessage(message.id);

  return cardsCreated;
}

/**
 * Fetch all historical messages from a channel starting from a specific date
 */
async function fetchHistoricalMessages(channel, afterDate) {
  console.log(`Fetching historical messages from ${afterDate.toISOString()}...`);

  let allMessages = [];
  let lastMessageId = null;
  let fetchCount = 0;

  while (true) {
    const options = { limit: 100 };
    if (lastMessageId) {
      options.before = lastMessageId;
    }

    try {
      const messages = await channel.messages.fetch(options);
      fetchCount++;

      if (messages.size === 0) {
        console.log('No more messages to fetch');
        break;
      }

      let reachedStartDate = false;

      for (const message of messages.values()) {
        // Stop if we've gone past the start date
        if (message.createdAt < afterDate) {
          reachedStartDate = true;
          break;
        }
        allMessages.push(message);
      }

      console.log(`Fetched batch ${fetchCount}: ${messages.size} messages (total: ${allMessages.length})`);

      if (reachedStartDate) {
        console.log('Reached start date');
        break;
      }

      lastMessageId = messages.last().id;

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching messages: ${error.message}`);
      break;
    }
  }

  // Sort messages chronologically (oldest first)
  allMessages.sort((a, b) => a.createdAt - b.createdAt);

  console.log(`Total historical messages retrieved: ${allMessages.length}`);
  return allMessages;
}

/**
 * Process all historical messages
 */
async function processHistoricalMessages(channel) {
  console.log('═══════════════════════════════════════════════════');
  console.log('Starting historical message processing...');
  console.log('═══════════════════════════════════════════════════');

  const messages = await fetchHistoricalMessages(channel, START_DATE);

  if (messages.length === 0) {
    console.log('No historical messages to process');
    return;
  }

  let totalCardsCreated = 0;
  let messagesWithLinks = 0;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const cardsCreated = await processMessage(message);

    if (cardsCreated > 0) {
      messagesWithLinks++;
      totalCardsCreated += cardsCreated;
    }

    // Progress indicator every 50 messages
    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${messages.length} messages processed...`);
    }
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('Historical processing complete!');
  console.log(`Messages processed: ${messages.length}`);
  console.log(`Messages with links: ${messagesWithLinks}`);
  console.log(`Trello cards created: ${totalCardsCreated}`);
  console.log('═══════════════════════════════════════════════════');
}

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const required = [
    'DISCORD_BOT_TOKEN',
    'DISCORD_CHANNEL_ID',
    'TRELLO_API_KEY',
    'TRELLO_TOKEN',
    'TRELLO_LIST_ID',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    process.exit(1);
  }
}

// Bot ready event
client.on('ready', async () => {
  console.log('═══════════════════════════════════════════════════');
  console.log(`✓ Logged in as ${client.user.tag}`);
  console.log('═══════════════════════════════════════════════════');

  try {
    // Validate Trello credentials
    console.log('Validating Trello credentials...');
    const isValid = await validateTrelloCredentials();
    if (!isValid) {
      console.error('✗ Trello credentials are invalid. Please check your .env file');
      process.exit(1);
    }
    console.log('✓ Trello credentials validated');

    // Fetch the channel
    console.log(`Fetching channel ${process.env.DISCORD_CHANNEL_ID}...`);
    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    console.log(`✓ Connected to channel: #${channel.name}`);

    // Load processed messages and URLs
    loadProcessedMessages();
    loadProcessedUrls();

    // Process historical messages
    await processHistoricalMessages(channel);

    console.log('');
    console.log('✓ Now monitoring for new messages in real-time...');
    console.log('  Press Ctrl+C to stop the bot');
    console.log('═══════════════════════════════════════════════════');
  } catch (error) {
    console.error('Error during initialization:', error.message);
    process.exit(1);
  }
});

// Handle new messages in real-time
client.on('messageCreate', async (message) => {
  // Only process messages from the monitored channel
  if (message.channelId !== process.env.DISCORD_CHANNEL_ID) {
    return;
  }

  const cardsCreated = await processMessage(message);

  if (cardsCreated > 0) {
    console.log(`[REAL-TIME] Created ${cardsCreated} card(s) for new message from ${message.author.username}`);
  }
});

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down bot...');
  saveProcessedMessages();
  client.destroy();
  process.exit(0);
});

// Start the bot
validateEnvironment();
console.log('Starting Discord bot...');
client.login(process.env.DISCORD_BOT_TOKEN);
