import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { DollarSign, FileText, AlertCircle, CheckCircle, ArrowRight, Calendar } from 'lucide-react'

export default function Invoices() {
    const [invoices, setInvoices] = useState([])
    const [metrics, setMetrics] = useState({ totalOutstanding: 0, overdueCount: 0 })
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        fetchInvoices()
    }, [])

    async function fetchInvoices() {
        // Get all clients with their payment plans and pricing
        const { data: clients } = await supabase
            .from('customers')
            .select('id, full_name, job_price, service_data, status')
            .order('created_at', { ascending: false })

        if (clients) {
            const processed = clients.map(client => {
                const total = parseFloat(client.job_price) || 0
                const plan = client.service_data?.payment_plan || []
                
                // Calculate how much they have paid
                const paidAmount = plan.reduce((sum, item) => item.paid ? sum + (parseFloat(item.amount) || 0) : sum, 0)
                const balance = total - paidAmount
                const eventDate = client.service_data?.event_date || 'TBD'
                
                // Determine status
                let status = 'Unpaid'
                if (balance <= 0 && total > 0) status = 'Paid'
                else if (paidAmount > 0) status = 'Partial'

                return {
                    id: client.id,
                    name: client.full_name,
                    date: eventDate,
                    total,
                    paid: paidAmount,
                    balance,
                    status
                }
            })

            // Filter to show only active jobs (optional, but good for focus) or just all
            setInvoices(processed)

            // Calculate Metrics
            const outstanding = processed.reduce((sum, inv) => sum + (inv.balance > 0 ? inv.balance : 0), 0)
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
                
                {/* CARD 1: OUTSTANDING */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                        <div style={{ background: '#fee2e2', padding: '10px', borderRadius: '8px', color: '#ef4444' }}><AlertCircle size={24}/></div>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>Outstanding Revenue</span>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#ef4444' }}>${metrics.totalOutstanding.toLocaleString()}</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '5px' }}>Across {metrics.overdueCount} active jobs</div>
                </div>

                {/* CARD 2: TOTAL REVENUE (Just a simple sum for context) */}
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
                                            onClick={() => navigate(`/clients?id=${inv.id}`)} // This query param trick requires updating Clients.jsx to handle auto-select, or just link to directory
                                            // Simpler approach for now:
                                            // onClick={() => navigate('/clients')} 
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