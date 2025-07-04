const { nwc } = require('@getalby/sdk');
const { generatePrivateKey, bytesToHex } = require('@noble/secp256k1');

class NWCService {
    constructor(nwcUrl) {
        const url = new URL(nwcUrl);
        const walletPubkey = url.searchParams.get('pubkey');
        const relay = url.searchParams.get('relay');
        const secret = url.searchParams.get('secret');

        if (!walletPubkey || !relay) {
            throw new Error('Invalid NWC URL');
        }

        this.client = new nwc.NWCClient({
            relay,
            secret: secret || bytesToHex(generatePrivateKey()),
            walletPubkey,
        });
    }

    async connect() {
        await this.client.connect();
    }

    async disconnect() {
        await this.client.disconnect();
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

module.exports = NWCService;