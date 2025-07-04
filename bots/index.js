require('dotenv').config();
const { spawn } = require('child_process');

console.log('Starting Quickvoicy Bots...');

// Start Telegram bot
const telegramBot = spawn('node', ['telegram-bot.js'], {
    stdio: 'inherit',
    shell: true
});

// Start Discord bot
const discordBot = spawn('node', ['discord-bot.js'], {
    stdio: 'inherit',
    shell: true
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nShutting down bots...');
    telegramBot.kill();
    discordBot.kill();
    process.exit();
});
