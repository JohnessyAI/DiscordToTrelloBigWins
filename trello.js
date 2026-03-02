const axios = require('axios');

/**
 * Create a Trello card with formatted title and link as description
 * @param {string} cardTitle - Card title (e.g., "Username : Date")
 * @param {string} linkUrl - URL to add to the card description
 * @returns {Promise<Object>} - Created Trello card object
 */
async function createTrelloCard(cardTitle, linkUrl) {
  const url = 'https://api.trello.com/1/cards';

  const params = {
    key: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_TOKEN,
    idList: process.env.TRELLO_LIST_ID,
    name: cardTitle,
    desc: linkUrl,
  };

  try {
    const response = await axios.post(url, null, { params });
    return response.data;
  } catch (error) {
    throw new Error(`Trello API Error: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Check if Trello credentials are valid by attempting to fetch the list
 * @returns {Promise<boolean>} - True if credentials are valid
 */
async function validateTrelloCredentials() {
  const url = `https://api.trello.com/1/lists/${process.env.TRELLO_LIST_ID}`;

  const params = {
    key: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_TOKEN,
  };

  try {
    await axios.get(url, { params });
    return true;
  } catch (error) {
    console.error('Trello credentials validation failed:', error.response?.data?.message || error.message);
    return false;
  }
}

module.exports = {
  createTrelloCard,
  validateTrelloCredentials,
};
