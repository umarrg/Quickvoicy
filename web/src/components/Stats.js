'use client'

import { useInvoiceStore } from '@/lib/store'

export default function Stats() {
    const { stats } = useInvoiceStore()

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Earned
                </h3>
                <p className="mt-2 text-3xl font-bold text-yellow-600">
                    {stats.totalEarned.toLocaleString()} sats
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Invoices
                </h3>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.totalInvoices}
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Paid Invoices
                </h3>
                <p className="mt-2 text-3xl font-bold text-green-600">
                    {stats.paidInvoices}
                </p>
            </div>
        </div>
    )
}