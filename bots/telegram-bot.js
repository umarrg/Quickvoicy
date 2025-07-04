require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const NWCService = require('./nwc-service');
const PDFService = require('./pdf-service');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Command handlers
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    // Get or create user
    let user = await db.getUser('telegram', userId);
    if (!user) {
        const id = await db.createUser('telegram', userId);
        user = { id, platform: 'telegram', platform_id: userId };
    }

    const welcomeMessage = `
⚡ Welcome to Quickvoicy Bot!

Create professional invoices with instant Lightning payments.

Commands:
/new <amount> "<description>" - Create new invoice
/connect <nwc_url> - Connect your Lightning wallet
/invoices - View your recent invoices
/stats - View your earnings statistics
/help - Show help message

Example:
/new 1000 "Logo design for startup"

First, connect your wallet using /connect command.
  `;

    bot.sendMessage(chatId, welcomeMessage);
});

bot.onText(/\/connect (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const nwcUrl = match[1];

    try {
        // Validate NWC URL
        const nwc = new NWCService(nwcUrl);
        await nwc.connect();
        await nwc.disconnect();

        // Get user and update NWC URL
        const user = await db.getUser('telegram', userId);
        await db.updateUserNWC(user.id, nwcUrl);

        bot.sendMessage(chatId, '✅ Wallet connected successfully! You can now create invoices.');
    } catch (error) {
        bot.sendMessage(chatId, '❌ Invalid NWC URL. Please check and try again.');
    }
});

bot.onText(/\/new (\d+) "(.+)"/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const amount = parseInt(match[1]);
    const description = match[2];

    try {
        // Get user
        const user = await db.getUser('telegram', userId);
        if (!user || !user.nwc_url) {
            bot.sendMessage(chatId, '❌ Please connect your wallet first using /connect command.');
            return;
        }

        // Ask for client details
        bot.sendMessage(chatId, 'Please provide client name:');

        bot.once('message', async (nameMsg) => {
            const clientName = nameMsg.text;

            bot.sendMessage(chatId, 'Please provide client email:');

            bot.once('message', async (emailMsg) => {
                const clientEmail = emailMsg.text;

                // Create invoice
                const nwc = new NWCService(user.nwc_url);
                await nwc.connect();

                const lightningInvoice = await nwc.createInvoice(amount, description);
                const paymentHash = lightningInvoice.split(':')[1]?.substring(0, 64);

                const invoice = {
                    id: uuidv4(),
                    userId: user.id,
                    amount,
                    description,
                    clientName,
                    clientEmail,
                    lightningInvoice,
                    paymentHash
                };

                await db.createInvoice(invoice);
                await nwc.disconnect();

                // Generate and send invoice details
                const message = `
✅ Invoice Created!

Invoice ID: ${invoice.id}
Amount: ${amount} sats
Description: ${description}
Client: ${clientName}

Lightning Invoice:
\`${lightningInvoice}\`

Generating PDF...
        `;

                bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

                // Generate and send PDF
                const pdfPath = await PDFService.generateInvoicePDF({
                    ...invoice,
                    created_at: new Date().toISOString(),
                    status: 'pending'
                });

                bot.sendDocument(chatId, pdfPath, {
                    caption: 'Invoice PDF - Share with your client'
                });

                // Cleanup
                PDFService.cleanup(pdfPath);
            });
        });
    } catch (error) {
        bot.sendMessage(chatId, '❌ Failed to create invoice. Please try again.');
    }
});

bot.onText(/\/invoices/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    try {
        const user = await db.getUser('telegram', userId);
        if (!user) {
            bot.sendMessage(chatId, '❌ Please start the bot first with /start');
            return;
        }

        const invoices = await db.getUserInvoices(user.id);

        if (invoices.length === 0) {
            bot.sendMessage(chatId, 'No invoices found. Create your first invoice with /new command.');
            return;
        }

        let message = '📋 Your Recent Invoices:\n\n';
        invoices.forEach(invoice => {
            const status = invoice.status === 'paid' ? '✅' : '⏳';
            message += `${status} #${invoice.id.substring(0, 8)}\n`;
            message += `   ${invoice.amount} sats - ${invoice.description}\n`;
            message += `   ${new Date(invoice.created_at).toLocaleDateString()}\n\n`;
        });

        bot.sendMessage(chatId, message);
    } catch (error) {
        bot.sendMessage(chatId, '❌ Failed to fetch invoices.');
    }
});

bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    try {
        const user = await db.getUser('telegram', userId);
        if (!user) {
            bot.sendMessage(chatId, '❌ Please start the bot first with /start');
            return;
        }

        const stats = await db.getUserStats(user.id);

        const message = `
📊 Your Statistics:

Total Invoices: ${stats.total_invoices}
Paid Invoices: ${stats.paid_invoices}
Total Earned: ${stats.total_earned || 0} sats

Payment Rate: ${stats.total_invoices > 0 ? Math.round((stats.paid_invoices / stats.total_invoices) * 100) : 0}%
    `;

        bot.sendMessage(chatId, message);
    } catch (error) {
        bot.sendMessage(chatId, '❌ Failed to fetch statistics.');
    }
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
⚡ Quickvoicy Bot Help

Commands:
/new <amount> "<description>" - Create new invoice
/connect <nwc_url> - Connect your Lightning wallet
/invoices - View your recent invoices
/stats - View your earnings statistics
/help - Show this help message

Example:
/new 1000 "Logo design for startup"

To get started:
1. Get NWC URL from your Lightning wallet (Alby, Zeus, etc.)
2. Connect wallet: /connect nostr+walletconnect://...
3. Create invoice: /new 5000 "Website development"

Need help? Contact @yourusername
  `;

    bot.sendMessage(chatId, helpMessage);
});

console.log('Telegram bot is running...');