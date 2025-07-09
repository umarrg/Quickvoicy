import 'dotenv/config';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('Starting Quickvoicy Bots...');

const telegramBot = spawn('node', [join(__dirname, 'telegram-bot.js')], {
    stdio: 'inherit',
    shell: true
});

const discordBot = spawn('node', [join(__dirname, 'discord-bot.js')], {
    stdio: 'inherit',
    shell: true
});

process.on('SIGINT', () => {
    console.log('\nShutting down bots...');
    telegramBot.kill();
    discordBot.kill();
    process.exit();
});