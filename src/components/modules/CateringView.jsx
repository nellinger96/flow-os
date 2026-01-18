import { Calendar, Clock, Users, DollarSign, Trash2, Link as LinkIcon, ExternalLink, CheckCircle, FileText } from 'lucide-react'

export default function CateringView({ formData, setFormData, clientId }) {
    
    // SAFETY CHECK: Ensure service_data exists
    const s = formData.service_data || {}
    
    // CONTRACT URL
    const contractUrl = `${window.location.origin}/sign/${clientId}`
    
    // CHECK SIGNED STATUS (Case insensitive)
    const status = (formData.status || '').toLowerCase()
    const isSigned = status === 'booked'

    // --- HELPER: SAVE DATA ---
    function updateServiceData(field, value) {
        setFormData({
            ...formData,
            service_data: {
                ...(formData.service_data || {}), 
                [field]: value
            }
        })
    }

    // --- HELPER: MENU TOGGLE ---
    function toggleMenuItem(category, item) {
        const currentList = s[category] || []
        const newList = currentList.includes(item)
            ? currentList.filter(i => i !== item)
            : [...currentList, item]
        updateServiceData(category, newList)
    }

    // --- HELPER: PAID/UNPAID TOGGLE (Using OLD keys) ---
    function togglePaid(field) {
        const current = s[field] || 'unpaid'
        const newVal = current === 'paid' ? 'unpaid' : 'paid'
        updateServiceData(field, newVal)
    }

    // --- HELPER: DATE FORMATTER ---
    // Fixes "01/19/2026" (Old) -> "2026-01-19" (New)
    function safeDate(val) {
        if (!val) return ''
        if (val.includes('/')) {
            const parts = val.split('/') // Assumes MM/DD/YYYY
            if (parts.length === 3) return `${parts[2]}-${parts[0]}-${parts[1]}`
        }
        return val
    }

    // --- DATA RECOVERY: PRIORITIZE OLD KEYS ---
    // This forces the app to look for your EXISTING data first
    const eventDate = safeDate(s.event_date || s.service_date)
    const startTime = s.start_time || s.service_time
    const endTime = s.end_time || s.service_end_time
    
    const pay1_date = safeDate(s.payment_1_date || s.deposit_date)
    const pay1_amount = s.payment_1_amount || s.deposit_amount
    const pay1_status = s.payment_1_status || s.deposit_status || 'unpaid'
    
    const pay2_date = safeDate(s.payment_2_date || s.final_payment_date)
    const pay2_amount = s.payment_2_amount || s.final_payment_amount
    const pay2_status = s.payment_2_status || s.final_payment_status || 'unpaid'

    return (
        <div style={{ display: 'grid', gap: '20px' }}>
            
            {/* 1. STATUS BAR */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'15px' }}>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px', textTransform: 'uppercase' }}>Tracking Status</div>
                    <div style={{ display: 'flex', gap: '5px', background: '#f1f5f9', padding: '5px', borderRadius: '8px' }}>
                        {['lead', 'tasting', 'proposal', 'booked'].map(step => (
                            <button 
                                key={step}
                                onClick={() => setFormData({ ...formData, status: step })}
                                style={{ 
                                    padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize', 
                                    background: status === step ? (step === 'booked' ? '#16a34a' : '#2563EB') : 'transparent', 
                                    color: status === step ? 'white' : '#64748b'
                                }}
                            >
                                {step}
                            </button>
                        ))}
                    </div>
                </div>

                {isSigned && (
                    <div style={{ padding:'8px 12px', background:'#dcfce7', color:'#166534', borderRadius:'8px', display:'flex', alignItems:'center', gap:'8px', fontWeight:'bold', fontSize:'13px' }}>
                        <CheckCircle size={16} /> Contract Signed
                    </div>
                )}
            </div>

            {/* 2. EVENT DETAILS (Restored) */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' }}>
                    
                    {/* Date */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Event Date</label>
                        <input type="date" value={eventDate} onChange={e => updateServiceData('event_date', e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                    </div>

                    {/* Start Time */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Start Time</label>
                        <input type="time" value={startTime} onChange={e => updateServiceData('start_time', e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                    </div>

                    {/* End Time (Optional) */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>End Time</label>
                        <input type="time" value={endTime} onChange={e => updateServiceData('end_time', e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                    </div>

                    {/* Guest Count */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Guest Count</label>
                        <input type="number" placeholder="0" value={s.guest_count || ''} onChange={e => updateServiceData('guest_count', e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                    </div>
                </div>

                {/* Calculator */}
                <div style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>Price Per Head ($)</label>
                        <input type="number" value={s.price_per_head || ''} onChange={e => updateServiceData('price_per_head', e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div style={{ flex: 1.5 }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563EB' }}>Total</label>
                        <div style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '6px', border: '1px solid #2563EB', color: '#2563EB', fontWeight: 'bold', background: 'white' }}>
                            ${(parseFloat(s.price_per_head || 0) * parseFloat(s.guest_count || 0)).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. PAYMENT SCHEDULE (Restored Paid/Unpaid Buttons) */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#334155' }}>Payment Schedule</h3>
                
                {/* Payment 1 */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', width: '60px' }}>#1 Deposit</span>
                    <input type="date" value={pay1_date} onChange={e => updateServiceData('payment_1_date', e.target.value)} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                    <div style={{ position: 'relative', flex: 1 }}>
                        <DollarSign size={14} style={{ position: 'absolute', left: '8px', top: '10px', color: '#94a3b8' }} />
                        <input placeholder="Amount" value={pay1_amount} onChange={e => updateServiceData('payment_1_amount', e.target.value)} style={{ width: '100%', padding: '8px 8px 8px 25px', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                    <button 
                        onClick={() => togglePaid('payment_1_status')}
                        style={{ 
                            padding: '8px 12px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', minWidth:'70px',
                            borderColor: pay1_status === 'paid' ? '#bbf7d0' : '#e2e8f0',
                            background: pay1_status === 'paid' ? '#dcfce7' : '#f8fafc', 
                            color: pay1_status === 'paid' ? '#166534' : '#64748b'
                        }}
                    >
                        {pay1_status === 'paid' ? 'PAID' : 'UNPAID'}
                    </button>
                </div>

                {/* Payment 2 */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', width: '60px' }}>#2 Final</span>
                    <input type="date" value={pay2_date} onChange={e => updateServiceData('payment_2_date', e.target.value)} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                    <div style={{ position: 'relative', flex: 1 }}>
                        <DollarSign size={14} style={{ position: 'absolute', left: '8px', top: '10px', color: '#94a3b8' }} />
                        <input placeholder="Amount" value={pay2_amount} onChange={e => updateServiceData('payment_2_amount', e.target.value)} style={{ width: '100%', padding: '8px 8px 8px 25px', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                    <button 
                        onClick={() => togglePaid('payment_2_status')}
                        style={{ 
                            padding: '8px 12px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', minWidth:'70px',
                            borderColor: pay2_status === 'paid' ? '#bbf7d0' : '#e2e8f0',
                            background: pay2_status === 'paid' ? '#dcfce7' : '#f8fafc', 
                            color: pay2_status === 'paid' ? '#166534' : '#64748b'
                        }}
                    >
                        {pay2_status === 'paid' ? 'PAID' : 'UNPAID'}
                    </button>
                </div>
            </div>

            {/* 4. MENUS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                {['Entrees', 'Sides', 'Drinks'].map(cat => {
                    const key = `menu_${cat.toLowerCase()}`
                    const options = {
                        Entrees: ["Tacos", "Birria", "Chicken Fajitas", "Carne Asada", "Enchiladas", "Chile Verde"],
                        Sides: ["Arroz", "Frijoles", "Salsa", "Guacamole", "Chips", "Corn"],
                        Drinks: ["Horchata", "Jamaica", "Soda Cans", "Water Bottles", "Limon con pepino"]
                    }[cat]

                    return (
                        <div key={key} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>{cat}</div>
                            <select onChange={(e) => { if(e.target.value) toggleMenuItem(key, e.target.value); e.target.value = ''; }} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '15px' }}>
                                <option value="">+ Add {cat}</option>
                                {options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(s[key] || []).map(item => (
                                    <div key={item} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '6px', fontSize: '14px' }}>
                                        <span>{item}</span>
                                        <Trash2 size={16} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => toggleMenuItem(key, item)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* 5. NOTES */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>Customizations / Notes</div>
                <textarea 
                    placeholder="E.g. No onions in the guacamole, arrive 1 hour early for setup..."
                    value={s.notes || ''} 
                    onChange={e => updateServiceData('notes', e.target.value)} 
                    style={{ width: '100%', height: '100px', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'sans-serif', resize: 'vertical', boxSizing: 'border-box' }}
                />
            </div>

            {/* 6. CONTRACT ACTIONS */}
            <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#0369a1', display:'flex', alignItems:'center', gap:'8px' }}>
                    <FileText size={18} /> Contract & Files
                </h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => {navigator.clipboard.writeText(contractUrl); alert("Copied!")}}
                        style={{ background: 'white', border: '1px solid #0ea5e9', color: '#0284c7', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <LinkIcon size={16} /> Copy Link
                    </button>

                    <button 
                        onClick={() => window.open(contractUrl, '_blank')}
                        style={{ background: '#0284c7', border: 'none', color: 'white', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <ExternalLink size={16} /> Open Contract
                    </button>
                </div>
            </div>

        </div>
    )
}