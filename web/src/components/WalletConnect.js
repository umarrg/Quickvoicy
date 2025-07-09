'use client'

import { useState } from 'react'
import { useInvoiceStore } from '@/lib/store'
import { NWCClient } from '@/lib/nwc'
import toast from 'react-hot-toast'

export default function WalletConnect() {
    const { connected, setConnected } = useInvoiceStore()
    const [showModal, setShowModal] = useState(false)
    const [nwcUrl, setNwcUrl] = useState('')

    const handleConnect = async () => {
        try {
            const client = new NWCClient(nwcUrl)
            await client.connect()
            setConnected(true, nwcUrl)
            setShowModal(false)
            toast.success('Wallet connected successfully!')
        } catch (error) {
            console.log("err", error)
            toast.error('Failed to connect wallet. Please check your NWC URL.')
        }
    }

    const handleDisconnect = () => {
        setConnected(false)
        toast.success('Wallet disconnected')
    }

    return (
        <>
            {connected ? (
                <button
                    onClick={handleDisconnect}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
                >
                    Disconnect Wallet
                </button>
            ) : (
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg transition"
                >
                    Connect Wallet
                </button>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-4">Connect NWC Wallet</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Enter your Nostr Wallet Connect URL to enable Lightning payments
                        </p>
                        <input
                            type="text"
                            value={nwcUrl}
                            onChange={(e) => setNwcUrl(e.target.value)}
                            placeholder="nostr+walletconnect://..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <div className="flex gap-4">
                            <button
                                onClick={handleConnect}
                                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg transition"
                            >
                                Connect
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition"
                            >
                                Cancel
                            </button>
                        </div>
                        <div className="mt-4 text-sm text-gray-500">
                            <p>Get NWC URL from:</p>
                            <ul className="list-disc list-inside">
                                <li>Alby</li>
                                <li>Zeus</li>
                                <li>Mutiny Wallet</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}