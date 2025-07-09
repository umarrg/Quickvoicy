import sqlite3 from 'sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { verbose } = sqlite3;
const sqlite = verbose();

class Database {
    constructor() {
        this.db = new sqlite.Database(process.env.DATABASE_PATH || join(__dirname, 'quickvoicy.db'));
        this.init();
    }

    init() {
        this.db.serialize(() => {
            // Users table
            this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          platform TEXT NOT NULL,
          platform_id TEXT NOT NULL,
          nwc_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(platform, platform_id)
        )
      `);

            // Invoices table
            this.db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          amount INTEGER NOT NULL,
          description TEXT NOT NULL,
          client_name TEXT NOT NULL,
          client_email TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          lightning_invoice TEXT,
          payment_hash TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          paid_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);
        });
    }

    // User methods
    async getUser(platform, platformId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE platform = ? AND platform_id = ?',
                [platform, platformId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async createUser(platform, platformId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO users (platform, platform_id) VALUES (?, ?)',
                [platform, platformId],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async updateUserNWC(userId, nwcUrl) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET nwc_url = ? WHERE id = ?',
                [nwcUrl, userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // Invoice methods
    async createInvoice(invoice) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO invoices (id, user_id, amount, description, client_name, client_email, lightning_invoice, payment_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    invoice.id,
                    invoice.userId,
                    invoice.amount,
                    invoice.description,
                    invoice.clientName,
                    invoice.clientEmail,
                    invoice.lightningInvoice,
                    invoice.paymentHash
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async getUserInvoices(userId, limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
                [userId, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async updateInvoiceStatus(invoiceId, status) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE invoices SET status = ?, paid_at = ? WHERE id = ?',
                [status, status === 'paid' ? new Date().toISOString() : null, invoiceId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async getUserStats(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT 
          COUNT(*) as total_invoices,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_earned
         FROM invoices WHERE user_id = ?`,
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async getPendingInvoices() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM invoices WHERE status = "pending"',
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async getUserById(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }
}

export default new Database();