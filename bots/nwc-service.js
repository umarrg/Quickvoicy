import 'websocket-polyfill';
import { nwc } from '@getalby/sdk';
import * as crypto from 'crypto';

class NWCService {
    constructor(nwcUrl) {
        const url = new URL(nwcUrl);
        const walletPubkey = url.hostname;
        const searchParams = new URLSearchParams(url.search);
        const relayUrl = searchParams.get('relay');

        if (!walletPubkey || !relayUrl) {
            throw new Error('Invalid NWC URL: missing pubkey or relay');
        }

        this.client = new nwc.NWCClient({
            nostrWalletConnectUrl: nwcUrl
        });
    }

    async connect() {
        // NWC client handles connection internally
        return true;
    }

    async disconnect() {
        this.client.close();
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

export default NWCService;