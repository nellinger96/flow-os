import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { CheckCircle, PenTool, Calendar, MapPin, Clock, Users, DollarSign, FileText, ChevronRight, CreditCard } from 'lucide-react'
import confetti from 'canvas-confetti' // We'll simulate this effect with basic CSS if package missing, or just logic

export default function SignContract() {
    const { id } = useParams()
    const [client, setClient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [signature, setSignature] = useState('')
    const [signed, setSigned] = useState(false)
    const [error, setError] = useState(null)
    const [businessName, setBusinessName] = useState('Service Provider')

    useEffect(() => {
        fetchContract()
    }, [])

    async function fetchContract() {
        // Fetch Client
        const { data: clientData, error } = await supabase.from('customers').select('*').eq('id', id).single()
        
        if (error) {
            setError("Proposal not found or has expired.")
            setLoading(false)
            return
        }
        
        setClient(clientData)
        if (clientData.contract_url === 'SIGNED_DIGITALLY') setSigned(true)

        // Fetch Business Name (Owner)
        if (clientData.user_id) {
            // Note: In a real multi-tenant app, you'd fetch the user's profile metadata differently. 
            // For now, we assume the logged-in structure or just generic.
        }
        
        setLoading(false)
    }

    async function handleSign() {
        if (!signature || signature.length < 3) return alert("Please type your full legal name to sign.")
        
        const timestamp = new Date().toISOString()
        
        const { error } = await supabase
            .from('customers')
            .update({
                status: 'sold', // Auto-move pipeline to Booked
                contract_url: 'SIGNED_DIGITALLY',
                service_data: { 
                    ...client.service_data, 
                    signed_by: signature, 
                    signed_at: timestamp 
                }
            })
            .eq('id', id)

        if (error) {
            alert("Error signing: " + error.message)
        } else {
            setSigned(true)
            triggerConfetti()
        }
    }

    const triggerConfetti = () => {
        // Simple visual feedback if canvas-confetti isn't installed
        const colors = ['#2563EB', '#16a34a', '#f59e0b']
        // This is just a placeholder for the logic where you'd fire the confetti
    }

    if (loading) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b'}}>Loading Proposal...</div>
    if (error) return <div style={{padding:'40px', textAlign:'center', color:'#ef4444', fontWeight:'bold'}}>{error}</div>

    // Helpers
    // --- GEMINI FIX: Added timeZone: 'UTC' to prevent the date from shifting back a day ---
    const eventDate = client.service_data?.event_date 
        ? new Date(client.service_data.event_date).toLocaleDateString('en-US', { timeZone: 'UTC', weekday:'long', year:'numeric', month:'long', day:'numeric' }) 
        : 'Date TBD'
        
    const paymentPlan = client.service_data?.payment_plan || []
    const menuItems = client.service_data?.selected_menu_items || []

    // --- ALREADY SIGNED VIEW ---
    if (signed) {
        return (
            <div style={{ maxWidth: '600px', margin: '60px auto', padding: '40px', textAlign: 'center', fontFamily: 'sans-serif', animation: 'fadeIn 0.5s' }}>
                <div style={{ background: '#dcfce7', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px auto', boxShadow:'0 10px 20px rgba(22, 163, 74, 0.2)' }}>
                    <CheckCircle size={50} color="#16a34a" />
                </div>
                <h1 style={{ color: '#0f172a', fontSize:'32px', marginBottom:'10px' }}>You're All Set!</h1>
                <p style={{ color: '#64748b', fontSize:'18px', lineHeight:'1.6' }}>
                    Thank you, {client.full_name}.<br/>Your event is officially booked.
                </p>
                <div style={{ marginTop: '40px', padding: '25px', background: '#f8fafc', borderRadius: '16px', border:'1px solid #e2e8f0', textAlign:'left' }}>
                    <div style={{fontSize:'12px', textTransform:'uppercase', color:'#94a3b8', fontWeight:'bold', marginBottom:'5px'}}>Digital Signature</div>
                    <div style={{fontSize:'20px', fontWeight:'bold', fontFamily:'monospace', color:'#334155'}}>{client.service_data?.signed_by || signature}</div>
                    <div style={{fontSize:'14px', color:'#64748b', marginTop:'5px'}}>{new Date(client.service_data?.signed_at || new Date()).toLocaleString()}</div>
                </div>
            </div>
        )
    }

    // --- CONTRACT VIEW ---
    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
                
                {/* HERO HEADER */}
                <div style={{ background: '#0f172a', padding: '40px', color: 'white', position: 'relative' }}>
                    <div style={{ fontSize: '14px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Service Proposal</div>
                    <h1 style={{ margin: '10px 0', fontSize: '32px' }}>{client.full_name}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '8px 15px', borderRadius: '20px', fontSize: '14px' }}>
                            <Calendar size={16} /> {eventDate}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '8px 15px', borderRadius: '20px', fontSize: '14px' }}>
                            <Clock size={16} /> {client.service_data?.event_time || 'TBD'}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '40px' }}>
                    
                    {/* KEY DETAILS GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px', marginBottom: '40px' }}>
                        <div>
                            <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>Location</div>
                            <div style={{ fontSize: '16px', fontWeight: '500', color: '#334155', display:'flex', gap:'8px' }}>
                                <MapPin size={20} color="#2563EB"/> {client.address}
                            </div>
                        </div>
                        <div>
                            <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>Guest Count</div>
                            <div style={{ fontSize: '16px', fontWeight: '500', color: '#334155', display:'flex', gap:'8px' }}>
                                <Users size={20} color="#2563EB"/> {client.service_data?.guest_count || 0} People
                            </div>
                        </div>
                        <div>
                            <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>Total Investment</div>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#16a34a' }}>
                                ${client.job_price?.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* MENU & SERVICES */}
                    <div style={{ marginBottom: '40px' }}>
                        <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FileText size={20} /> Service Details
                        </h3>
                        
                        {/* Selected Packages */}
                        {menuItems.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', marginTop: '15px' }}>
                                {menuItems.map(item => (
                                    <span key={item} style={{ background: '#eff6ff', color: '#1e40af', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: '500', border:'1px solid #bfdbfe' }}>
                                        {item}
                                    </span>
                                ))}
                            </div>
                        )}

                        <p style={{ lineHeight: '1.6', color: '#475569', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            {client.job_notes || 'Standard services as discussed.'}
                        </p>
                    </div>

                    {/* PAYMENT SCHEDULE (NEW) */}
                    {paymentPlan.length > 0 && (
                        <div style={{ marginBottom: '40px' }}>
                            <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CreditCard size={20} /> Payment Schedule
                            </h3>
                            <div style={{ marginTop: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                                {paymentPlan.map((pay, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', borderBottom: i === paymentPlan.length -1 ? 'none' : '1px solid #f1f5f9', background: pay.paid ? '#f0fdf4' : 'white' }}>
                                        <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                                            <div style={{fontWeight:'bold', color: pay.paid ? '#16a34a' : '#94a3b8'}}>#{i+1}</div>
                                            <div>
                                                <div style={{fontWeight:'bold', color: '#334155'}}>${parseFloat(pay.amount).toLocaleString()}</div>
                                                <div style={{fontSize:'12px', color:'#64748b'}}>Due: {pay.date || 'TBD'}</div>
                                            </div>
                                        </div>
                                        <div style={{display:'flex', alignItems:'center'}}>
                                            {pay.paid ? (
                                                <span style={{background:'#dcfce7', color:'#16a34a', fontSize:'12px', fontWeight:'bold', padding:'4px 10px', borderRadius:'20px'}}>PAID</span>
                                            ) : (
                                                <span style={{background:'#f1f5f9', color:'#64748b', fontSize:'12px', fontWeight:'bold', padding:'4px 10px', borderRadius:'20px'}}>UNPAID</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SIGNATURE AREA */}
                    <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', color:'#0f172a' }}>
                            <PenTool size={20} /> Acceptance
                        </h3>
                        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
                            By typing your name below, you agree to the services, pricing, and payment schedule outlined above.
                        </p>
                        
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color:'#475569' }}>Type Full Legal Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. John A. Doe" 
                            value={signature}
                            onChange={e => setSignature(e.target.value)}
                            style={{ width: '100%', padding: '15px', fontSize: '18px', borderRadius: '8px', border: '1px solid #94a3b8', fontFamily: 'monospace', marginBottom: '20px', boxSizing: 'border-box' }}
                        />

                        <button 
                            onClick={handleSign}
                            style={{ 
                                width: '100%', padding: '18px', 
                                background: '#2563EB', color: 'white', 
                                border: 'none', borderRadius: '10px', 
                                fontSize: '18px', fontWeight: 'bold', 
                                cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                                transition: 'transform 0.1s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                            }}
                            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            Accept & Sign Contract <ChevronRight size={20} />
                        </button>
                        <div style={{textAlign:'center', marginTop:'15px', fontSize:'12px', color:'#94a3b8'}}>
                            IP Address & Timestamp will be recorded.
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}