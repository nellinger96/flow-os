import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { DollarSign, AlertCircle, ArrowRight, Calendar, Clock } from 'lucide-react'
import { formatDate, todayISO } from '../lib/format'
import { paymentSummary } from '../lib/payments'

const STATUS_STYLE = {
    Paid: { label: 'Paid in Full', bg: '#dcfce7', fg: '#166534' },
    Overdue: { label: 'Overdue', bg: '#fee2e2', fg: '#b91c1c' },
    Partial: { label: 'Partial', bg: '#fef3c7', fg: '#b45309' },
    Unpaid: { label: 'Unpaid', bg: '#f1f5f9', fg: '#475569' },
}

export default function Invoices() {
    const [invoices, setInvoices] = useState([])
    const [metrics, setMetrics] = useState({ totalOutstanding: 0, owingCount: 0, overdueTotal: 0, overdueCount: 0 })
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        fetchInvoices()
    }, [])

    async function fetchInvoices() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // SECURITY LOCK: Only fetch my clients. Only booked (sold) jobs are owed money;
        // leads, tastings and proposals are quotes, not invoices.
        const { data: clients } = await supabase
            .from('customers')
            .select('id, full_name, job_price, service_data, status')
            .eq('user_id', user.id) // <--- CRITICAL SECURITY FIX
            .eq('status', 'sold')
            .order('created_at', { ascending: false })

        if (clients) {
            const today = todayISO()

            const processed = clients.map(client => {
                const m = paymentSummary(client, today)
                return {
                    id: client.id,
                    name: client.full_name || '—',
                    date: client.service_data?.event_date || client.service_data?.service_date || '',
                    total: m.total,
                    paid: m.paid,
                    balance: m.balance,
                    overdueAmount: m.overdueAmount,
                    nextDue: m.nextDue,
                    status: m.status,
                }
            })

            // Overdue first, then whatever is due soonest, then paid-up jobs
            const rank = { Overdue: 0, Partial: 1, Unpaid: 1, Paid: 2 }
            processed.sort((a, b) =>
                rank[a.status] - rank[b.status] ||
                (a.nextDue?.date || '9999').localeCompare(b.nextDue?.date || '9999')
            )

            setInvoices(processed)

            const owing = processed.filter(inv => inv.balance > 0)
            const overdue = processed.filter(inv => inv.overdueAmount > 0)
            setMetrics({
                totalOutstanding: owing.reduce((sum, inv) => sum + inv.balance, 0),
                owingCount: owing.length,
                overdueTotal: overdue.reduce((sum, inv) => sum + inv.overdueAmount, 0),
                overdueCount: overdue.length,
            })
        }
        setLoading(false)
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
                
                {/* OVERDUE */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                        <div style={{ background: '#fee2e2', padding: '10px', borderRadius: '8px', color: '#ef4444' }}><AlertCircle size={24}/></div>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>Overdue</span>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: metrics.overdueTotal > 0 ? '#ef4444' : '#1e293b' }}>${metrics.overdueTotal.toLocaleString()}</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '5px' }}>
                        {metrics.overdueCount === 0 ? 'Nothing past due' : `${metrics.overdueCount} ${metrics.overdueCount === 1 ? 'client' : 'clients'} past due`}
                    </div>
                </div>

                {/* STILL OWED */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                        <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '8px', color: '#d97706' }}><Clock size={24}/></div>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>Still Owed</span>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b' }}>${metrics.totalOutstanding.toLocaleString()}</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '5px' }}>Across {metrics.owingCount} booked {metrics.owingCount === 1 ? 'job' : 'jobs'}</div>
                </div>

                {/* TOTAL BOOKED */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                        <div style={{ background: '#dcfce7', padding: '10px', borderRadius: '8px', color: '#16a34a' }}><DollarSign size={24}/></div>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>Total Booked</span>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b' }}>
                        ${invoices.reduce((sum, i) => sum + i.total, 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '5px' }}>
                        ${invoices.reduce((sum, i) => sum + i.paid, 0).toLocaleString()} collected
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
                                <th style={{ textAlign: 'left', padding: '15px 20px', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Next Payment</th>
                                <th style={{ textAlign: 'right', padding: '15px 20px', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Total</th>
                                <th style={{ textAlign: 'right', padding: '15px 20px', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Paid</th>
                                <th style={{ textAlign: 'right', padding: '15px 20px', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Balance Due</th>
                                <th style={{ width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No booked jobs yet. Mark a client as Sold to see their balance here.</td>
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
                                            <Calendar size={14}/> {formatDate(inv.date, 'en') || inv.date || 'TBD'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px 20px' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap',
                                            background: STATUS_STYLE[inv.status].bg,
                                            color: STATUS_STYLE[inv.status].fg
                                        }}>
                                            {STATUS_STYLE[inv.status].label}
                                        </span>
                                    </td>
                                    <td style={{ padding: '15px 20px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                        {inv.nextDue ? (
                                            <>
                                                <div style={{ fontWeight: 'bold', color: '#1e293b' }}>${inv.nextDue.amount.toLocaleString()}</div>
                                                <div style={{ color: inv.nextDue.late ? '#b91c1c' : '#64748b', fontWeight: inv.nextDue.late ? 'bold' : 'normal' }}>
                                                    {inv.nextDue.date
                                                        ? `${inv.nextDue.late ? 'Was due' : 'Due'} ${formatDate(inv.nextDue.date, 'en', { month: 'short', day: 'numeric' }) || inv.nextDue.date}`
                                                        : 'No due date set'}
                                                </div>
                                            </>
                                        ) : <span style={{ color: '#cbd5e1' }}>-</span>}
                                    </td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right', color: '#64748b' }}>${inv.total.toLocaleString()}</td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right', color: '#16a34a', fontWeight: 'bold' }}>${inv.paid.toLocaleString()}</td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right', fontWeight: 'bold', color: inv.balance > 0 ? '#ef4444' : '#cbd5e1' }}>
                                        {inv.balance > 0 ? `$${inv.balance.toLocaleString()}` : '-'}
                                    </td>
                                    <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                                        <button 
                                            onClick={() => navigate(`/clients?id=${inv.id}`)} 
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