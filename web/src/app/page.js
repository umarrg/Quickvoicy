'use client'

import { useState, useEffect } from 'react'
import { useInvoiceStore } from '@/lib/store'
import InvoiceForm from '@/components/InvoiceForm'
import InvoiceList from '@/components/InvoiceList'
import WalletConnect from '@/components/WalletConnect'
import Stats from '@/components/Stats'

export default function Home() {
  const [activeTab, setActiveTab] = useState('create')
  const { connected } = useInvoiceStore()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                ⚡ Quickvoicy
              </h1>
              <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">
                Lightning-fast invoicing
              </span>
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!connected && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
            <p className="text-yellow-800 dark:text-yellow-200">
              Connect your Lightning wallet to start creating invoices
            </p>
          </div>
        )}

        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('create')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'create'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Create Invoice
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'invoices'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Invoices
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'stats'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Stats
            </button>
          </nav>
        </div>

        {activeTab === 'create' && <InvoiceForm />}
        {activeTab === 'invoices' && <InvoiceList />}
        {activeTab === 'stats' && <Stats />}
      </main>
    </div>
  )
}

