import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Loader2, CheckCircle, Calendar, Clock, MapPin, Users, FileText, DollarSign, PenTool } from 'lucide-react'

export default function SignContract() {
    const { id } = useParams()
    const [client, setClient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [signed, setSigned] = useState(false)
    
    // Signature State
    const [signatureName, setSignatureName] = useState('')

    useEffect(() => { fetchContract() }, [])

    async function fetchContract() {
        const { data } = await supabase.from('customers').select('*').eq('id', id).single()
        if (data) {
            setClient(data)
            if (data.status === 'booked') setSigned(true)
        }
        setLoading(false)
    }

    async function handleSign() {
        if (!signatureName.trim()) return alert("Please type your full name to sign.")
        if (!confirm("By clicking OK, you agree to these terms and authorize the service.")) return
        
        const { error } = await supabase
            .from('customers')
            .update({ 
                status: 'booked',
                // Optional: You could save the signature name to a new column in the future
                // signature: signatureName 
            })
            .eq('id', id)
            
        if (!error) {
            setSigned(true)
            alert("Contract Signed! Thank you.")
        }
    }

    function formatTime(time24) {
        if (!time24) return ''
        let [hours, minutes] = time24.split(':').map(Number)
        const ampm = hours >= 12 ? 'PM' : 'AM'
        const h12 = hours % 12 || 12
        return `${h12}:${minutes.toString().padStart(2, '0')} ${ampm}`
    }

    function getServiceRange(start, end) {
        if (!start) return 'Time TBD'
        return `${formatTime(start)} - ${end ? formatTime(end) : 'End TBD'}`
    }

    if (loading) return <div style={{display:'flex', justifyContent:'center', marginTop:'50px'}}><Loader2 className="spin" /></div>
    if (!client) return <div>Contract not found.</div>

    const s = client.service_data || {}

    return (
        <div style={{ maxWidth: '800px', margin: '40px auto', fontFamily: 'sans-serif', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            
            {/* 1. DARK HEADER */}
            <div style={{ background: '#0f172a', color: 'white', padding: '40px', textAlign: 'center' }}>
                <div style={{textTransform:'uppercase', fontSize:'12px', letterSpacing:'2px', opacity:0.7, marginBottom:'10px'}}>Service Agreement</div>
                <h1 style={{ fontSize: '32px', margin: '0 0 10px 0', fontWeight: '800' }}>{client.full_name}</h1>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                        <Calendar size={16} /> {s.service_date || 'Date TBD'}
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                        <Clock size={16} /> {getServiceRange(s.service_time, s.service_end_time)}
                    </div>
                </div>
            </div>

            {/* 2. SUMMARY GRID */}
            <div style={{ background: 'white', padding: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Location</div>
                    <div style={{ marginTop: '5px', fontWeight: '500', color: '#334155', display: 'flex', gap: '5px' }}>
                        <MapPin size={18} color="#2563EB" /> {client.address || 'Address TBD'}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Guest Count</div>
                    <div style={{ marginTop: '5px', fontWeight: '500', color: '#334155', display: 'flex', gap: '5px' }}>
                        <Users size={18} color="#2563EB" /> {s.guest_count || 0} People
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Total Investment</div>
                    <div style={{ marginTop: '5px', fontWeight: '800', color: '#059669', fontSize: '24px' }}>${client.job_price || 0}</div>
                </div>
            </div>

            <div style={{ padding: '40px', background: 'white' }}>
                
                {/* 3. MENU */}
                <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={20} /> Service Details
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
                    {['Entrees', 'Sides', 'Drinks'].map(cat => (
                        <div key={cat}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase' }}>{cat}</div>
                            {(s[`menu_${cat.toLowerCase()}`] || []).map(item => (
                                <div key={item} style={{ marginBottom: '5px', fontSize: '14px', color: '#334155' }}>• {item}</div>
                            ))}
                            {(!s[`menu_${cat.toLowerCase()}`] || s[`menu_${cat.toLowerCase()}`].length === 0) && <div style={{color:'#cbd5e1', fontSize:'13px'}}>None selected</div>}
                        </div>
                    ))}
                </div>

                {/* 4. NOTES */}
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>CUSTOMIZATIONS / NOTES</div>
                    <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.5' }}>
                        {s.notes || "Standard service as discussed."}
                    </div>
                </div>

                {/* 5. PAYMENTS */}
                <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <DollarSign size={20} /> Payment Schedule
                </h3>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
                    <div style={{ flex: 1, padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Deposit Due: {s.deposit_date || 'TBD'}</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155' }}>${s.deposit_amount || '0'}</div>
                    </div>
                    <div style={{ flex: 1, padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Final Due: {s.final_payment_date || 'TBD'}</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155' }}>${s.final_payment_amount || '0'}</div>
                    </div>
                </div>

                {/* 6. TERMS AND CONDITIONS (ADDED BACK) */}
                <div style={{ marginBottom: '40px' }}>
                     <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Terms & Conditions</h3>
                     <div style={{ height: '150px', overflowY: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px', fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
                        <p><strong>1. Deposit & Payment:</strong> A non-refundable deposit is required to secure the date. The remaining balance is due on or before the event date as specified in the payment schedule.</p>
                        <p><strong>2. Service Time:</strong> Service will be provided for the specific hours listed above. Additional hours may be requested for an additional fee.</p>
                        <p><strong>3. Cancellations:</strong> Cancellations made less than 7 days prior to the event may forfeit the full deposit.</p>
                        <p><strong>4. Leftovers:</strong> Any leftover food deemed safe for consumption will be left with the client in disposable containers.</p>
                        <p><strong>5. Setup:</strong> The caterer will arrive approximately 1 hour prior to service time for setup.</p>
                        <p><strong>6. Liability:</strong> The client is responsible for providing a safe environment for service staff.</p>
                     </div>
                </div>

                {/* 7. SIGNATURE BOX (ADDED BACK) */}
                <div style={{ padding: '30px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', borderRadius: '12px' }}>
                    {signed ? (
                        <div style={{ textAlign:'center' }}>
                            <div style={{ color: '#16a34a', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize:'20px' }}>
                                <CheckCircle size={28} /> Contract Signed
                            </div>
                            <div style={{ color: '#64748b', marginTop: '5px' }}>Thank you for your business.</div>
                        </div>
                    ) : (
                        <div style={{ textAlign:'center' }}>
                            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display:'block', marginBottom:'8px' }}>TYPE FULL NAME TO SIGN</label>
                                <input 
                                    value={signatureName}
                                    onChange={e => setSignatureName(e.target.value)}
                                    placeholder="e.g. John Doe"
                                    style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', boxSizing:'border-box', fontFamily: 'monospace' }}
                                />
                            </div>
                            <button 
                                onClick={handleSign}
                                disabled={!signatureName}
                                style={{ 
                                    background: signatureName ? '#2563EB' : '#94a3b8', 
                                    color: 'white', 
                                    padding: '15px 40px', 
                                    borderRadius: '30px', 
                                    border: 'none', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold', 
                                    cursor: signatureName ? 'pointer' : 'not-allowed', 
                                    boxShadow: signatureName ? '0 4px 15px rgba(37, 99, 235, 0.3)' : 'none',
                                    transition: '0.2s'
                                }}
                            >
                                <PenTool size={18} style={{ marginRight:'8px', display:'inline-block', verticalAlign:'text-bottom' }} />
                                Sign & Accept Contract
                            </button>
                        </div>
                    )}
                </div>

            </div>
            
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}