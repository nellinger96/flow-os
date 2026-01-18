import { Calendar, Clock, Users, DollarSign, Trash2, Link as LinkIcon, ExternalLink, CheckCircle, FileText } from 'lucide-react'

export default function CateringView({ formData, setFormData, clientId }) {
    
    // 1. SAFE DATA ACCESS (The "Safety Net")
    const s = formData.service_data || {}
    const contractUrl = `${window.location.origin}/sign/${clientId}`
    const status = (formData.status || '').toLowerCase()
    const isSigned = status === 'booked'

    // 2. HELPER: UPDATE DATA
    function update(field, value) {
        setFormData({
            ...formData,
            service_data: { ...s, [field]: value }
        })
    }

    // 3. HELPER: TOGGLE MENU
    function toggleMenu(category, item) {
        const list = s[category] || []
        update(category, list.includes(item) ? list.filter(i => i !== item) : [...list, item])
    }

    // 4. HELPER: TOGGLE PAID STATUS
    function togglePaid(field) {
        const current = s[field] || 'unpaid'
        update(field, current === 'paid' ? 'unpaid' : 'paid')
    }

    // 5. DATA RECOVERY (Using the ORIGINAL keys from your screenshot)
    // We use TEXT inputs for times/dates to ensure raw data always shows up
    const eventDate = s.event_date || s.service_date || ''
    const serviceTime = s.start_time || s.service_time || ''
    const guestCount = s.guest_count || ''
    const price = s.price_per_head || ''
    
    // Payments (Old Keys)
    const p1_date = s.payment_1_date || s.deposit_date || ''
    const p1_amount = s.payment_1_amount || s.deposit_amount || ''
    const p1_status = s.payment_1_status || s.deposit_status || 'unpaid'
    
    const p2_date = s.payment_2_date || s.final_payment_date || ''
    const p2_amount = s.payment_2_amount || s.final_payment_amount || ''
    const p2_status = s.payment_2_status || s.final_payment_status || 'unpaid'

    return (
        <div style={{ display: 'grid', gap: '20px', fontFamily:'sans-serif' }}>
            
            {/* 1. TRACKING STATUS (The Blue Bar) */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>Tracking Status</div>
                <div style={{ display: 'flex', gap: '5px', background: '#f1f5f9', padding: '5px', borderRadius: '8px' }}>
                    {['lead', 'tasting', 'proposal', 'booked'].map(step => (
                        <button 
                            key={step}
                            onClick={() => setFormData({ ...formData, status: step })}
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize', 
                                background: status === step ? (step === 'booked' ? '#16a34a' : '#2563EB') : 'transparent', 
                                color: status === step ? 'white' : '#64748b'
                            }}
                        >
                            {step}
                        </button>
                    ))}
                </div>
                {isSigned && <div style={{marginTop:'10px', color:'#166534', fontSize:'13px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'6px'}}><CheckCircle size={16}/> Client has signed the contract.</div>}
            </div>

            {/* 2. EVENT DETAILS (Restored to "Flexible" Inputs) */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                    
                    {/* Event Date (Text Input ensures no formatting errors) */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Event Date</label>
                        <input 
                            type="text" 
                            placeholder="MM/DD/YYYY"
                            value={eventDate} 
                            onChange={e => update('event_date', e.target.value)} 
                            style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                        />
                    </div>

                    {/* Service Time (Text Input - "4:30 PM" will show up now) */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Service Time</label>
                        <input 
                            type="text" 
                            placeholder="e.g. 4:30 PM"
                            value={serviceTime} 
                            onChange={e => update('start_time', e.target.value)} 
                            style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                        />
                    </div>

                    {/* Guest Count */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Guest Count</label>
                        <input type="number" value={guestCount} onChange={e => update('guest_count', e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                    </div>
                </div>

                {/* Calculator */}
                <div style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>Price Per Head ($)</label>
                        <input type="number" value={price} onChange={e => update('price_per_head', e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div style={{ flex: 1.5 }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563EB' }}>Total</label>
                        <div style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '6px', border: '1px solid #2563EB', color: '#2563EB', fontWeight: 'bold', background: 'white' }}>
                            ${(parseFloat(price || 0) * parseFloat(guestCount || 0)).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. PAYMENT SCHEDULE (Restored Old Layout) */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#334155' }}>Payment Schedule</h3>
                
                {/* #1 */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', width: '20px' }}>#1</span>
                    <input type="text" placeholder="Date" value={p1_date} onChange={e => update('payment_1_date', e.target.value)} style={{ flex:1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                    <input type="text" placeholder="$ Amount" value={p1_amount} onChange={e => update('payment_1_amount', e.target.value)} style={{ flex:1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                    <button onClick={() => togglePaid('payment_1_status')} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', minWidth:'70px', borderColor: p1_status === 'paid' ? '#bbf7d0' : '#e2e8f0', background: p1_status === 'paid' ? '#dcfce7' : '#f8fafc', color: p1_status === 'paid' ? '#166534' : '#64748b' }}>{p1_status === 'paid' ? 'PAID' : 'UNPAID'}</button>
                </div>

                {/* #2 */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', width: '20px' }}>#2</span>
                    <input type="text" placeholder="Date" value={p2_date} onChange={e => update('payment_2_date', e.target.value)} style={{ flex:1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                    <input type="text" placeholder="$ Amount" value={p2_amount} onChange={e => update('payment_2_amount', e.target.value)} style={{ flex:1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                    <button onClick={() => togglePaid('payment_2_status')} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', minWidth:'70px', borderColor: p2_status === 'paid' ? '#bbf7d0' : '#e2e8f0', background: p2_status === 'paid' ? '#dcfce7' : '#f8fafc', color: p2_status === 'paid' ? '#166534' : '#64748b' }}>{p2_status === 'paid' ? 'PAID' : 'UNPAID'}</button>
                </div>
            </div>

            {/* 4. MENUS (Restored "Cards" Look) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                {['Entrees', 'Sides', 'Drinks'].map(cat => {
                    const key = `menu_${cat.toLowerCase()}`
                    const options = { Entrees: ["Tacos", "Birria", "Chicken Fajitas", "Carne Asada", "Enchiladas", "Chile Verde"], Sides: ["Arroz", "Frijoles", "Salsa", "Guacamole", "Chips", "Corn"], Drinks: ["Horchata", "Jamaica", "Soda Cans", "Water Bottles", "Limon con pepino"] }[cat]
                    return (
                        <div key={key} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>{cat}</div>
                            <select onChange={(e) => { if(e.target.value) toggleMenu(key, e.target.value); e.target.value = ''; }} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '15px' }}>
                                <option value="">+ Add {cat}</option>
                                {options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(s[key] || []).map(item => (
                                    <div key={item} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '6px', fontSize: '14px' }}>
                                        <span>{item}</span>
                                        <Trash2 size={16} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => toggleMenu(key, item)} />
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
                <textarea placeholder="Client notes..." value={s.notes || ''} onChange={e => update('notes', e.target.value)} style={{ width: '100%', height: '80px', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
            </div>

            {/* 6. CONTRACT ACTIONS (Restored Buttons) */}
            <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#0369a1', display:'flex', alignItems:'center', gap:'8px' }}>
                    <FileText size={18} /> Contract & Files
                </h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => {navigator.clipboard.writeText(contractUrl); alert("Copied!")}} style={{ background: 'white', border: '1px solid #0ea5e9', color: '#0284c7', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><LinkIcon size={16} /> Copy Link</button>
                    <button onClick={() => window.open(contractUrl, '_blank')} style={{ background: '#0284c7', border: 'none', color: 'white', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><ExternalLink size={16} /> Open Contract</button>
                </div>
            </div>
        </div>
    )
}