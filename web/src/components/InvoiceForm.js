'use client'

import { useState } from 'react'
import { useInvoiceStore } from '@/lib/store'
import { NWCClient } from '@/lib/nwc'
import toast from 'react-hot-toast'

export default function InvoiceForm() {
    const { addInvoice, connected, nwcUrl } = useInvoiceStore()
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        clientName: '',
        clientEmail: '',
    })

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!connected || !nwcUrl) {
            toast.error('Please connect your wallet first')
            return
        }

        try {
            const client = new NWCClient(nwcUrl)
            await client.connect()

            const lightningInvoice = await client.createInvoice(
                parseInt(formData.amount),
                formData.description
            )

            const invoice = {
                id: Date.now().toString(),
                amount: parseInt(formData.amount),
                description: formData.description,
                clientName: formData.clientName,
                clientEmail: formData.clientEmail,
                createdAt: new Date().toISOString(),
                status: 'pending',
                lightningInvoice,
                paymentHash: lightningInvoice.split(':')[1]?.substring(0, 64),
            }

            addInvoice(invoice)
            toast.success('Invoice created successfully!')

            // Reset form
            setFormData({
                amount: '',
                description: '',
                clientName: '',
                clientEmail: '',
            })
        } catch (error) {
            toast.error('Failed to create invoice')
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-6">Create New Invoice</h2>

                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Amount (sats)
                        </label>
                        <input
                            type="number"
                            required
                            value={formData.amount}
                            onChange={(e) =>
                                setFormData({ ...formData, amount: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                            placeholder="1000"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                            placeholder="Logo design"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Client Name
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.clientName}
                            onChange={(e) =>
                                setFormData({ ...formData, clientName: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Client Email
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.clientEmail}
                            onChange={(e) =>
                                setFormData({ ...formData, clientEmail: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                            placeholder="john@example.com"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!connected}
                    className="mt-6 w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-black px-6 py-3 rounded-lg font-medium transition"
                >
                    Create Invoice
                </button>
            </div>
        </form>
    )
}
