import { nwc } from '@getalby/sdk';

export class NWCClient {
    constructor(nwcUrl) {
        const url = new URL(nwcUrl);

        // Parse the same way as your working Telegram bot
        const walletPubkey = url.hostname;  // Get pubkey from hostname
        const searchParams = new URLSearchParams(url.search);
        const relayUrl = searchParams.get('relay');
        const secret = searchParams.get('secret');

        if (!walletPubkey || !relayUrl) {
            throw new Error('Invalid NWC URL: missing pubkey or relay');
        }

        // Use the same initialization pattern as your working bot
        this.client = new nwc.NWCClient({
            nostrWalletConnectUrl: nwcUrl  // Pass the full URL like in your bot
        });
    }

    async connect() {
        // NWC client handles connection internally
        return true;
    }

    async disconnect() {
        this.client.close();  // Use close() like in your bot
    }

    async createInvoice(amount, description) {
        const result = await this.client.makeInvoice({
            amount,
            description,
        });
        return result.invoice;
    }

    async checkPayment(paymentHash) {
        try {
            const result = await this.client.lookupInvoice({
                payment_hash: paymentHash,
            });
            return result.paid;
        } catch (error) {
            return false;
        }
    }
}