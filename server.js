require('dotenv').config();
const express = require('express');
const { startBot } = require('./bot');
const { comments } = require('./log');

const app = express();
const port = 3000;

function checkBotStatus(req, res, next) {
  const bot = require('./bot'); // Import the bot module here
  if (bot.isRunning()) { // Call `isRunning` as a function
    res.locals.message = 'Bot is running';
  } else {
    res.locals.message = 'Bot is stopped';
  }
  next();
}

app.use(checkBotStatus);

app.get('/', (req, res) => {
  res.send(res.locals.message);
});

app.get('/comments', (req, res) => {
  res.json(comments);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Internal Server Error on bot end');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

startBot();
