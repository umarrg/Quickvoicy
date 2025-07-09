import { createWriteStream } from 'fs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

class PDFService {
    static async generateInvoicePDF(invoice) {
        return new Promise(async (resolve, reject) => {
            try {
                // Create PDF with custom page size and margins
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0
                    },
                    info: {
                        Title: `Invoice #${invoice.id}`,
                        Author: 'Quickvoicy',
                        Subject: `Lightning Invoice for ${invoice.clientName || invoice.client_name}`,
                        Creator: 'Quickvoicy Lightning Invoicing'
                    }
                });

                const filename = `invoice-${invoice.id}.pdf`;
                const tempDir = join(__dirname, 'temp');
                const filepath = join(tempDir, filename);

                // Ensure temp directory exists
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }

                const writeStream = createWriteStream(filepath);
                doc.pipe(writeStream);

                // Enhanced Color Palette
                const colors = {
                    primary: '#F7931A',      // Bitcoin orange
                    secondary: '#4B0082',    // Indigo
                    accent: '#FFD700',       // Gold
                    success: '#00D632',      // Bright green
                    pending: '#FF6B6B',      // Coral red
                    dark: '#1a1a2e',         // Dark blue
                    gray: '#6c757d',
                    lightGray: '#f8f9fa',
                    white: '#ffffff',
                    gradient1: '#667eea',    // Purple
                    gradient2: '#764ba2',    // Darker purple
                    textDark: '#2d3748',
                    textLight: '#718096'
                };

                // Page dimensions
                const pageWidth = doc.page.width;
                const pageHeight = doc.page.height;
                const margin = 40;
                const contentWidth = pageWidth - (margin * 2);

                // Helper functions
                const drawGradientRect = (x, y, width, height, color1, color2, direction = 'horizontal') => {
                    const gradient = direction === 'horizontal'
                        ? doc.linearGradient(x, y, x + width, y)
                        : doc.linearGradient(x, y, x, y + height);

                    gradient.stop(0, color1).stop(1, color2);
                    doc.save()
                        .rect(x, y, width, height)
                        .fill(gradient)
                        .restore();
                };

                const drawCircle = (x, y, radius, color, opacity = 1) => {
                    doc.save()
                        .fillColor(color, opacity)
                        .circle(x, y, radius)
                        .fill()
                        .restore();
                };

                const drawRoundedRect = (x, y, width, height, radius, color, opacity = 1) => {
                    doc.save()
                        .fillColor(color, opacity)
                        .roundedRect(x, y, width, height, radius)
                        .fill()
                        .restore();
                };

                const drawShadowRect = (x, y, width, height, radius, color) => {
                    // Shadow
                    drawRoundedRect(x + 2, y + 2, width, height, radius, '#00000010');
                    drawRoundedRect(x + 1, y + 1, width, height, radius, '#00000020');
                    // Main rect
                    drawRoundedRect(x, y, width, height, radius, color);
                };

                // 1. HEADER SECTION - Modern gradient design
                drawGradientRect(0, 0, pageWidth, 180, colors.gradient1, colors.gradient2, 'diagonal');

                // Decorative circles
                drawCircle(pageWidth - 80, 50, 100, colors.white, 0.1);
                drawCircle(50, 120, 60, colors.white, 0.05);
                drawCircle(pageWidth - 150, 140, 40, colors.accent, 0.15);

                // Logo and title
                doc.fontSize(36)
                    .fillColor(colors.white)
                    .font('Helvetica-Bold')
                    .text('⚡', 50, 45);

                doc.fontSize(28)
                    .fillColor(colors.white)
                    .font('Helvetica-Bold')
                    .text('QUICKVOICY', 100, 50);

                doc.fontSize(12)
                    .fillColor(colors.white)
                    .font('Helvetica')
                    .text('Lightning-Fast Professional Invoicing', 100, 80);

                // Invoice badge
                drawShadowRect(pageWidth - 200, 40, 150, 80, 10, colors.white);

                doc.fontSize(14)
                    .fillColor(colors.textDark)
                    .font('Helvetica-Bold')
                    .text('INVOICE', pageWidth - 185, 55);

                doc.fontSize(20)
                    .fillColor(colors.primary)
                    .font('Helvetica-Bold')
                    .text(`#${invoice.id.substring(0, 8).toUpperCase()}`, pageWidth - 185, 75);

                const invoiceDate = new Date(invoice.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                doc.fontSize(10)
                    .fillColor(colors.textLight)
                    .font('Helvetica')
                    .text(invoiceDate, pageWidth - 185, 100);

                // 2. STATUS SECTION
                let yPos = 200;
                const statusColor = invoice.status === 'paid' ? colors.success : colors.pending;
                const statusText = invoice.status === 'paid' ? 'PAID' : 'PENDING PAYMENT';
                const statusIcon = invoice.status === 'paid' ? '✓' : '⏳';

                drawRoundedRect(margin, yPos, contentWidth, 40, 20, statusColor, 0.1);

                doc.fontSize(24)
                    .fillColor(statusColor)
                    .font('Helvetica-Bold')
                    .text(statusIcon, margin + 15, yPos + 8);

                doc.fontSize(16)
                    .fillColor(statusColor)
                    .font('Helvetica-Bold')
                    .text(statusText, margin + 50, yPos + 12);

                if (invoice.status === 'paid' && invoice.paid_at) {
                    doc.fontSize(10)
                        .fillColor(colors.textLight)
                        .font('Helvetica')
                        .text(`Paid on ${new Date(invoice.paid_at).toLocaleDateString()}`, pageWidth - margin - 150, yPos + 15, {
                            width: 150,
                            align: 'right'
                        });
                }

                // 3. CLIENT INFORMATION SECTION
                yPos += 60;

                // Client info card
                drawShadowRect(margin, yPos, contentWidth, 120, 15, colors.white);
                drawGradientRect(margin, yPos, contentWidth, 40, colors.gradient1, colors.gradient2);

                doc.fontSize(14)
                    .fillColor(colors.white)
                    .font('Helvetica-Bold')
                    .text('CLIENT INFORMATION', margin + 20, yPos + 12);

                yPos += 50;

                // Client icon
                drawCircle(margin + 30, yPos + 20, 20, colors.lightGray);
                doc.fontSize(20)
                    .fillColor(colors.gradient1)
                    .text('👤', margin + 20, yPos + 10);

                // Client details
                doc.fontSize(16)
                    .fillColor(colors.textDark)
                    .font('Helvetica-Bold')
                    .text(invoice.clientName || invoice.client_name || 'Client Name', margin + 60, yPos + 5);

                if (invoice.clientEmail || invoice.client_email) {
                    const email = invoice.clientEmail || invoice.client_email;
                    if (email !== 'No email provided') {
                        doc.fontSize(12)
                            .fillColor(colors.textLight)
                            .font('Helvetica')
                            .text(`✉ ${email}`, margin + 60, yPos + 25);
                    }
                }

                // 4. SERVICE DETAILS SECTION
                yPos += 80;

                drawShadowRect(margin, yPos, contentWidth, 100, 15, colors.white);

                // Service header
                doc.fontSize(12)
                    .fillColor(colors.gradient1)
                    .font('Helvetica-Bold')
                    .text('SERVICE PROVIDED', margin + 20, yPos + 15);

                drawRoundedRect(margin + 15, yPos + 35, contentWidth - 30, 50, 10, colors.lightGray, 0.3);

                doc.fontSize(14)
                    .fillColor(colors.textDark)
                    .font('Helvetica')
                    .text(invoice.description, margin + 25, yPos + 45, {
                        width: contentWidth - 50,
                        align: 'left'
                    });

                // 5. CUSTOM FIELDS SECTION (if any)
                if (invoice.customFields && invoice.customFields.length > 0) {
                    yPos += 120;

                    drawShadowRect(margin, yPos, contentWidth, 30 + (invoice.customFields.length * 25), 15, colors.white);

                    doc.fontSize(12)
                        .fillColor(colors.gradient1)
                        .font('Helvetica-Bold')
                        .text('ADDITIONAL INFORMATION', margin + 20, yPos + 15);

                    let fieldY = yPos + 35;
                    invoice.customFields.forEach((field, index) => {
                        // Alternating background
                        if (index % 2 === 0) {
                            drawRoundedRect(margin + 15, fieldY - 5, contentWidth - 30, 20, 5, colors.lightGray, 0.2);
                        }

                        doc.fontSize(10)
                            .fillColor(colors.textLight)
                            .font('Helvetica-Bold')
                            .text(`${field.name}:`, margin + 25, fieldY);

                        doc.fontSize(10)
                            .fillColor(colors.textDark)
                            .font('Helvetica')
                            .text(field.value, margin + 150, fieldY);

                        fieldY += 25;
                    });

                    yPos += 30 + (invoice.customFields.length * 25);
                }

                // 6. AMOUNT SECTION - Eye-catching design
                yPos += 20;

                drawGradientRect(margin, yPos, contentWidth, 80, colors.primary, colors.accent);

                // Bitcoin icon
                doc.fontSize(40)
                    .fillColor(colors.white)
                    .font('Helvetica-Bold')
                    .text('₿', margin + 20, yPos + 20);

                // Amount
                doc.fontSize(32)
                    .fillColor(colors.white)
                    .font('Helvetica-Bold')
                    .text(`${invoice.amount.toLocaleString()} sats`, margin + 80, yPos + 25);

                // BTC equivalent
                const btcAmount = (invoice.amount / 100000000).toFixed(8);
                doc.fontSize(14)
                    .fillColor(colors.white)
                    .font('Helvetica')
                    .text(`≈ ${btcAmount} BTC`, pageWidth - margin - 150, yPos + 35, {
                        width: 140,
                        align: 'right'
                    });

                // 7. PAYMENT SECTION
                yPos += 100;

                if (invoice.lightning_invoice || invoice.lightningInvoice) {
                    const lightningInvoice = invoice.lightning_invoice || invoice.lightningInvoice;

                    // Payment section background
                    drawShadowRect(margin, yPos, contentWidth, 250, 15, colors.white);

                    // Lightning header
                    drawGradientRect(margin, yPos, contentWidth, 40, colors.gradient1, colors.gradient2);

                    doc.fontSize(16)
                        .fillColor(colors.white)
                        .font('Helvetica-Bold')
                        .text('⚡ LIGHTNING PAYMENT', margin + 20, yPos + 12);

                    yPos += 55;

                    // QR Code section
                    const qrSize = 160;
                    const qrX = margin + 20;
                    const qrY = yPos;

                    try {
                        // QR code with custom styling
                        const qrCodeBuffer = await QRCode.toBuffer(lightningInvoice, {
                            width: qrSize,
                            margin: 2,
                            color: {
                                dark: colors.dark,
                                light: colors.white
                            },
                            errorCorrectionLevel: 'H'
                        });

                        // QR code frame
                        drawGradientRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, colors.gradient1, colors.gradient2);
                        drawRoundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 10, colors.white);

                        doc.image(qrCodeBuffer, qrX, qrY, { width: qrSize });

                        // QR label
                        drawRoundedRect(qrX + 30, qrY + qrSize + 10, 100, 25, 12, colors.primary);
                        doc.fontSize(10)
                            .fillColor(colors.white)
                            .font('Helvetica-Bold')
                            .text('SCAN TO PAY', qrX + 30, qrY + qrSize + 17, {
                                width: 100,
                                align: 'center'
                            });

                    } catch (qrError) {
                        console.error('QR code generation error:', qrError);
                    }

                    // Instructions section
                    const instructX = qrX + qrSize + 30;

                    doc.fontSize(14)
                        .fillColor(colors.gradient1)
                        .font('Helvetica-Bold')
                        .text('How to Pay:', instructX, qrY);

                    const steps = [
                        { icon: '1️⃣', text: 'Open Lightning wallet' },
                        { icon: '2️⃣', text: 'Scan QR code' },
                        { icon: '3️⃣', text: 'Confirm amount' },
                        { icon: '4️⃣', text: 'Send payment' }
                    ];

                    let stepY = qrY + 25;
                    steps.forEach(step => {
                        drawRoundedRect(instructX - 5, stepY - 3, 200, 25, 12, colors.lightGray, 0.3);

                        doc.fontSize(12)
                            .fillColor(colors.primary)
                            .text(step.icon, instructX, stepY);

                        doc.fontSize(11)
                            .fillColor(colors.textDark)
                            .font('Helvetica')
                            .text(step.text, instructX + 25, stepY + 1);

                        stepY += 30;
                    });

                    // Compatible wallets
                    doc.fontSize(10)
                        .fillColor(colors.textLight)
                        .font('Helvetica-Bold')
                        .text('Compatible Wallets:', instructX, stepY + 5);

                    doc.fontSize(9)
                        .fillColor(colors.textLight)
                        .font('Helvetica')
                        .text('Alby • Zeus • Phoenix • Muun • BlueWallet', instructX, stepY + 20);
                }

                // 8. FOOTER SECTION
                const footerY = pageHeight - 100;

                // Footer background
                drawGradientRect(0, footerY, pageWidth, 100, colors.dark, '#000000');

                // Footer content
                doc.fontSize(10)
                    .fillColor(colors.white)
                    .font('Helvetica')
                    .text('This invoice was generated by', margin, footerY + 20);

                doc.fontSize(14)
                    .fillColor(colors.primary)
                    .font('Helvetica-Bold')
                    .text('⚡ Quickvoicy', margin, footerY + 35);

                doc.fontSize(8)
                    .fillColor(colors.white)
                    .font('Helvetica')
                    .text('Lightning-fast professional invoicing', margin, footerY + 55);

                // Invoice details in footer
                doc.fontSize(8)
                    .fillColor(colors.white)
                    .text(`Invoice ID: ${invoice.id}`, pageWidth - margin - 200, footerY + 20, {
                        width: 200,
                        align: 'right'
                    });

                doc.fontSize(8)
                    .fillColor(colors.white)
                    .text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 200, footerY + 35, {
                        width: 200,
                        align: 'right'
                    });

                if (invoice.paymentHash) {
                    doc.fontSize(8)
                        .fillColor(colors.white)
                        .text(`Hash: ${invoice.paymentHash.substring(0, 16)}...`, pageWidth - margin - 200, footerY + 50, {
                            width: 200,
                            align: 'right'
                        });
                }

                // Watermark for pending invoices
                if (invoice.status !== 'paid') {
                    doc.save();
                    doc.translate(pageWidth / 2, pageHeight / 2)
                        .rotate(-45)
                        .fontSize(60)
                        .fillColor(colors.pending, 0.1)
                        .font('Helvetica-Bold')
                        .text('AWAITING PAYMENT', -200, 0, {
                            width: 400,
                            align: 'center'
                        });
                    doc.restore();
                }

                // Finalize PDF
                doc.end();

                // Wait for PDF to be completely written
                writeStream.on('finish', () => {
                    if (fs.existsSync(filepath) && fs.statSync(filepath).size > 0) {
                        console.log(`✅ Beautiful PDF generated: ${filepath}`);
                        resolve(filepath);
                    } else {
                        reject(new Error('PDF file was not created properly'));
                    }
                });

                writeStream.on('error', (error) => {
                    console.error('❌ PDF write stream error:', error);
                    reject(error);
                });

            } catch (error) {
                console.error('❌ PDF generation error:', error);
                reject(error);
            }
        });
    }

    static async generateReceiptPDF(invoice) {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: { top: 0, bottom: 0, left: 0, right: 0 }
                });

                const filename = `receipt-${invoice.id}.pdf`;
                const tempDir = join(__dirname, 'temp');
                const filepath = join(tempDir, filename);

                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }

                const writeStream = createWriteStream(filepath);
                doc.pipe(writeStream);

                const colors = {
                    success: '#00D632',
                    primary: '#F7931A',
                    dark: '#1a1a2e',
                    white: '#ffffff',
                    gradient1: '#00b09b',
                    gradient2: '#96c93d'
                };

                const pageWidth = doc.page.width;
                const pageHeight = doc.page.height;
                const margin = 40;
                const contentWidth = pageWidth - (margin * 2);

                // Helper functions
                const drawGradientRect = (x, y, width, height, color1, color2) => {
                    const gradient = doc.linearGradient(x, y, x, y + height);
                    gradient.stop(0, color1).stop(1, color2);
                    doc.save()
                        .rect(x, y, width, height)
                        .fill(gradient)
                        .restore();
                };

                const drawRoundedRect = (x, y, width, height, radius, color, opacity = 1) => {
                    doc.save()
                        .fillColor(color, opacity)
                        .roundedRect(x, y, width, height, radius)
                        .fill()
                        .restore();
                };

                // Header with success gradient
                drawGradientRect(0, 0, pageWidth, 150, colors.gradient1, colors.gradient2);

                // Success checkmark circle
                doc.save()
                    .fillColor(colors.white)
                    .circle(pageWidth / 2, 75, 40)
                    .fill()
                    .restore();

                doc.fontSize(40)
                    .fillColor(colors.success)
                    .text('✓', pageWidth / 2 - 15, 55);

                doc.fontSize(24)
                    .fillColor(colors.white)
                    .font('Helvetica-Bold')
                    .text('PAYMENT CONFIRMED', 0, 110, {
                        width: pageWidth,
                        align: 'center'
                    });

                // Receipt details section
                let yPos = 180;

                drawRoundedRect(margin, yPos, contentWidth, 200, 15, colors.white);
                doc.save()
                    .strokeColor('#e0e0e0')
                    .lineWidth(1)
                    .roundedRect(margin, yPos, contentWidth, 200, 15)
                    .stroke()
                    .restore();

                yPos += 30;

                doc.fontSize(18)
                    .fillColor(colors.dark)
                    .font('Helvetica-Bold')
                    .text('PAYMENT RECEIPT', margin + 20, yPos);

                yPos += 40;

                // Receipt info
                const receiptData = [
                    { label: 'Receipt Number:', value: `#${invoice.id.substring(0, 8).toUpperCase()}` },
                    { label: 'Payment Date:', value: new Date().toLocaleDateString() },
                    { label: 'Amount Paid:', value: `${invoice.amount.toLocaleString()} sats`, highlight: true },
                    { label: 'Service:', value: invoice.description },
                    { label: 'Client:', value: invoice.clientName || invoice.client_name }
                ];

                receiptData.forEach(item => {
                    doc.fontSize(12)
                        .fillColor('#666')
                        .font('Helvetica')
                        .text(item.label, margin + 20, yPos);

                    if (item.highlight) {
                        doc.fontSize(14)
                            .fillColor(colors.primary)
                            .font('Helvetica-Bold')
                            .text(item.value, margin + 150, yPos - 1);
                    } else {
                        doc.fontSize(12)
                            .fillColor(colors.dark)
                            .font('Helvetica')
                            .text(item.value, margin + 150, yPos);
                    }

                    yPos += 25;
                });

                // Thank you message
                yPos += 40;
                drawGradientRect(margin, yPos, contentWidth, 80, colors.primary, colors.gradient2);

                doc.fontSize(20)
                    .fillColor(colors.white)
                    .font('Helvetica-Bold')
                    .text('Thank You!', 0, yPos + 20, {
                        width: pageWidth,
                        align: 'center'
                    });

                doc.fontSize(12)
                    .fillColor(colors.white)
                    .font('Helvetica')
                    .text('Your payment has been successfully processed', 0, yPos + 50, {
                        width: pageWidth,
                        align: 'center'
                    });

                // Footer
                const footerY = pageHeight - 80;

                doc.fontSize(10)
                    .fillColor(colors.dark)
                    .font('Helvetica')
                    .text('This receipt was generated by', margin, footerY);

                doc.fontSize(14)
                    .fillColor(colors.primary)
                    .font('Helvetica-Bold')
                    .text('⚡ Quickvoicy', margin, footerY + 15);

                doc.fontSize(8)
                    .fillColor('#999')
                    .text('Keep this receipt for your records', pageWidth - margin - 150, footerY + 20, {
                        width: 150,
                        align: 'right'
                    });

                doc.end();

                writeStream.on('finish', () => {
                    resolve(filepath);
                });

                writeStream.on('error', (error) => {
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    static cleanup(filepath) {
        try {
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                console.log(`🧹 Cleaned up: ${filepath}`);
            }
        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    }
}

// Enhanced bot integration
async function sendInvoiceWithPDF(bot, chatId, invoice, message) {
    try {
        // Send the initial message if provided
        if (message) {
            await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
        }

        // Show PDF generation progress with style
        const progressMsg = await bot.sendMessage(chatId,
            '🎨 <b>Creating Your Beautiful Invoice...</b>\n\n' +
            '⚡ Generating Lightning payment...\n' +
            '🎯 Adding invoice details...\n' +
            '📄 Designing PDF layout...',
            { parse_mode: 'HTML' }
        );

        // Generate PDF with all data properly formatted
        const pdfPath = await PDFService.generateInvoicePDF({
            id: invoice.id,
            amount: invoice.amount,
            description: invoice.description,
            clientName: invoice.clientName || invoice.client_name,
            clientEmail: invoice.clientEmail || invoice.client_email,
            customFields: invoice.customFields || [],
            lightning_invoice: invoice.lightningInvoice || invoice.lightning_invoice,
            lightningInvoice: invoice.lightningInvoice || invoice.lightning_invoice,
            paymentHash: invoice.paymentHash || invoice.payment_hash,
            created_at: invoice.created_at || new Date().toISOString(),
            status: invoice.status || 'pending',
            paid_at: invoice.paid_at
        });

        // Update progress
        await bot.editMessageText(
            '✨ <b>Your Professional Invoice is Ready!</b>\n\n' +
            '📤 Sending PDF document...',
            {
                chat_id: chatId,
                message_id: progressMsg.message_id,
                parse_mode: 'HTML'
            }
        );

        // Send the beautiful PDF
        await bot.sendDocument(chatId, pdfPath, {
            caption: `📄 <b>Professional Lightning Invoice</b>\n\n` +
                `💼 Client: <code>${invoice.clientName || invoice.client_name}</code>\n` +
                `💰 Amount: <code>${invoice.amount} sats</code>\n` +
                `🎯 Invoice: <code>#${invoice.id.substring(0, 8)}</code>\n\n` +
                `⚡ <i>Share this PDF with your client for instant Lightning payment!</i>`,
            parse_mode: 'HTML'
        });

        // Delete progress message
        await bot.deleteMessage(chatId, progressMsg.message_id);

        // Cleanup after delay
        setTimeout(() => {
            PDFService.cleanup(pdfPath);
        }, 3000);

        return true;

    } catch (error) {
        console.error('❌ Error in sendInvoiceWithPDF:', error);

        try {
            await bot.sendMessage(chatId,
                '❌ <b>PDF Generation Issue</b>\n\n' +
                '⚠️ Unable to create the PDF at this moment.\n' +
                '💡 Your Lightning invoice is still valid and can be shared directly.',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔄 Retry PDF', callback_data: `view_pdf_${invoice.id}` }],
                            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                        ]
                    }
                }
            );
        } catch (sendError) {
            console.error('❌ Error sending error message:', sendError);
        }

        return false;
    }
}

export default PDFService;
export { sendInvoiceWithPDF };