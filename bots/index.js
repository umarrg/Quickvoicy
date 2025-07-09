import express from 'express';
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
const app = express();
const PORT = process.env.PORT || 9000;

app.get('/', (req, res) => {
    res.send('Quickvoicy Bots are running.');
});

app.listen(PORT, () => {
    console.log(`✅ Express server is running at http://localhost:${PORT}`);
});
process.on('SIGINT', () => {
    console.log('\nShutting down bots...');
    telegramBot.kill();
    discordBot.kill();
    process.exit();
});