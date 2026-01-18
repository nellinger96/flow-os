import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { DollarSign, AlertCircle, ArrowRight, Calendar } from 'lucide-react'

export default function Invoices() {
    const [invoices, setInvoices] = useState([])
    const [metrics, setMetrics] = useState({ totalOutstanding: 0, overdueCount: 0 })
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        fetchInvoices()
    }, [])

    async function fetchInvoices() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // SECURITY LOCK: Only fetch my clients
        const { data: clients } = await supabase
            .from('customers')
            .select('id, full_name, job_price, service_data, status')
            .eq('user_id', user.id) // <--- CRITICAL SECURITY FIX
            .order('created_at', { ascending: false })

        if (clients) {
            const processed = clients.map(client => {
                const s = client.service_data || {}
                
                // 1. Calculate Total Job Price
                // Try the main column, then try calculating from service_data
                let total = parseFloat(client.job_price)
                if (isNaN(total) || total === 0) {
                    total = (parseFloat(s.price_per_head) || 0) * (parseFloat(s.guest_count) || 0)
                }

                // 2. Calculate Paid Amount (Using the "Safe Mode" keys from Directory)
                let paidAmount = 0
                
                // Payment 1 (Deposit)
                const p1Amount = parseFloat(s.payment_1_amount || s.deposit_amount || 0)
                const p1Paid = (s.payment_1_status || s.deposit_status || '').toLowerCase() === 'paid'
                if (p1Paid) paidAmount += p1Amount

                // Payment 2 (Final)
                const p2Amount = parseFloat(s.payment_2_amount || s.final_payment_amount || 0)
                const p2Paid = (s.payment_2_status || s.final_payment_status || '').toLowerCase() === 'paid'
                if (p2Paid) paidAmount += p2Amount

                // Check for Payment Plan Array (Legacy support)
                if (paidAmount === 0 && Array.isArray(s.payment_plan)) {
                     paidAmount = s.payment_plan.reduce((sum, item) => item.paid ? sum + (parseFloat(item.amount) || 0) : sum, 0)
                }

                const balance = total - paidAmount
                
                // Date handling (Safe Mode)
                const eventDate = s.event_date || s.service_date || 'TBD'
                
                // Determine Status
                let status = 'Unpaid'
                if (balance <= 0 && total > 0) status = 'Paid'
                else if (paidAmount > 0) status = 'Partial'

                return {
                    id: client.id,
                    name: client.full_name,
                    date: eventDate,
                    total: total || 0,
                    paid: paidAmount,
                    balance: balance > 0 ? balance : 0,
                    status
                }
            })

            setInvoices(processed)

            // Calculate Metrics
            const outstanding = processed.reduce((sum, inv) => sum + inv.balance, 0)
            const count = processed.filter(inv => inv.balance > 0).length
            
            setMetrics({ totalOutstanding: outstanding, overdueCount: count })
            setLoading(false)
        }
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            
            {/* HEADER */}
            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Financial Overview</h1>
                    <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Track payments and outstanding balances.</p>
                </div>
            </div>

            {/* METRICS CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                
                {/* OUTSTANDING */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                        <div style={{ background: '#fee2e2', padding: '10px', borderRadius: '8px', color: '#ef4444' }}><AlertCircle size={24}/></div>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>Outstanding Revenue</span>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#ef4444' }}>${metrics.totalOutstanding.toLocaleString()}</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '5px' }}>Across {metrics.overdueCount} active jobs</div>
                </div>

                {/* TOTAL REVENUE */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                        <div style={{ background: '#dcfce7', padding: '10px', borderRadius: '8px', color: '#16a34a' }}><DollarSign size={24}/></div>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>Total Job Value</span>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b' }}>
                        ${invoices.reduce((sum, i) => sum + i.total, 0).toLocaleString()}
                    </div>
                </div>

            </div>

            {/* INVOICE TABLE */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#334155' }}>Client Balances</h3>
                </div>

                {loading ? <div style={{padding:'40px', textAlign:'center', color:'#94a3b8'}}>Loading financials...</div> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '15px 20px', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Client</th>
                                <th style={{ textAlign: 'left', padding: '15px 20px', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Event Date</th>
                                <th style={{ textAlign: 'left', padding: '15px 20px', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Status</th>
                                <th style={{ textAlign: 'right', padding: '15px 20px', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Total</th>
                                <th style={{ textAlign: 'right', padding: '15px 20px', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Paid</th>
                                <th style={{ textAlign: 'right', padding: '15px 20px', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Balance Due</th>
                                <th style={{ width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No invoices found. Add clients to see data here.</td>
                                </tr>
                            )}
                            {invoices.map((inv) => (
                                <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '15px 20px', fontWeight: 'bold', color: '#1e293b' }}>
                                        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                            <div style={{width:'32px', height:'32px', borderRadius:'50%', background:'#e2e8f0', color:'#64748b', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px'}}>
                                                {inv.name.charAt(0)}
                                            </div>
                                            {inv.name}
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px 20px', color: '#64748b' }}>
                                        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                                            <Calendar size={14}/> {inv.date}
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px 20px' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                                            background: inv.status === 'Paid' ? '#dcfce7' : inv.status === 'Partial' ? '#fef3c7' : '#fee2e2',
                                            color: inv.status === 'Paid' ? '#166534' : inv.status === 'Partial' ? '#b45309' : '#b91c1c'
                                        }}>
                                            {inv.status === 'Paid' ? 'Paid in Full' : inv.status === 'Partial' ? 'Partial' : 'Unpaid'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right', color: '#64748b' }}>${inv.total.toLocaleString()}</td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right', color: '#16a34a', fontWeight: 'bold' }}>${inv.paid.toLocaleString()}</td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right', fontWeight: 'bold', color: inv.balance > 0 ? '#ef4444' : '#cbd5e1' }}>
                                        {inv.balance > 0 ? `$${inv.balance.toLocaleString()}` : '-'}
                                    </td>
                                    <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                                        <button 
                                            onClick={() => navigate('/clients')} 
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}
                                            title="View Details"
                                        >
                                            <ArrowRight size={18} color="#64748b" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}