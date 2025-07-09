import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';
import NWCService from './nwc-service.js';
import PDFService, { sendInvoiceWithPDF } from './pdf-service.js';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Enhanced inline keyboards
const mainMenuKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '⚡ Create Invoice', callback_data: 'create_invoice' },
                { text: '📋 My Invoices', callback_data: 'view_invoices' }
            ],
            [
                { text: '💰 Statistics', callback_data: 'view_stats' },
                { text: '🔗 Connect Wallet', callback_data: 'connect_wallet' }
            ],
            [
                { text: '❓ Help', callback_data: 'help' },
                { text: '⚙️ Settings', callback_data: 'settings' }
            ]
        ]
    }
};

const backToMenuKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '🏠 Back to Menu', callback_data: 'main_menu' }]
        ]
    }
};

const invoiceActionsKeyboard = (invoiceId) => ({
    reply_markup: {
        inline_keyboard: [
            [
                { text: '📄 View PDF', callback_data: `view_pdf_${invoiceId}` },
                { text: '🔄 Check Status', callback_data: `check_status_${invoiceId}` }
            ],
            [
                { text: '📤 Share Invoice', callback_data: `share_${invoiceId}` },
                { text: '🗑️ Delete', callback_data: `delete_${invoiceId}` }
            ],
            [{ text: '🏠 Back to Menu', callback_data: 'main_menu' }]
        ]
    }
});

// User session storage for multi-step processes
const userSessions = new Map();

// Enhanced start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const firstName = msg.from.first_name || 'User';

    try {
        // Get or create user
        let user = await db.getUser('telegram', userId);
        if (!user) {
            const id = await db.createUser('telegram', userId);
            user = { id, platform: 'telegram', platform_id: userId };
        }

        const welcomeMessage = `
🎉 <b>Welcome to Quickvoicy, ${firstName}!</b>

⚡ <i>Professional Lightning invoices in seconds</i>

🚀 <b>What you can do:</b>
• Create professional invoices instantly
• Accept Lightning payments
• Track your earnings
• Generate beautiful PDFs
• Manage your clients

${user.nwc_url ? '✅ Your wallet is connected' : '⚠️ Connect your wallet to get started'}

Choose an option below to continue:
        `;

        await bot.sendMessage(chatId, welcomeMessage, {
            parse_mode: 'HTML',
            ...mainMenuKeyboard
        });
    } catch (error) {
        await bot.sendMessage(chatId, '❌ Something went wrong. Please try again.');
    }
});

// Callback query handler for inline buttons
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id.toString();
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;

    try {
        await bot.answerCallbackQuery(callbackQuery.id);

        switch (data) {
            case 'main_menu':
                await showMainMenu(chatId, messageId, userId);
                break;
            case 'create_invoice':
                await startInvoiceCreation(chatId, messageId, userId);
                break;
            case 'view_invoices':
                await showInvoices(chatId, messageId, userId);
                break;
            case 'view_stats':
                await showStats(chatId, messageId, userId);
                break;
            case 'connect_wallet':
                await showWalletConnection(chatId, messageId, userId);
                break;
            case 'help':
                await showHelp(chatId, messageId);
                break;
            case 'settings':
                await showSettings(chatId, messageId, userId);
                break;
            case 'skip_email':
                await handleSkipEmail(chatId, userId);
                break;
            case 'add_custom_fields':
                await handleAddCustomFields(chatId, userId);
                break;
            case 'skip_custom_fields':
                await handleSkipCustomFields(chatId, userId);
                break;
            case 'template_webdev':
                await handleTemplate(chatId, messageId, userId, 10000, 'Website development project');
                break;
            case 'template_design':
                await handleTemplate(chatId, messageId, userId, 5000, 'Design services');
                break;
            case 'template_consulting':
                await handleTemplate(chatId, messageId, userId, 2000, 'Consulting services');
                break;
            case 'template_custom':
                await handleCustomTemplate(chatId, messageId, userId);
                break;
            default:
                if (data.startsWith('view_pdf_')) {
                    const invoiceId = data.replace('view_pdf_', '');
                    await handleViewPDF(chatId, userId, invoiceId);
                } else if (data.startsWith('check_status_')) {
                    const invoiceId = data.replace('check_status_', '');
                    await handleCheckStatus(chatId, userId, invoiceId);
                } else if (data.startsWith('share_')) {
                    const invoiceId = data.replace('share_', '');
                    await handleShareInvoice(chatId, userId, invoiceId);
                } else if (data.startsWith('delete_')) {
                    const invoiceId = data.replace('delete_', '');
                    await handleDeleteInvoice(chatId, userId, invoiceId);
                } else if (data.startsWith('invoice_details_')) {
                    const invoiceId = data.replace('invoice_details_', '');
                    await showInvoiceDetails(chatId, messageId, userId, invoiceId);
                } else if (data.startsWith('confirm_delete_')) {
                    const invoiceId = data.replace('confirm_delete_', '');
                    await handleConfirmDelete(chatId, userId, invoiceId);
                } else if (data.startsWith('receipt_')) {
                    const invoiceId = data.replace('receipt_', '');
                    await handleGenerateReceipt(chatId, userId, invoiceId);
                }
                break;
        }
    } catch (error) {
        console.error('Callback query error:', error);
        await bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
});

async function showMainMenu(chatId, messageId, userId) {
    const user = await db.getUser('telegram', userId);
    const stats = user ? await db.getUserStats(user.id) : null;

    const menuMessage = `
🏠 <b>Main Menu</b>

📊 <b>Quick Stats:</b>
${stats ? `
• Total Invoices: ${stats.total_invoices}
• Earnings: ${stats.total_earned || 0} sats
• Success Rate: ${stats.total_invoices > 0 ? Math.round((stats.paid_invoices / stats.total_invoices) * 100) : 0}%
` : '• No data yet - create your first invoice!'}

${user?.nwc_url ? '✅ Wallet Connected' : '⚠️ Wallet Not Connected'}

Choose an action below:
    `;

    await bot.editMessageText(menuMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        ...mainMenuKeyboard
    });
}

async function startInvoiceCreation(chatId, messageId, userId) {
    const user = await db.getUser('telegram', userId);

    if (!user || !user.nwc_url) {
        await bot.editMessageText(
            '⚠️ <b>Wallet Required</b>\n\nPlease connect your Lightning wallet first to create invoices.',
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔗 Connect Wallet', callback_data: 'connect_wallet' }],
                        [{ text: '🏠 Back to Menu', callback_data: 'main_menu' }]
                    ]
                }
            }
        );
        return;
    }

    const createMessage = `
⚡ <b>Create New Invoice</b>

📝 Send me the invoice details in this format:

<code>/new [amount] "[description]"</code>

<b>Example:</b>
<code>/new 5000 "Website development project"</code>

💡 <b>Tips:</b>
• Amount should be in satoshis
• Use quotes around the description
• Be specific about your service

Or use the quick templates below:
    `;

    const quickTemplates = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '💻 Web Dev (10k sats)', callback_data: 'template_webdev' },
                    { text: '🎨 Design (5k sats)', callback_data: 'template_design' }
                ],
                [
                    { text: '📝 Consulting (2k sats)', callback_data: 'template_consulting' },
                    { text: '🔧 Custom Amount', callback_data: 'template_custom' }
                ],
                [{ text: '🏠 Back to Menu', callback_data: 'main_menu' }]
            ]
        }
    };

    await bot.editMessageText(createMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        ...quickTemplates
    });
}

async function showInvoices(chatId, messageId, userId) {
    const user = await db.getUser('telegram', userId);

    if (!user) {
        await bot.editMessageText(
            '❌ User not found. Please start the bot with /start',
            {
                chat_id: chatId,
                message_id: messageId,
                ...backToMenuKeyboard
            }
        );
        return;
    }

    const invoices = await db.getUserInvoices(user.id);

    if (invoices.length === 0) {
        await bot.editMessageText(
            '📋 <b>No Invoices Yet</b>\n\n💡 Create your first invoice to get started!',
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '⚡ Create Invoice', callback_data: 'create_invoice' }],
                        [{ text: '🏠 Back to Menu', callback_data: 'main_menu' }]
                    ]
                }
            }
        );
        return;
    }

    let message = '📋 <b>Your Recent Invoices</b>\n\n';
    const invoiceButtons = [];

    invoices.slice(0, 5).forEach((invoice, index) => {
        const status = invoice.status === 'paid' ? '✅ Paid' : '⏳ Pending';
        const date = new Date(invoice.created_at).toLocaleDateString();

        message += `<b>#${invoice.id.substring(0, 8)}</b>\n`;
        message += `💰 ${invoice.amount} sats - ${invoice.description}\n`;
        message += `${status} • ${date}\n\n`;

        if (index < 3) { // Show buttons for first 3 invoices
            invoiceButtons.push([{
                text: `📄 #${invoice.id.substring(0, 8)} - ${invoice.status === 'paid' ? '✅' : '⏳'}`,
                callback_data: `invoice_details_${invoice.id}`
            }]);
        }
    });

    if (invoices.length > 5) {
        message += `\n📊 Showing 5 of ${invoices.length} invoices`;
    }

    invoiceButtons.push([{ text: '🏠 Back to Menu', callback_data: 'main_menu' }]);

    await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: invoiceButtons }
    });
}

async function showStats(chatId, messageId, userId) {
    const user = await db.getUser('telegram', userId);

    if (!user) {
        await bot.editMessageText(
            '❌ User not found. Please start the bot with /start',
            {
                chat_id: chatId,
                message_id: messageId,
                ...backToMenuKeyboard
            }
        );
        return;
    }

    const stats = await db.getUserStats(user.id);
    const successRate = stats.total_invoices > 0 ?
        Math.round((stats.paid_invoices / stats.total_invoices) * 100) : 0;

    const statsMessage = `
📊 <b>Your Statistics</b>

💼 <b>Invoice Summary:</b>
• Total Invoices: <code>${stats.total_invoices}</code>
• Paid Invoices: <code>${stats.paid_invoices}</code>
• Pending: <code>${stats.total_invoices - stats.paid_invoices}</code>

💰 <b>Earnings:</b>
• Total Earned: <code>${stats.total_earned || 0} sats</code>
• Success Rate: <code>${successRate}%</code>

📈 <b>Performance:</b>
${successRate >= 80 ? '🔥 Excellent!' :
            successRate >= 60 ? '👍 Good' :
                successRate >= 40 ? '📈 Growing' : '🌱 Getting Started'}

${stats.total_invoices === 0 ? '\n💡 Create your first invoice to start tracking!' : ''}
    `;

    await bot.editMessageText(statsMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '📋 View Invoices', callback_data: 'view_invoices' }],
                [{ text: '🏠 Back to Menu', callback_data: 'main_menu' }]
            ]
        }
    });
}

async function showWalletConnection(chatId, messageId, userId) {
    const user = await db.getUser('telegram', userId);
    const isConnected = user && user.nwc_url;

    const walletMessage = `
🔗 <b>Lightning Wallet Connection</b>

${isConnected ? '✅ <b>Wallet Connected</b>' : '⚠️ <b>No Wallet Connected</b>'}

${isConnected ?
            `Your Lightning wallet is connected and ready to receive payments!

🔧 <b>Wallet Actions:</b>` :
            `To create invoices, you need to connect a Lightning wallet that supports NWC (Nostr Wallet Connect).

🔗 <b>Supported Wallets:</b>
• Alby
• Zeus
• Mutiny
• Cashu

📝 <b>How to connect:</b>
1. Get your NWC URL from your wallet
2. Send: <code>/connect your_nwc_url_here</code>`}

💡 <b>Need help?</b> Check our guide for step-by-step instructions.
    `;

    const walletKeyboard = {
        reply_markup: {
            inline_keyboard: isConnected ? [
                [{ text: '🔄 Test Connection', callback_data: 'test_wallet' }],
                [{ text: '🔌 Disconnect', callback_data: 'disconnect_wallet' }],
                [{ text: '🏠 Back to Menu', callback_data: 'main_menu' }]
            ] : [
                [{ text: '📖 Connection Guide', callback_data: 'wallet_guide' }],
                [{ text: '🏠 Back to Menu', callback_data: 'main_menu' }]
            ]
        }
    };

    await bot.editMessageText(walletMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        ...walletKeyboard
    });
}

async function showHelp(chatId, messageId) {
    const helpMessage = `
❓ <b>Quickvoicy Help</b>

🚀 <b>Quick Start:</b>
1. Connect your Lightning wallet
2. Create your first invoice
3. Share with your client
4. Get paid instantly!

📝 <b>Commands:</b>
• <code>/new [amount] "[description]"</code> - Create invoice
• <code>/connect [nwc_url]</code> - Connect wallet
• <code>/invoices</code> - View invoices
• <code>/stats</code> - View statistics

💡 <b>Tips:</b>
• Use descriptive invoice descriptions
• Check payment status regularly
• Keep your wallet connected
• Save important invoices as PDFs

🔗 <b>Supported Wallets:</b>
Alby, Zeus, Mutiny, Cashu, and any NWC-compatible wallet

❓ <b>Need more help?</b>
Contact support: @quickvoicy_support
    `;

    await bot.editMessageText(helpMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        ...backToMenuKeyboard
    });
}

async function showSettings(chatId, messageId, userId) {
    const user = await db.getUser('telegram', userId);

    const settingsMessage = `
⚙️ <b>Settings</b>

👤 <b>Account Info:</b>
• User ID: <code>${userId}</code>
• Joined: ${user ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
• Wallet: ${user?.nwc_url ? '✅ Connected' : '❌ Not Connected'}

🔔 <b>Notifications:</b>
• Payment alerts: ✅ Enabled
• Invoice reminders: ✅ Enabled

📱 <b>Preferences:</b>
• Default currency: Satoshis
• PDF language: English
• Time zone: Auto

🔒 <b>Privacy:</b>
Your data is encrypted and secure.
    `;

    await bot.editMessageText(settingsMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔔 Notification Settings', callback_data: 'notification_settings' }],
                [{ text: '🗑️ Delete Account', callback_data: 'delete_account' }],
                [{ text: '🏠 Back to Menu', callback_data: 'main_menu' }]
            ]
        }
    });
}

// Template handlers
async function handleTemplate(chatId, messageId, userId, amount, description) {
    const user = await db.getUser('telegram', userId);
    if (!user || !user.nwc_url) {
        await bot.editMessageText(
            '⚠️ <b>Wallet Required</b>\n\nPlease connect your Lightning wallet first.',
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔗 Connect Wallet', callback_data: 'connect_wallet' }],
                        [{ text: '🏠 Back to Menu', callback_data: 'main_menu' }]
                    ]
                }
            }
        );
        return;
    }

    await bot.editMessageText(
        '👤 <b>Client Information</b>\n\n📝 Please provide the client name:',
        {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🏠 Cancel', callback_data: 'main_menu' }]
                ]
            }
        }
    );

    userSessions.set(userId, {
        step: 'waiting_client_name',
        amount,
        description,
        processingMsgId: messageId
    });
}

async function handleCustomTemplate(chatId, messageId, userId) {
    const user = await db.getUser('telegram', userId);
    if (!user || !user.nwc_url) {
        await bot.editMessageText(
            '⚠️ <b>Wallet Required</b>\n\nPlease connect your Lightning wallet first.',
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔗 Connect Wallet', callback_data: 'connect_wallet' }],
                        [{ text: '🏠 Back to Menu', callback_data: 'main_menu' }]
                    ]
                }
            }
        );
        return;
    }

    await bot.editMessageText(
        '💰 <b>Custom Amount</b>\n\n📝 Please enter the amount in satoshis:',
        {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🏠 Cancel', callback_data: 'main_menu' }]
                ]
            }
        }
    );

    userSessions.set(userId, {
        step: 'waiting_template_amount',
        processingMsgId: messageId
    });
}

// Skip email handler
async function handleSkipEmail(chatId, userId) {
    const session = userSessions.get(userId);
    if (session) {
        session.clientEmail = 'No email provided';
        await askForCustomFields(chatId, userId, session);
    }
}

// Custom fields handlers
async function askForCustomFields(chatId, userId, session) {
    await bot.editMessageText(
        '🔧 <b>Custom Fields</b>\n\n💡 Would you like to add custom fields to your invoice?\n\n<i>Examples: Project ID, Purchase Order, Due Date, etc.</i>',
        {
            chat_id: chatId,
            message_id: session.processingMsgId,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ Add Custom Fields', callback_data: 'add_custom_fields' }],
                    [{ text: '⏭️ Skip Custom Fields', callback_data: 'skip_custom_fields' }],
                    [{ text: '🏠 Cancel', callback_data: 'main_menu' }]
                ]
            }
        }
    );
}

async function handleAddCustomFields(chatId, userId) {
    const session = userSessions.get(userId);
    if (session) {
        session.step = 'waiting_custom_field_name';

        await bot.editMessageText(
            '🔧 <b>Custom Field Name</b>\n\n📝 Please provide the name for your custom field:\n\n<i>Examples: Project ID, Purchase Order, Due Date</i>',
            {
                chat_id: chatId,
                message_id: session.processingMsgId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🏠 Cancel', callback_data: 'main_menu' }]
                    ]
                }
            }
        );
    }
}

async function handleSkipCustomFields(chatId, userId) {
    const session = userSessions.get(userId);
    if (session) {
        await createInvoiceFromSession(chatId, userId, session);
    }
}

// Action button handlers
async function handleViewPDF(chatId, userId, invoiceId) {
    try {
        const user = await db.getUser('telegram', userId);
        if (!user) {
            await bot.sendMessage(chatId, '❌ User not found.');
            return;
        }

        const invoice = await db.getInvoiceById(invoiceId);
        if (!invoice || invoice.user_id !== user.id) {
            await bot.sendMessage(chatId, '❌ Invoice not found or access denied.');
            return;
        }

        await bot.sendMessage(chatId, '📄 <b>Regenerating PDF...</b>', { parse_mode: 'HTML' });

        const pdfPath = await PDFService.generateInvoicePDF({
            ...invoice,
            created_at: invoice.created_at,
            status: invoice.status
        });

        await bot.sendDocument(chatId, pdfPath, {
            caption: `📄 <b>Invoice PDF</b>\n\n🎯 Invoice #${invoice.id.substring(0, 8)}\n💰 ${invoice.amount} sats\n📋 ${invoice.description}`,
            parse_mode: 'HTML'
        });

        setTimeout(() => {
            PDFService.cleanup(pdfPath);
        }, 2000);

    } catch (error) {
        console.error('View PDF error:', error);
        await bot.sendMessage(chatId, '❌ Failed to generate PDF. Please try again.');
    }
}

async function handleCheckStatus(chatId, userId, invoiceId) {
    try {
        const user = await db.getUser('telegram', userId);
        if (!user) {
            await bot.sendMessage(chatId, '❌ User not found.');
            return;
        }

        const invoice = await db.getInvoiceById(invoiceId);
        if (!invoice || invoice.user_id !== user.id) {
            await bot.sendMessage(chatId, '❌ Invoice not found or access denied.');
            return;
        }

        // Check payment status via NWC
        if (user.nwc_url && invoice.payment_hash) {
            const loadingMsg = await bot.sendMessage(chatId, '🔄 <b>Checking payment status...</b>', { parse_mode: 'HTML' });

            try {
                const nwc = new NWCService(user.nwc_url);
                await nwc.connect();
                const isPaid = await nwc.checkPayment(invoice.payment_hash);
                await nwc.disconnect();

                if (isPaid && invoice.status !== 'paid') {
                    // Update invoice status
                    await db.updateInvoiceStatus(invoiceId, 'paid');

                    await bot.editMessageText(
                        '🎉 <b>Payment Received!</b>\n\n✅ This invoice has been paid!\n\n💰 Amount: <code>' + invoice.amount + ' sats</code>\n📋 Description: <code>' + invoice.description + '</code>',
                        {
                            chat_id: chatId,
                            message_id: loadingMsg.message_id,
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '📄 Generate Receipt', callback_data: `receipt_${invoiceId}` }],
                                    [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                                ]
                            }
                        }
                    );
                } else {
                    const status = invoice.status === 'paid' ? '✅ Paid' : '⏳ Pending';
                    const statusEmoji = invoice.status === 'paid' ? '🎉' : '⏳';

                    await bot.editMessageText(
                        `${statusEmoji} <b>Invoice Status</b>\n\n📋 Invoice #${invoice.id.substring(0, 8)}\n💰 Amount: <code>${invoice.amount} sats</code>\n📊 Status: <code>${status}</code>\n📅 Created: ${new Date(invoice.created_at).toLocaleDateString()}`,
                        {
                            chat_id: chatId,
                            message_id: loadingMsg.message_id,
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔄 Check Again', callback_data: `check_status_${invoiceId}` }],
                                    [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                                ]
                            }
                        }
                    );
                }
            } catch (error) {
                console.error('Payment check error:', error);
                await bot.editMessageText(
                    '❌ <b>Status Check Failed</b>\n\nUnable to check payment status. Please try again later.',
                    {
                        chat_id: chatId,
                        message_id: loadingMsg.message_id,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                            ]
                        }
                    }
                );
            }
        } else {
            const status = invoice.status === 'paid' ? '✅ Paid' : '⏳ Pending';
            const statusEmoji = invoice.status === 'paid' ? '🎉' : '⏳';

            await bot.sendMessage(chatId,
                `${statusEmoji} <b>Invoice Status</b>\n\n📋 Invoice #${invoice.id.substring(0, 8)}\n💰 Amount: <code>${invoice.amount} sats</code>\n📊 Status: <code>${status}</code>\n📅 Created: ${new Date(invoice.created_at).toLocaleDateString()}`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                        ]
                    }
                }
            );
        }

    } catch (error) {
        console.error('Check status error:', error);
        await bot.sendMessage(chatId, '❌ Failed to check status. Please try again.');
    }
}

async function handleShareInvoice(chatId, userId, invoiceId) {
    try {
        const user = await db.getUser('telegram', userId);
        if (!user) {
            await bot.sendMessage(chatId, '❌ User not found.');
            return;
        }

        const invoice = await db.getInvoiceById(invoiceId);
        if (!invoice || invoice.user_id !== user.id) {
            await bot.sendMessage(chatId, '❌ Invoice not found or access denied.');
            return;
        }

        let customFieldsText = '';
        if (invoice.customFields && invoice.customFields.length > 0) {
            customFieldsText = '\n\n🔧 <b>Additional Info:</b>\n';
            invoice.customFields.forEach(field => {
                customFieldsText += `• <code>${field.name}: ${field.value}</code>\n`;
            });
        }

        const shareMessage = `
💼 <b>Invoice #${invoice.id.substring(0, 8)}</b>

📋 <b>Details:</b>
• Amount: <code>${invoice.amount} sats</code>
• Description: <code>${invoice.description}</code>
• Client: <code>${invoice.client_name}</code>
• Status: <code>${invoice.status === 'paid' ? '✅ Paid' : '⏳ Pending'}</code>${customFieldsText}

⚡ <b>Lightning Invoice:</b>
<code>${invoice.lightning_invoice}</code>

📱 <i>Copy the Lightning invoice above and paste it into any Lightning wallet to pay.</i>
        `;

        await bot.sendMessage(chatId, shareMessage, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📄 Share PDF', callback_data: `view_pdf_${invoiceId}` }],
                    [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                ]
            }
        });

    } catch (error) {
        console.error('Share invoice error:', error);
        await bot.sendMessage(chatId, '❌ Failed to share invoice. Please try again.');
    }
}

async function handleDeleteInvoice(chatId, userId, invoiceId) {
    try {
        await bot.sendMessage(chatId,
            '🗑️ <b>Delete Invoice</b>\n\n⚠️ Are you sure you want to delete this invoice?\n\n<i>This action cannot be undone.</i>',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Yes, Delete', callback_data: `confirm_delete_${invoiceId}` },
                            { text: '❌ Cancel', callback_data: 'main_menu' }
                        ]
                    ]
                }
            }
        );
    } catch (error) {
        console.error('Delete invoice error:', error);
        await bot.sendMessage(chatId, '❌ Failed to delete invoice. Please try again.');
    }
}

async function showInvoiceDetails(chatId, messageId, userId, invoiceId) {
    try {
        const user = await db.getUser('telegram', userId);
        if (!user) {
            await bot.editMessageText('❌ User not found.', {
                chat_id: chatId,
                message_id: messageId,
                ...backToMenuKeyboard
            });
            return;
        }

        const invoice = await db.getInvoiceById(invoiceId);
        if (!invoice || invoice.user_id !== user.id) {
            await bot.editMessageText('❌ Invoice not found or access denied.', {
                chat_id: chatId,
                message_id: messageId,
                ...backToMenuKeyboard
            });
            return;
        }

        const status = invoice.status === 'paid' ? '✅ Paid' : '⏳ Pending';
        const statusEmoji = invoice.status === 'paid' ? '🎉' : '📋';

        let customFieldsText = '';
        if (invoice.customFields && invoice.customFields.length > 0) {
            customFieldsText = '\n\n🔧 <b>Custom Fields:</b>\n';
            invoice.customFields.forEach(field => {
                customFieldsText += `• <code>${field.name}: ${field.value}</code>\n`;
            });
        }

        const detailsMessage = `
${statusEmoji} <b>Invoice Details</b>

📋 <b>Invoice #${invoice.id.substring(0, 8)}</b>

💰 <b>Amount:</b> <code>${invoice.amount} sats</code>
📝 <b>Description:</b> <code>${invoice.description}</code>
👤 <b>Client:</b> <code>${invoice.client_name}</code>
📧 <b>Email:</b> <code>${invoice.client_email}</code>
📊 <b>Status:</b> <code>${status}</code>
📅 <b>Created:</b> ${new Date(invoice.created_at).toLocaleDateString()}
${invoice.paid_at ? `💳 <b>Paid:</b> ${new Date(invoice.paid_at).toLocaleDateString()}` : ''}${customFieldsText}

⚡ <b>Lightning Invoice:</b>
<code>${invoice.lightning_invoice}</code>
        `;

        await bot.editMessageText(detailsMessage, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            ...invoiceActionsKeyboard(invoiceId)
        });

    } catch (error) {
        console.error('Show invoice details error:', error);
        await bot.editMessageText('❌ Failed to load invoice details.', {
            chat_id: chatId,
            message_id: messageId,
            ...backToMenuKeyboard
        });
    }
}

async function handleConfirmDelete(chatId, userId, invoiceId) {
    try {
        const user = await db.getUser('telegram', userId);
        if (!user) {
            await bot.sendMessage(chatId, '❌ User not found.');
            return;
        }

        const success = await db.deleteInvoice(invoiceId, user.id);

        if (success) {
            await bot.sendMessage(chatId,
                '✅ <b>Invoice Deleted</b>\n\n🗑️ The invoice has been permanently deleted.',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📋 View All Invoices', callback_data: 'view_invoices' }],
                            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                        ]
                    }
                }
            );
        } else {
            await bot.sendMessage(chatId, '❌ Failed to delete invoice. It may have already been deleted.');
        }

    } catch (error) {
        console.error('Confirm delete error:', error);
        await bot.sendMessage(chatId, '❌ Failed to delete invoice. Please try again.');
    }
}

async function handleGenerateReceipt(chatId, userId, invoiceId) {
    try {
        const user = await db.getUser('telegram', userId);
        if (!user) {
            await bot.sendMessage(chatId, '❌ User not found.');
            return;
        }

        const invoice = await db.getInvoiceById(invoiceId);
        if (!invoice) {
            await bot.sendMessage(chatId, '❌ Invoice not found.');
            return;
        }

        if (invoice.status !== 'paid') {
            await bot.sendMessage(chatId, '❌ Cannot generate receipt for unpaid invoice.');
            return;
        }

        const loadingMsg = await bot.sendMessage(chatId, '📄 <b>Generating Receipt...</b>', { parse_mode: 'HTML' });

        const receiptPath = await PDFService.generateReceiptPDF(invoice);

        await bot.editMessageText(
            '📤 <b>Sending Receipt...</b>',
            {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parse_mode: 'HTML'
            }
        );

        await bot.sendDocument(chatId, receiptPath, {
            caption: `📄 <b>Payment Receipt</b>\n\n✅ Payment confirmed for Invoice #${invoice.id.substring(0, 8)}\n💰 ${invoice.amount} sats`,
            parse_mode: 'HTML'
        });

        await bot.deleteMessage(chatId, loadingMsg.message_id);

        setTimeout(() => {
            PDFService.cleanup(receiptPath);
        }, 2000);

    } catch (error) {
        console.error('Generate receipt error:', error);
        await bot.sendMessage(chatId, '❌ Failed to generate receipt. Please try again.');
    }
}

// Enhanced /connect command
bot.onText(/\/connect (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const nwcUrl = match[1];

    const loadingMsg = await bot.sendMessage(chatId, '🔄 <b>Connecting wallet...</b>', { parse_mode: 'HTML' });

    try {
        // Validate NWC URL
        const nwc = new NWCService(nwcUrl);
        await nwc.connect();
        await nwc.disconnect();

        // Get user and update NWC URL
        const user = await db.getUser('telegram', userId);
        await db.updateUserNWC(user.id, nwcUrl);

        await bot.editMessageText(
            '✅ <b>Wallet Connected Successfully!</b>\n\n🎉 You can now create invoices and receive Lightning payments!',
            {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '⚡ Create First Invoice', callback_data: 'create_invoice' }],
                        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                    ]
                }
            }
        );
    } catch (error) {
        await bot.editMessageText(
            '❌ <b>Connection Failed</b>\n\n⚠️ Invalid NWC URL or connection error.\n\n💡 Please check your URL and try again.',
            {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📖 Connection Guide', callback_data: 'wallet_guide' }],
                        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                    ]
                }
            }
        );
    }
});

// Enhanced /new command with better UX
bot.onText(/\/new (\d+) "(.+)"/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const amount = parseInt(match[1]);
    const description = match[2];

    try {
        const user = await db.getUser('telegram', userId);
        if (!user || !user.nwc_url) {
            await bot.sendMessage(chatId,
                '⚠️ <b>Wallet Required</b>\n\nPlease connect your Lightning wallet first.',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔗 Connect Wallet', callback_data: 'connect_wallet' }]
                        ]
                    }
                }
            );
            return;
        }

        // Start the invoice creation process
        const processingMsg = await bot.sendMessage(chatId,
            '⚡ <b>Creating Invoice...</b>\n\n📋 Processing your request...',
            { parse_mode: 'HTML' }
        );

        // Ask for client details with inline keyboard
        await bot.editMessageText(
            '👤 <b>Client Information</b>\n\n📝 Please provide the client name:',
            {
                chat_id: chatId,
                message_id: processingMsg.message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🏠 Cancel', callback_data: 'main_menu' }]
                    ]
                }
            }
        );

        // Store session data
        userSessions.set(userId, {
            step: 'waiting_client_name',
            amount,
            description,
            processingMsgId: processingMsg.message_id
        });

    } catch (error) {
        await bot.sendMessage(chatId, '❌ <b>Error</b>\n\nFailed to create invoice. Please try again.', { parse_mode: 'HTML' });
    }
});

// Handle text messages for multi-step processes
bot.on('message', async (msg) => {
    if (msg.text && !msg.text.startsWith('/') && !msg.callback_query) {
        const userId = msg.from.id.toString();
        const chatId = msg.chat.id;
        const session = userSessions.get(userId);

        if (session) {
            if (session.step === 'waiting_client_name') {
                session.clientName = msg.text;
                session.step = 'waiting_client_email';

                await bot.editMessageText(
                    '📧 <b>Client Email</b>\n\n📝 Please provide the client email address:',
                    {
                        chat_id: chatId,
                        message_id: session.processingMsgId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '⏭️ Skip Email', callback_data: 'skip_email' }],
                                [{ text: '🏠 Cancel', callback_data: 'main_menu' }]
                            ]
                        }
                    }
                );

            } else if (session.step === 'waiting_client_email') {
                session.clientEmail = msg.text;
                await askForCustomFields(chatId, userId, session);
            } else if (session.step === 'waiting_custom_field_name') {
                if (!session.customFields) session.customFields = [];
                session.currentFieldName = msg.text;
                session.step = 'waiting_custom_field_value';

                await bot.editMessageText(
                    `🔧 <b>Custom Field Value</b>\n\n📝 Please provide the value for "<code>${msg.text}</code>":`,
                    {
                        chat_id: chatId,
                        message_id: session.processingMsgId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🏠 Cancel', callback_data: 'main_menu' }]
                            ]
                        }
                    }
                );
            } else if (session.step === 'waiting_custom_field_value') {
                session.customFields.push({
                    name: session.currentFieldName,
                    value: msg.text
                });

                await bot.editMessageText(
                    `✅ <b>Custom Field Added</b>\n\n<code>${session.currentFieldName}: ${msg.text}</code>\n\nWould you like to add another custom field?`,
                    {
                        chat_id: chatId,
                        message_id: session.processingMsgId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '➕ Add Another Field', callback_data: 'add_custom_fields' }],
                                [{ text: '✅ Continue', callback_data: 'skip_custom_fields' }],
                                [{ text: '🏠 Cancel', callback_data: 'main_menu' }]
                            ]
                        }
                    }
                );
            } else if (session.step === 'waiting_template_amount') {
                const amount = parseInt(msg.text);
                if (isNaN(amount) || amount <= 0) {
                    await bot.sendMessage(chatId, '❌ Please enter a valid amount in satoshis.');
                    return;
                }
                session.amount = amount;
                session.step = 'waiting_template_description';

                await bot.editMessageText(
                    '📝 <b>Service Description</b>\n\n📝 Please provide a description for your service:',
                    {
                        chat_id: chatId,
                        message_id: session.processingMsgId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🏠 Cancel', callback_data: 'main_menu' }]
                            ]
                        }
                    }
                );
            } else if (session.step === 'waiting_template_description') {
                session.description = msg.text;
                session.step = 'waiting_client_name';

                await bot.editMessageText(
                    '👤 <b>Client Information</b>\n\n📝 Please provide the client name:',
                    {
                        chat_id: chatId,
                        message_id: session.processingMsgId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🏠 Cancel', callback_data: 'main_menu' }]
                            ]
                        }
                    }
                );
            }
        }
    }
});

async function createInvoiceFromSession(chatId, userId, session) {
    try {
        await bot.editMessageText(
            '⚡ <b>Generating Invoice...</b>\n\n🔄 Creating Lightning invoice...',
            {
                chat_id: chatId,
                message_id: session.processingMsgId,
                parse_mode: 'HTML'
            }
        );

        const user = await db.getUser('telegram', userId);
        const nwc = new NWCService(user.nwc_url);
        await nwc.connect();

        const lightningInvoice = await nwc.createInvoice(session.amount, session.description);
        const paymentHash = null;

        const invoice = {
            id: uuidv4(),
            userId: user.id,
            amount: session.amount,
            description: session.description,
            clientName: session.clientName,
            clientEmail: session.clientEmail || 'No email provided',
            customFields: session.customFields || [],
            lightningInvoice,
            paymentHash
        };

        await db.createInvoice(invoice);
        await nwc.disconnect();

        // Enhanced success message with custom fields
        let customFieldsText = '';
        if (invoice.customFields && invoice.customFields.length > 0) {
            customFieldsText = '\n\n🔧 <b>Custom Fields:</b>\n';
            invoice.customFields.forEach(field => {
                customFieldsText += `• <code>${field.name}: ${field.value}</code>\n`;
            });
        }

        const successMessage = `
✅ <b>Invoice Created Successfully!</b>

📋 <b>Invoice Details:</b>
• ID: <code>#${invoice.id.substring(0, 8)}</code>
• Amount: <code>${session.amount} sats</code>
• Client: <code>${session.clientName}</code>
• Description: <code>${session.description}</code>${customFieldsText}

⚡ <b>Lightning Invoice:</b>
<code>${lightningInvoice}</code>

📄 <b>Generating PDF...</b>
        `;

        // await bot.editMessageText(successMessage, {
        //     chat_id: chatId,
        //     message_id: session.processingMsgId,
        //     parse_mode: 'HTML'
        // });

        // Generate and send PpaymentHashDF
        await sendInvoiceWithPDF(bot, chatId, invoice, successMessage);

        // Send action buttons
        await bot.sendMessage(chatId,
            '🎉 <b>Invoice Ready!</b>\n\nWhat would you like to do next?',
            {
                parse_mode: 'HTML',
                ...invoiceActionsKeyboard(invoice.id)
            }
        );

        // Clear session
        userSessions.delete(userId);

    } catch (error) {
        console.error('Invoice creation error:', error);
        await bot.editMessageText(
            '❌ <b>Failed to Create Invoice</b>\n\n⚠️ Please try again or contact support.',
            {
                chat_id: chatId,
                message_id: session.processingMsgId,
                parse_mode: 'HTML',
                ...backToMenuKeyboard
            }
        );
        userSessions.delete(userId);
    }
}

// Quick access commands
bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    await bot.sendMessage(chatId, '🏠 <b>Main Menu</b>', {
        parse_mode: 'HTML',
        ...mainMenuKeyboard
    });
});

// Add payment status checking command
bot.onText(/\/check (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const invoiceId = match[1];

    try {
        const user = await db.getUser('telegram', userId);
        if (!user) {
            await bot.sendMessage(chatId, '❌ User not found. Please start with /start');
            return;
        }

        const invoice = await db.getInvoiceById(invoiceId);
        if (!invoice || invoice.user_id !== user.id) {
            await bot.sendMessage(chatId, '❌ Invoice not found or you don\'t have permission to access it.');
            return;
        }

        await handleCheckStatus(chatId, userId, invoiceId);

    } catch (error) {
        console.error('Check command error:', error);
        await bot.sendMessage(chatId, '❌ Failed to check invoice status.');
    }
});

// Automatic payment checking (can be called periodically)
async function checkPendingPayments() {
    try {
        const pendingInvoices = await db.getPendingInvoices();

        for (const invoice of pendingInvoices) {
            try {
                const user = await db.getUserById(invoice.user_id);
                if (!user || !user.nwc_url) continue;

                const nwc = new NWCService(user.nwc_url);
                await nwc.connect();
                const isPaid = await nwc.checkPayment(invoice.payment_hash);
                await nwc.disconnect();

                if (isPaid) {
                    await db.updateInvoiceStatus(invoice.id, 'paid');

                    // Notify user about payment
                    try {
                        await bot.sendMessage(user.platform_id,
                            `🎉 <b>Payment Received!</b>\n\n💰 Invoice #${invoice.id.substring(0, 8)} has been paid!\n\n💵 Amount: ${invoice.amount} sats\n📋 ${invoice.description}`,
                            {
                                parse_mode: 'HTML',
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '📄 Generate Receipt', callback_data: `receipt_${invoice.id}` }],
                                        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                                    ]
                                }
                            }
                        );
                    } catch (notifyError) {
                        console.error('Failed to notify user about payment:', notifyError);
                    }
                }
            } catch (error) {
                console.error(`Error checking payment for invoice ${invoice.id}:`, error);
            }
        }
    } catch (error) {
        console.error('Error in checkPendingPayments:', error);
    }
}

// Check pending payments every 30 seconds
setInterval(checkPendingPayments, 30000);

console.log('🚀 Enhanced Quickvoicy Bot is running...');