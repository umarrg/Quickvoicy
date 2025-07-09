'use client'

import { useInvoiceStore } from '@/lib/store'
import { generateInvoicePDF } from '@/lib/pdf'
import toast from 'react-hot-toast'

export default function InvoiceList() {
    const { invoices } = useInvoiceStore()

    const handleDownloadPDF = async (invoice) => {
        try {
            const pdf = await generateInvoicePDF(invoice)
            pdf.save(`invoice-${invoice.id}.pdf`)
            toast.success('PDF downloaded!')
        } catch (error) {
            toast.error('Failed to generate PDF')
        }
    }

    const handleCopyInvoice = (lightningInvoice) => {
        navigator.clipboard.writeText(lightningInvoice)
        toast.success('Lightning invoice copied!')
    }

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold">Invoices</h2>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {invoices.length === 0 ? (
                    <p className="p-6 text-gray-500 dark:text-gray-400">
                        No invoices yet. Create your first invoice!
                    </p>
                ) : (
                    invoices.map((invoice) => (
                        <div key={invoice.id} className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-medium">{invoice.description}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {invoice.clientName} • {invoice.clientEmail}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {new Date(invoice.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-semibold">{invoice.amount} sats</p>
                                    <span
                                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${invoice.status === 'paid'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                            }`}
                                    >
                                        {invoice.status}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={() => handleDownloadPDF(invoice)}
                                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm transition"
                                >
                                    Download PDF
                                </button>
                                {invoice.lightningInvoice && invoice.status === 'pending' && (
                                    <button
                                        onClick={() => handleCopyInvoice(invoice.lightningInvoice)}
                                        className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800 rounded text-sm transition"
                                    >
                                        Copy Lightning Invoice
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}