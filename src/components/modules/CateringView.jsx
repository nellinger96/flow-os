import { Calendar, Clock, Users, DollarSign, Trash2 } from 'lucide-react'

export default function CateringView({ formData, setFormData, clientId }) {
    
    // Helper to update deeply nested "service_data"
    function updateServiceData(field, value) {
        setFormData({
            ...formData,
            service_data: {
                ...formData.service_data,
                [field]: value
            }
        })
    }

    // Helper for Menu Items
    function toggleMenuItem(category, item) {
        const currentList = formData.service_data?.[category] || []
        const newList = currentList.includes(item)
            ? currentList.filter(i => i !== item)
            : [...currentList, item]
        updateServiceData(category, newList)
    }

    const s = formData.service_data || {}

    return (
        <div style={{ display: 'grid', gap: '20px' }}>
            
            {/* STATUS TRACKING */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>Tracking Status</div>
                <div style={{ display: 'flex', gap: '5px', background: '#f1f5f9', padding: '5px', borderRadius: '8px' }}>
                    {['lead', 'tasting', 'proposal', 'booked'].map(step => (
                        <button 
                            key={step}
                            onClick={() => setFormData({ ...formData, status: step })}
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize', background: formData.status === step ? (step === 'booked' ? '#16a34a' : '#2563EB') : 'transparent', color: formData.status === step ? 'white' : '#64748b', transition: '0.2s' }}
                        >
                            {step}
                        </button>
                    ))}
                </div>
            </div>

            {/* EVENT DETAILS (Added End Time Here) */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' }}>
                    
                    {/* Date */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Event Date</label>
                        <input type="date" value={s.service_date || ''} onChange={e => updateServiceData('service_date', e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                    </div>

                    {/* Start Time */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Start Time</label>
                        <input type="time" value={s.service_time || ''} onChange={e => updateServiceData('service_time', e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                    </div>

                    {/* End Time */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>End Time</label>
                        <input type="time" value={s.service_end_time || ''} onChange={e => updateServiceData('service_end_time', e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
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

            {/* FINANCIALS (FIXED: NOW SAVES TO DATABASE) */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#334155' }}>Payment Schedule</h3>
                
                {/* Deposit */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', width: '60px' }}>Deposit</span>
                    <input type="date" value={s.deposit_date || ''} onChange={e => updateServiceData('deposit_date', e.target.value)} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                    <div style={{ position: 'relative', flex: 1 }}>
                        <DollarSign size={14} style={{ position: 'absolute', left: '8px', top: '10px', color: '#94a3b8' }} />
                        <input placeholder="Amount" value={s.deposit_amount || ''} onChange={e => updateServiceData('deposit_amount', e.target.value)} style={{ width: '100%', padding: '8px 8px 8px 25px', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                </div>

                {/* Final Payment */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', width: '60px' }}>Final</span>
                    <input type="date" value={s.final_payment_date || ''} onChange={e => updateServiceData('final_payment_date', e.target.value)} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                    <div style={{ position: 'relative', flex: 1 }}>
                        <DollarSign size={14} style={{ position: 'absolute', left: '8px', top: '10px', color: '#94a3b8' }} />
                        <input placeholder="Amount" value={s.final_payment_amount || ''} onChange={e => updateServiceData('final_payment_amount', e.target.value)} style={{ width: '100%', padding: '8px 8px 8px 25px', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                </div>
            </div>

            {/* MENUS (Simplified for length - logic handles adding/removing) */}
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

        </div>
    )
}