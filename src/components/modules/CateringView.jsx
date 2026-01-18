import { Calendar, Clock, Users, DollarSign, Trash2, Link as LinkIcon, ExternalLink, CheckCircle, FileText } from 'lucide-react'

export default function CateringView({ formData, setFormData, clientId }) {
    
    const s = formData.service_data || {}
    const contractUrl = `${window.location.origin}/sign/${clientId}`
    // Check 'booked' (lowercase) or 'Booked' (Capitalized) just in case
    const isSigned = (formData.status || '').toLowerCase() === 'booked'

    // --- HELPER 1: DATA RECOVERY ---
    // Finds data even if the variable name changed (Supports old & new layout)
    function getValue(key1, key2) {
        return s[key1] || s[key2] || ''
    }

    // --- HELPER 2: DATE FIXER ---
    // Fixes "01/19/2026" -> "2026-01-19" so the calendar input reads it
    function safeDate(val) {
        if (!val) return ''
        if (val.includes('/')) {
            const parts = val.split('/')
            if (parts.length === 3) return `${parts[2]}-${parts[0]}-${parts[1]}`
        }
        return val
    }

    // Helper to save data
    function updateServiceData(field, value) {
        setFormData({
            ...formData,
            service_data: {
                ...(formData.service_data || {}), 
                [field]: value
            }
        })
    }

    // Helper for Menu Items
    function toggleMenuItem(category, item) {
        const currentList = s[category] || []
        const newList = currentList.includes(item)
            ? currentList.filter(i => i !== item)
            : [...currentList, item]
        updateServiceData(category, newList)
    }

    // --- NEW: TOGGLE PAYMENT STATUS ---
    function togglePaymentStatus(field, currentVal) {
        // If it's 'paid', switch to 'unpaid', otherwise make it 'paid'
        const newVal = (currentVal || '').toLowerCase() === 'paid' ? 'unpaid' : 'paid'
        updateServiceData(field, newVal)
    }

    // Get current statuses (checking old and new keys)
    const depositStatus = (getValue('deposit_status', 'payment_1_status') || 'unpaid').toLowerCase()
    const finalStatus = (getValue('final_payment_status', 'payment_2_status') || 'unpaid').toLowerCase()

    return (
        <div style={{ display: 'grid', gap: '20px' }}>
            
            {/* STATUS & CONTRACT HEADER */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'15px' }}>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px', textTransform: 'uppercase' }}>Current Status</div>
                    <div style={{ display: 'flex', gap: '5px', background: '#f1f5f9', padding: '5px', borderRadius: '8px' }}>
                        {['lead', 'tasting', 'proposal', 'booked'].map(step => (
                            <button 
                                key={step}
                                onClick={() => setFormData({ ...formData, status: step })}
                                style={{ 
                                    padding: '6px 12px', 
                                    borderRadius: '6px', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    fontSize: '12px', 
                                    fontWeight: 'bold', 
                                    textTransform: 'capitalize', 
                                    background: (formData.status || '').toLowerCase() === step ? (step === 'booked' ? '#16a34a' : '#2563EB') : 'transparent', 
                                    color: (formData.status || '').toLowerCase() === step ? 'white' : '#64748b', 
                                    transition: '0.2s'
                                }}
                            >
                                {step}
                            </button>
                        ))}
                    </div>
                </div>

                {isSigned && (
                    <div style={{ padding:'10px 15px', background:'#dcfce7', color:'#166534', borderRadius:'8px', display:'flex', alignItems:'center', gap:'8px', fontWeight:'bold', fontSize:'14px' }}>
                        <CheckCircle size={18} /> Contract Signed
                    </div>
                )}
            </div>

            {/* EVENT DETAILS */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' }}>
                    
                    {/* Date */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Event Date</label>
                        <input 
                            type="date" 
                            value={safeDate(getValue('service_date', 'event_date'))} 
                            onChange={e => updateServiceData('service_date', e.target.value)} 
                            style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
                        />
                    </div>

                    {/* Start Time */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Start Time</label>
                        <input 
                            type="time" 
                            value={getValue('service_time', 'start_time')} 
                            onChange={e => updateServiceData('service_time', e.target.value)} 
                            style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
                        />
                    </div>

                    {/* End Time */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>End Time</label>
                        <input 
                            type="time" 
                            value={getValue('service_end_time', 'end_time')} 
                            onChange={e => updateServiceData('service_end_time', e.target.value)} 
                            style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
                        />
                    </div>

                    {/* Guest Count */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Guest Count</label>
                        <input type="number" placeholder="0" value={s.guest_count || ''} onChange={e => updateServiceData('guest_count', e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                    </div>
                </div>

                {/* Price Calculator */}
                <div style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>Price Per Person ($)</label>
                        <input type="number" value={s.price_per_head || ''} onChange={e => updateServiceData('price_per_head', e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div style={{ paddingBottom: '10px', color: '#94a3b8' }}>x</div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>Guest Count</label>
                        <input value={s.guest_count || 0} disabled style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f1f5f9' }} />
                    </div>
                    <div style={{ paddingBottom: '10px', color: '#94a3b8' }}>=</div>
                    <div style={{ flex: 1.5 }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563EB' }}>Calculated Total</label>
                        <div style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '6px', border: '1px solid #2563EB', color: '#2563EB', fontWeight: 'bold', background: 'white' }}>
                            ${(parseFloat(s.price_per_head || 0) * parseFloat(s.guest_count || 0)).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* FINANCIALS (WITH PAID/UNPAID TOGGLES RESTORED) */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#334155' }}>Payment Schedule</h3>
                
                {/* Payment 1 */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', width: '60px' }}>#1 Deposit</span>
                    <input 
                        type="date" 
                        value={safeDate(getValue('deposit_date', 'payment_1_date'))} 
                        onChange={e => updateServiceData('deposit_date', e.target.value)} 
                        style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} 
                    />
                    <div style={{ position: 'relative', flex: 1 }}>
                        <DollarSign size={14} style={{ position: 'absolute', left: '8px', top: '10px', color: '#94a3b8' }} />
                        <input 
                            placeholder="Amount" 
                            value={getValue('deposit_amount', 'payment_1_amount')} 
                            onChange={e => updateServiceData('deposit_amount', e.target.value)} 
                            style={{ width: '100%', padding: '8px 8px 8px 25px', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} 
                        />
                    </div>
                    <button 
                        onClick={() => togglePaymentStatus('deposit_status', depositStatus)}
                        style={{ 
                            padding: '8px 12px', 
                            borderRadius: '6px', 
                            border: '1px solid',
                            borderColor: depositStatus === 'paid' ? '#bbf7d0' : '#e2e8f0',
                            background: depositStatus === 'paid' ? '#dcfce7' : '#f8fafc', 
                            color: depositStatus === 'paid' ? '#166534' : '#64748b',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            minWidth: '70px'
                        }}
                    >
                        {depositStatus === 'paid' ? 'PAID' : 'UNPAID'}
                    </button>
                </div>

                {/* Payment 2 */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', width: '60px' }}>#2 Final</span>
                    <input 
                        type="date" 
                        value={safeDate(getValue('final_payment_date', 'payment_2_date'))} 
                        onChange={e => updateServiceData('final_payment_date', e.target.value)} 
                        style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} 
                    />
                    <div style={{ position: 'relative', flex: 1 }}>
                        <DollarSign size={14} style={{ position: 'absolute', left: '8px', top: '10px', color: '#94a3b8' }} />
                        <input 
                            placeholder="Amount" 
                            value={getValue('final_payment_amount', 'payment_2_amount')} 
                            onChange={e => updateServiceData('final_payment_amount', e.target.value)} 
                            style={{ width: '100%', padding: '8px 8px 8px 25px', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} 
                        />
                    </div>
                    <button 
                        onClick={() => togglePaymentStatus('final_payment_status', finalStatus)}
                        style={{ 
                            padding: '8px 12px', 
                            borderRadius: '6px', 
                            border: '1px solid',
                            borderColor: finalStatus === 'paid' ? '#bbf7d0' : '#e2e8f0',
                            background: finalStatus === 'paid' ? '#dcfce7' : '#f8fafc', 
                            color: finalStatus === 'paid' ? '#166534' : '#64748b',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            minWidth: '70px'
                        }}
                    >
                        {finalStatus === 'paid' ? 'PAID' : 'UNPAID'}
                    </button>
                </div>
            </div>

            {/* MENUS */}
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

            {/* NOTES */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>Customizations / Notes</div>
                <textarea 
                    placeholder="E.g. No onions in the guacamole, arrive 1 hour early for setup..."
                    value={s.notes || ''} 
                    onChange={e => updateServiceData('notes', e.target.value)} 
                    style={{ width: '100%', height: '100px', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'sans-serif', resize: 'vertical', boxSizing: 'border-box' }}
                />
            </div>

            {/* CONTRACT & LINKS */}
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
                
                {isSigned ? (
                     <div style={{ marginTop:'15px', fontSize:'13px', color:'#15803d' }}>
                        ✓ Contract is marked as <strong>Signed (Booked)</strong>.
                     </div>
                ) : (
                    <div style={{ marginTop:'15px', fontSize:'13px', color:'#64748b' }}>
                        ⚠ Contract is waiting for signature.
                    </div>
                )}
            </div>

        </div>
    )
}