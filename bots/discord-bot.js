// discord-bot.js - Quickvoicy Bot with Sapphire Framework (Single File)
import 'dotenv/config';
import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits, ActivityType, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';
import NWCService from './nwc-service.js';
import PDFService from './pdf-service.js';

// ===== CLIENT SETUP =====
const client = new SapphireClient({
    defaultPrefix: '/',
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    loadMessageCommandListeners: false, // Disable auto-loading
    loadApplicationCommandRegistriesListeners: false,
    loadDefaultErrorListeners: false
});

client.once('ready', () => {
    console.log(`Discord bot logged in as ${client.user.tag}`);
    client.user.setActivity('⚡ /help for commands', { type: ActivityType.Watching });
});

// ===== COMMAND HANDLERS =====

async function handleStart(message) {
    const userId = message.author.id;

    // Get or create user
    let user = await db.getUser('discord', userId);
    if (!user) {
        const id = await db.createUser('discord', userId);
        user = { id, platform: 'discord', platform_id: userId };
    }

    const embed = new EmbedBuilder()
        .setColor(0xFFC107)
        .setTitle('⚡ Welcome to Quickvoicy Bot!')
        .setDescription('Create professional invoices with instant Lightning payments.')
        .addFields(
            { name: 'Commands', value: '`/new <amount> "<description>"` - Create invoice\n`/connect <nwc_url>` - Connect wallet\n`/invoices` - View invoices\n`/stats` - View statistics\n`/help` - Show help' },
            { name: 'Example', value: '`/new 1000 "Logo design"`' },
            { name: 'Get Started', value: 'First, connect your wallet using `/connect` command.' }
        )
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

async function handleConnect(message, args) {
    const userId = message.author.id;
    const nwcUrl = args.join(' ');

    if (!nwcUrl) {
        return message.reply('❌ Please provide NWC URL: `/connect <nwc_url>`');
    }

    try {
        // Validate NWC URL
        const nwc = new NWCService(nwcUrl);
        await nwc.connect();
        await nwc.disconnect();

        // Get user and update NWC URL
        const user = await db.getUser('discord', userId);
        console.log(">>>>>>", user)
        await db.updateUserNWC(user.id, nwcUrl);

        return message.reply('✅ Wallet connected successfully! You can now create invoices.');
    } catch (error) {
        client.logger.error('Connect command error:', error);
        return message.reply('❌ Invalid NWC URL. Please check and try again.');
    }
}

async function handleNew(message, args) {
    const userId = message.author.id;

    // Parse command
    const commandText = args.join(' ');
    const match = commandText.match(/(\d+)\s+"(.+)"/);

    if (!match) {
        return message.reply('❌ Invalid format. Use: `/new <amount> "<description>"`');
    }

    const amount = parseInt(match[1]);
    const description = match[2];

    try {
        // Get user
        const user = await db.getUser('discord', userId);
        if (!user || !user.nwc_url) {
            return message.reply('❌ Please connect your wallet first using `/connect` command.');
        }

        // Ask for client details (optional)
        await message.reply('Please provide client details (optional):\n' +
            '**Format:** `<client_name> | <client_email> | <custom_field1> | <custom_field2>...`\n' +
            '**Examples:**\n' +
            '• `John Doe` (name only)\n' +
            '• `John Doe | john@example.com` (name + email)\n' +
            '• `John Doe | john@example.com | Company ABC | Project X` (with custom fields)\n' +
            '• Type `skip` to proceed without client details');

        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async (m) => {
            let clientName = null;
            let clientEmail = null;
            let customFields = [];

            // Handle skip option
            if (m.content.toLowerCase().trim() === 'skip') {
                clientName = 'Not specified';
                clientEmail = null;
            } else {
                const details = m.content.split('|').map(s => s.trim()).filter(s => s.length > 0);

                if (details.length === 0) {
                    await message.reply('❌ Please provide at least a client name or type `skip`');
                    return;
                }

                // First field is always client name
                clientName = details[0] || 'Not specified';

                // Second field is email if it contains @ symbol, otherwise it's a custom field
                if (details.length > 1) {
                    if (details[1].includes('@')) {
                        clientEmail = details[1];
                        customFields = details.slice(2); // Everything after email
                    } else {
                        clientEmail = null;
                        customFields = details.slice(1); // Everything after name
                    }
                }
            }

            try {
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

                // Create embed
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Invoice Created!')
                    .addFields(
                        { name: 'Invoice ID', value: invoice.id, inline: true },
                        { name: 'Amount', value: `${amount} sats`, inline: true },
                        { name: 'Description', value: description },
                        { name: 'Client', value: clientName },
                        { name: 'Lightning Invoice', value: `\`\`\`${lightningInvoice}\`\`\`` }
                    )
                    .setTimestamp();

                await message.reply({ embeds: [embed] });

                // Generate and send PDF
                const pdfPath = await PDFService.generateInvoicePDF({
                    ...invoice,
                    created_at: new Date().toISOString(),
                    status: 'pending'
                });

                const attachment = new AttachmentBuilder(pdfPath, { name: `invoice-${invoice.id}.pdf` });
                await message.reply({ content: 'Invoice PDF - Share with your client', files: [attachment] });

                // Cleanup
                PDFService.cleanup(pdfPath);
            } catch (error) {
                client.logger.error('Invoice creation error:', error);
                await message.reply('❌ Failed to create invoice. Please try again.');
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                message.reply('❌ Invoice creation timed out.');
            }
        });
    } catch (error) {
        client.logger.error('New command error:', error);
        return message.reply('❌ Failed to create invoice. Please try again.');
    }
}

async function handleInvoices(message) {
    const userId = message.author.id;

    try {
        const user = await db.getUser('discord', userId);
        if (!user) {
            return message.reply('❌ Please start the bot first with `/start`');
        }

        const invoices = await db.getUserInvoices(user.id);

        if (invoices.length === 0) {
            return message.reply('No invoices found. Create your first invoice with `/new` command.');
        }

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📋 Your Recent Invoices')
            .setTimestamp();

        invoices.forEach(invoice => {
            const status = invoice.status === 'paid' ? '✅' : '⏳';
            embed.addFields({
                name: `${status} Invoice #${invoice.id.substring(0, 8)}`,
                value: `${invoice.amount} sats - ${invoice.description}\n${new Date(invoice.created_at).toLocaleDateString()}`,
                inline: false
            });
        });

        return message.reply({ embeds: [embed] });
    } catch (error) {
        client.logger.error('Invoices command error:', error);
        return message.reply('❌ Failed to fetch invoices.');
    }
}

async function handleStats(message) {
    const userId = message.author.id;

    try {
        const user = await db.getUser('discord', userId);
        if (!user) {
            return message.reply('❌ Please start the bot first with `/start`');
        }

        const stats = await db.getUserStats(user.id);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('📊 Your Statistics')
            .addFields(
                { name: 'Total Invoices', value: stats.total_invoices.toString(), inline: true },
                { name: 'Paid Invoices', value: stats.paid_invoices.toString(), inline: true },
                { name: 'Total Earned', value: `${stats.total_earned || 0} sats`, inline: true },
                { name: 'Payment Rate', value: `${stats.total_invoices > 0 ? Math.round((stats.paid_invoices / stats.total_invoices) * 100) : 0}%`, inline: true }
            )
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    } catch (error) {
        client.logger.error('Stats command error:', error);
        return message.reply('❌ Failed to fetch statistics.');
    }
}

async function handleHelp(message) {
    const embed = new EmbedBuilder()
        .setColor(0xFFC107)
        .setTitle('⚡ Quickvoicy Bot Help')
        .setDescription('Create professional invoices with instant Lightning payments')
        .addFields(
            { name: 'Commands', value: '`/new <amount> "<description>"` - Create new invoice\n`/connect <nwc_url>` - Connect Lightning wallet\n`/invoices` - View recent invoices\n`/stats` - View earnings statistics\n`/help` - Show this help message' },
            { name: 'Example', value: '`/new 5000 "Website development"`' },
            { name: 'Getting Started', value: '1. Get NWC URL from your Lightning wallet (Alby, Zeus, etc.)\n2. Connect wallet: `/connect nostr+walletconnect://...`\n3. Create invoice: `/new 1000 "Logo design"`' }
        )
        .setFooter({ text: 'Need help? Contact support' })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

// ===== MESSAGE COMMAND HANDLING =====
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('/')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        switch (command) {
            case 'start':
                await handleStart(message);
                break;
            case 'connect':
                await handleConnect(message, args);
                break;
            case 'new':
                await handleNew(message, args);
                break;
            case 'invoices':
                await handleInvoices(message);
                break;
            case 'stats':
                await handleStats(message);
                break;
            case 'help':
                await handleHelp(message);
                break;
            default:
                await message.reply('❌ Unknown command. Use `/help` to see available commands.');
                break;
        }
    } catch (error) {
        client.logger.error('Command execution error:', error);
        await message.reply('❌ An error occurred while processing your command.');
    }
});

// ===== ERROR HANDLING =====
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// ===== START BOT =====
client.login(process.env.DISCORD_BOT_TOKEN);