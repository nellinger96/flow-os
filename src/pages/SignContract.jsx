import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Loader2, CheckCircle, Calendar, Clock, MapPin, Users, FileText } from 'lucide-react'

export default function SignContract() {
    const { id } = useParams()
    const [client, setClient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [signed, setSigned] = useState(false)

    useEffect(() => {
        fetchContract()
    }, [])

    async function fetchContract() {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single()

        if (data) {
            setClient(data)
            if (data.status === 'booked') setSigned(true)
        }
        setLoading(false)
    }

    async function handleSign() {
        if (!confirm("By clicking OK, you agree to the terms and authorize this contract.")) return

        const { error } = await supabase
            .from('customers')
            .update({ status: 'booked' }) // Change status to Booked
            .eq('id', id)

        if (!error) {
            setSigned(true)
            alert("Contract Signed! We are ready to serve you.")
        } else {
            alert("Error signing: " + error.message)
        }
    }

    // --- HELPER: CONVERT 24H TIME TO AM/PM ---
    function formatTime(time24) {
        if (!time24) return ''
        let [hours, minutes] = time24.split(':').map(Number)
        const ampm = hours >= 12 ? 'PM' : 'AM'
        const h12 = hours % 12 || 12
        return `${h12}:${minutes.toString().padStart(2, '0')} ${ampm}`
    }

    // --- DISPLAY RANGE ---
    function getServiceRange(start, end) {
        if (!start) return 'Time TBD'
        const startFormatted = formatTime(start)
        const endFormatted = end ? formatTime(end) : '(End TBD)'
        return `${startFormatted} - ${endFormatted}`
    }

    if (loading) return <div style={{display:'flex', justifyContent:'center', marginTop:'50px'}}><Loader2 className="spin" /></div>

    if (!client) return <div style={{textAlign:'center', marginTop:'50px'}}>Contract not found.</div>

    // Shortcuts for cleaner JSX
    const s = client.service_data || {}

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif', color: '#1e293b' }}>
            
            {/* HEADER */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '10px' }}>{client.full_name}</h1>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={18}/> {s.service_date || 'TBD'}</div>
                    
                    {/* UPDATED TIME DISPLAY */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={18}/> 
                        {getServiceRange(s.service_time, s.service_end_time)}
                    </div>
                </div>
            </div>

            {/* MAIN CARD */}
            <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                
                {/* SUMMARY BAR */}
                <div style={{ padding: '30px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '1px' }}>Location</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', fontWeight: '500' }}>
                            <MapPin size={16} color="#2563EB"/> {client.address}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '1px' }}>Guest Count</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', fontWeight: '500' }}>
                            <Users size={16} color="#2563EB"/> {s.guest_count || 0} People
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '1px' }}>Total Investment</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginTop: '2px' }}>${client.job_price}</div>
                    </div>
                </div>

                {/* MENU & NOTES */}
                <div style={{ padding: '30px' }}>
                    <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}><FileText size={20}/> Service Details</h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#64748b', fontSize: '12px' }}>ENTREES</div>
                            {s.menu_entrees?.map(item => <div key={item} style={{marginBottom:'4px'}}>• {item}</div>)}
                        </div>
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#64748b', fontSize: '12px' }}>SIDES</div>
                            {s.menu_sides?.map(item => <div key={item} style={{marginBottom:'4px'}}>• {item}</div>)}
                        </div>
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#64748b', fontSize: '12px' }}>DRINKS</div>
                            {s.menu_drinks?.map(item => <div key={item} style={{marginBottom:'4px'}}>• {item}</div>)}
                        </div>
                    </div>

                    {/* NOTES SECTION */}
                    <div style={{ background: '#fffbeb', padding: '20px', borderRadius: '12px', border: '1px solid #fcd34d' }}>
                        <div style={{ fontWeight: 'bold', color: '#b45309', marginBottom: '5px', fontSize: '13px' }}>CUSTOMIZATIONS / NOTES</div>
                        <div style={{ color: '#451a03', lineHeight: '1.6' }}>
                            {s.notes || "No additional notes provided."}
                        </div>
                    </div>
                </div>

                {/* SIGNATURE AREA */}
                <div style={{ padding: '30px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                    {signed ? (
                        <div style={{ padding: '20px', background: '#dcfce7', color: '#166534', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '10px', fontWeight: 'bold' }}>
                            <CheckCircle size={24} /> Contract Signed & Confirmed
                        </div>
                    ) : (
                        <div>
                            <p style={{ marginBottom: '20px', color: '#64748b', fontSize: '14px' }}>
                                By signing below, you agree to the service details and total price listed above.
                            </p>
                            <button 
                                onClick={handleSign}
                                style={{ background: '#2563EB', color: 'white', fontSize: '18px', fontWeight: 'bold', padding: '15px 40px', borderRadius: '50px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)' }}
                            >
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