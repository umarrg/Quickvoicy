import { create } from 'zustand'
import { persist } from 'zustand/middleware'





export const useInvoiceStore = create()(
    persist(
        (set) => ({
            invoices: [],
            connected: false,
            nwcUrl: null,
            stats: {
                totalEarned: 0,
                totalInvoices: 0,
                paidInvoices: 0,
            },
            addInvoice: (invoice) =>
                set((state) => ({
                    invoices: [invoice, ...state.invoices],
                    stats: {
                        ...state.stats,
                        totalInvoices: state.stats.totalInvoices + 1,
                    },
                })),
            updateInvoiceStatus: (id, status) =>
                set((state) => {
                    const invoice = state.invoices.find((inv) => inv.id === id)
                    if (!invoice) return state

                    const updatedInvoices = state.invoices.map((inv) =>
                        inv.id === id ? { ...inv, status } : inv
                    )

                    const paidInvoices = updatedInvoices.filter(
                        (inv) => inv.status === 'paid'
                    ).length
                    const totalEarned = updatedInvoices
                        .filter((inv) => inv.status === 'paid')
                        .reduce((sum, inv) => sum + inv.amount, 0)

                    return {
                        invoices: updatedInvoices,
                        stats: {
                            ...state.stats,
                            paidInvoices,
                            totalEarned,
                        },
                    }
                }),
            setConnected: (connected, nwcUrl) =>
                set({ connected, nwcUrl: nwcUrl || null }),
            clearData: () =>
                set({
                    invoices: [],
                    connected: false,
                    nwcUrl: null,
                    stats: {
                        totalEarned: 0,
                        totalInvoices: 0,
                        paidInvoices: 0,
                    },
                }),
        }),
        {
            name: 'quickvoicy-storage',
        }
    )
)
