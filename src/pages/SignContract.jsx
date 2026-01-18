import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { CheckCircle, PenTool, Calendar, MapPin, Clock, Users, FileText, ChevronRight, CreditCard, ShieldAlert, Utensils } from 'lucide-react'
import confetti from 'canvas-confetti' 

export default function SignContract() {
    const { id } = useParams()
    const [client, setClient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [signature, setSignature] = useState('')
    const [signed, setSigned] = useState(false)
    const [error, setError] = useState(null)
    const [agreedToTerms, setAgreedToTerms] = useState(false)

    useEffect(() => {
        fetchContract()
    }, [])

    async function fetchContract() {
        const { data: clientData, error } = await supabase.from('customers').select('*').eq('id', id).single()
        
        if (error) {
            setError("Proposal not found or has expired.")
            setLoading(false)
            return
        }
        
        setClient(clientData)
        if (clientData.contract_url === 'SIGNED_DIGITALLY') setSigned(true)
        setLoading(false)
    }

    async function handleSign() {
        if (!agreedToTerms) return alert("Please read and accept the Terms & Conditions.")
        if (!signature || signature.length < 3) return alert("Please type your full legal name to sign.")
        
        const timestamp = new Date().toISOString()
        
        const { error } = await supabase
            .from('customers')
            .update({
                status: 'sold', 
                contract_url: 'SIGNED_DIGITALLY',
                service_data: { 
                    ...client.service_data, 
                    signed_by: signature, 
                    signed_at: timestamp,
                    terms_accepted: true
                }
            })
            .eq('id', id)

        if (error) {
            alert("Error signing: " + error.message)
        } else {
            setSigned(true)
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
        }
    }

    if (loading) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b'}}>Loading Proposal...</div>
    if (error) return <div style={{padding:'40px', textAlign:'center', color:'#ef4444', fontWeight:'bold'}}>{error}</div>

    // --- DATA EXTRACTION HELPERS ---
    const eventDate = client.service_data?.event_date 
        ? new Date(client.service_data.event_date).toLocaleDateString('en-US', { timeZone: 'UTC', weekday:'long', year:'numeric', month:'long', day:'numeric' }) 
        : 'Date TBD'
        
    const paymentPlan = client.service_data?.payment_plan || []

    // --- MENU LOGIC (Attempting to find the data) ---
    // We try all common variations. If none work, the DEBUG BOX below will tell us why.
    const serviceData = client.service_data || {}
    const menuData = serviceData.menu || serviceData.menu_configuration || serviceData
    
    // Check capitalization variations
    const entrees = menuData.entrees || menuData.Entrees || serviceData.Entrees || []
    const sides = menuData.sides || menuData.Sides || serviceData.Sides || []
    const drinks = menuData.drinks || menuData.Drinks || serviceData.Drinks || []
    const legacyMenu = serviceData.selected_menu_items || []
    
    const hasMenu = entrees.length > 0 || sides.length > 0 || drinks.length > 0 || legacyMenu.length > 0

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
            </div>
        )
    }

    // --- CONTRACT VIEW ---
    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
                
                {/* HERO HEADER */}
                <div style={{ background: '#0f172a', padding: '40px', color: 'white', position: 'relative' }}>
                    <h1 style={{ margin: '10px 0', fontSize: '32px' }}>{client.full_name}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '8px 15px', borderRadius: '20px', fontSize: '14px' }}>
                            <Calendar size={16} /> {eventDate}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '40px' }}>
                    
                    {/* KEY DETAILS GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px', marginBottom: '40px' }}>
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
                            <Utensils size={20} /> Service Details
                        </h3>
                        
                        {/* Dynamic Menu Display */}
                        {hasMenu ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
                                
                                {entrees.length > 0 && (
                                    <div>
                                        <div style={{fontSize:'12px', fontWeight:'bold', color:'#94a3b8', textTransform:'uppercase', marginBottom:'8px'}}>Entrees</div>
                                        {entrees.map((item, i) => (
                                            <div key={i} style={{marginBottom:'5px', fontWeight:'500', color:'#334155'}}>• {item}</div>
                                        ))}
                                    </div>
                                )}

                                {sides.length > 0 && (
                                    <div>
                                        <div style={{fontSize:'12px', fontWeight:'bold', color:'#94a3b8', textTransform:'uppercase', marginBottom:'8px'}}>Sides</div>
                                        {sides.map((item, i) => (
                                            <div key={i} style={{marginBottom:'5px', fontWeight:'500', color:'#334155'}}>• {item}</div>
                                        ))}
                                    </div>
                                )}

                                {drinks.length > 0 && (
                                    <div>
                                        <div style={{fontSize:'12px', fontWeight:'bold', color:'#94a3b8', textTransform:'uppercase', marginBottom:'8px'}}>Drinks</div>
                                        {drinks.map((item, i) => (
                                            <div key={i} style={{marginBottom:'5px', fontWeight:'500', color:'#334155'}}>• {item}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ margin: '15px 0', fontSize: '14px', color: '#94a3b8', fontStyle: 'italic' }}>
                                No specific menu items listed (General Service).
                            </div>
                        )}

                        <p style={{ marginTop: '25px', lineHeight: '1.6', color: '#475569', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <strong>Notes: </strong>
                            {client.job_notes || 'Standard services as discussed.'}
                        </p>
                    </div>

                    {/* --- DEBUG BOX: REMOVE THIS AFTER FIXING --- */}
                    <div style={{ background: '#222', color: '#0f0', padding: '20px', borderRadius: '10px', marginTop: '50px', fontSize: '12px', overflowX: 'auto' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>DEBUG MODE: DATABASE DATA</h4>
                        <pre>{JSON.stringify(client.service_data, null, 2)}</pre>
                    </div>
                    {/* ----------------------------------------- */}

                    {/* PAYMENT SCHEDULE */}
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
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TERMS & SIGNATURE (Simplified for Debug) */}
                     <div style={{ marginTop: '30px' }}>
                        <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldAlert size={20} /> Terms & Conditions
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                            <input 
                                type="checkbox" 
                                id="terms" 
                                checked={agreedToTerms} 
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                            />
                            <label htmlFor="terms" style={{ fontSize: '14px', color: '#334155', cursor: 'pointer' }}>I have read and agree to the Terms & Conditions.</label>
                        </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '16px', border: '1px dashed #cbd5e1', marginTop: '20px' }}>
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
                                background: agreedToTerms ? '#2563EB' : '#94a3b8', 
                                color: 'white', 
                                border: 'none', borderRadius: '10px', 
                                fontSize: '18px', fontWeight: 'bold', 
                                cursor: agreedToTerms ? 'pointer' : 'not-allowed',
                            }}
                            disabled={!agreedToTerms}
                        >
                            Accept & Sign Contract
                        </button>
                    </div>

                </div>
            </div>
        </div>
    )
}