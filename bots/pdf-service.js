const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

class PDFService {
    static async generateInvoicePDF(invoice) {
        const doc = new PDFDocument();
        const filename = `invoice-${invoice.id}.pdf`;
        const filepath = path.join(__dirname, 'temp', filename);

        // Ensure temp directory exists
        if (!fs.existsSync(path.join(__dirname, 'temp'))) {
            fs.mkdirSync(path.join(__dirname, 'temp'));
        }

        doc.pipe(fs.createWriteStream(filepath));

        // Header
        doc.fontSize(24)
            .fillColor('#FFC107')
            .text('⚡ Quickvoicy', 50, 50);

        // Invoice details
        doc.fontSize(12)
            .fillColor('#000000')
            .text(`Invoice #${invoice.id}`, 50, 100)
            .text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 50, 120);

        // Client info
        doc.fontSize(14)
            .text('Bill To:', 50, 150)
            .fontSize(12)
            .text(invoice.client_name, 50, 170)
            .text(invoice.client_email, 50, 190);

        // Description
        doc.fontSize(14)
            .text('Description:', 50, 220)
            .fontSize(12)
            .text(invoice.description, 50, 240);

        // Amount
        doc.fontSize(16)
            .text(`Amount: ${invoice.amount} sats`, 50, 270);

        // QR Code
        if (invoice.lightning_invoice) {
            const qrCodeBuffer = await QRCode.toBuffer(invoice.lightning_invoice);
            doc.image(qrCodeBuffer, 50, 310, { width: 150 });

            doc.fontSize(10)
                .text('Scan to pay with Lightning', 50, 470);
        }

        // Status
        doc.fontSize(12)
            .fillColor(invoice.status === 'paid' ? '#00FF00' : '#FF0000')
            .text(`Status: ${invoice.status.toUpperCase()}`, 50, 500);

        doc.end();

        return filepath;
    }

    static cleanup(filepath) {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
    }
}

module.exports = PDFService;