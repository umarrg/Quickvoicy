import jsPDF from 'jspdf'
import QRCode from 'qrcode'

export async function generateInvoicePDF(invoice) {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(24)
    doc.setTextColor(255, 193, 7) // Yellow
    doc.text('⚡ Quickvoicy', 20, 20)

    // Invoice details
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(`Invoice #${invoice.id}`, 20, 40)
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 20, 50)

    // Client info
    doc.setFontSize(14)
    doc.text('Bill To:', 20, 70)
    doc.setFontSize(12)
    doc.text(invoice.clientName, 20, 80)
    doc.text(invoice.clientEmail, 20, 90)

    // Description
    doc.setFontSize(14)
    doc.text('Description:', 20, 110)
    doc.setFontSize(12)
    doc.text(invoice.description, 20, 120)

    // Amount
    doc.setFontSize(16)
    doc.text(`Amount: ${invoice.amount} sats`, 20, 140)

    // QR Code
    if (invoice.lightningInvoice) {
        const qrCodeDataUrl = await QRCode.toDataURL(invoice.lightningInvoice)
        doc.addImage(qrCodeDataUrl, 'PNG', 20, 160, 60, 60)

        // Payment instructions
        doc.setFontSize(10)
        doc.text('Scan to pay with Lightning', 20, 230)

        // Lightning invoice (truncated)
        doc.setFontSize(8)
        const truncatedInvoice = invoice.lightningInvoice.substring(0, 50) + '...'
        doc.text(truncatedInvoice, 20, 240)
    }

    // Status
    doc.setFontSize(12)
    doc.setTextColor(invoice.status === 'paid' ? 0 : 255, invoice.status === 'paid' ? 255 : 0, 0)
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, 260)

    return doc
}
