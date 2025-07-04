const db = require('./db');
const NWCService = require('./nwc-service');

class PaymentMonitor {
    constructor() {
        this.checkInterval = 30000; // Check every 30 seconds
    }

    async start() {
        console.log('Payment monitor started...');
        setInterval(() => this.checkPendingInvoices(), this.checkInterval);
    }

    async checkPendingInvoices() {
        try {
            const pendingInvoices = await db.getPendingInvoices();

            for (const invoice of pendingInvoices) {
                const user = await db.getUserById(invoice.user_id);
                if (!user || !user.nwc_url) continue;

                try {
                    const nwc = new NWCService(user.nwc_url);
                    await nwc.connect();

                    const isPaid = await nwc.checkPayment(invoice.payment_hash);

                    if (isPaid) {
                        await db.updateInvoiceStatus(invoice.id, 'paid');
                        console.log(`Invoice ${invoice.id} marked as paid`);
                    }

                    await nwc.disconnect();
                } catch (error) {
                    console.error(`Error checking invoice ${invoice.id}:`, error);
                }
            }
        } catch (error) {
            console.error('Error in payment monitor:', error);
        }
    }
}
module.exports = PaymentMonitor;