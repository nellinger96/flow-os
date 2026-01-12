import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient' 
import { Printer, Users, Clock, Calendar, AlertTriangle, Plus, Trash2, FileText, Check, Link, Upload, Eye, X, DollarSign, CreditCard, ChevronDown } from 'lucide-react'

export default function CateringView({ formData, setFormData, clientId }) {
    const [uploading, setUploading] = useState(false)
    
    // Distinct Menu Lists
    const [entreeOptions, setEntreeOptions] = useState([])
    const [sideOptions, setSideOptions] = useState([])
    const [drinkOptions, setDrinkOptions] = useState([])
    
    const [businessProfile, setBusinessProfile] = useState(null)

    // --- FIX: LOCAL BUFFERS (Prevents the "Reverting Number" Bug) ---
    // These hold the value temporarily while you type
    const [localPrice, setLocalPrice] = useState(formData.service_data?.price_per_head || '')
    const [localGuests, setLocalGuests] = useState(formData.service_data?.guest_count || '')

    // Sync the buffers if you switch to a different client
    useEffect(() => {
        setLocalPrice(formData.service_data?.price_per_head || '')
        setLocalGuests(formData.service_data?.guest_count || '')
    }, [formData.service_data?.price_per_head, formData.service_data?.guest_count])

    // --- 1. FETCH & FILTER DATA ---
    useEffect(() => {
        const fetchData = async () => {
            // Get Services with Categories
            const { data: services } = await supabase.from('services').select('name, category').order('name', { ascending: true })
            
            if (services) {
                // Filter into specific buckets
                setEntreeOptions(services.filter(s => s.category === 'Entree' || !s.category)) // Default to Entree if missing
                setSideOptions(services.filter(s => s.category === 'Side'))
                setDrinkOptions(services.filter(s => s.category === 'Drink'))
            }

            // Get User Profile for Invoice Header
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.user_metadata) {
                setBusinessProfile(user.user_metadata)
            }
        }
        fetchData()
    }, [])

    // --- HELPER TO UPDATE NESTED DATA ---
    const updateService = (field, value) => {
        const newServiceData = { ...formData.service_data, [field]: value }
        
        // AUTO-CALCULATOR LOGIC
        let newJobPrice = formData.job_price
        if (field === 'guest_count' || field === 'price_per_head') {
            const guests = parseFloat(field === 'guest_count' ? value : newServiceData.guest_count) || 0
            const price = parseFloat(field === 'price_per_head' ? value : newServiceData.price_per_head) || 0
            
            // Only auto-calculate if both numbers exist
            if (guests > 0 && price > 0) {
                newJobPrice = guests * price
            }
        }

        setFormData(prev => ({
            ...prev,
            job_price: newJobPrice,
            service_data: newServiceData
        }))
    }

    // --- PAYMENT PLAN LOGIC ---
    const paymentPlan = formData.service_data?.payment_plan || [] 

    const handleInstallmentChange = (count) => {
        const newCount = parseInt(count)
        let newPlan = [...paymentPlan]
        if (newCount > newPlan.length) {
            for (let i = newPlan.length; i < newCount; i++) newPlan.push({ date: '', amount: '', paid: false })
        } else {
            newPlan = newPlan.slice(0, newCount)
        }
        updateService('payment_plan', newPlan)
    }

    const updatePayment = (index, field, value) => {
        const newPlan = [...paymentPlan]
        newPlan[index][field] = value
        updateService('payment_plan', newPlan)
    }

    const totalCollected = paymentPlan.reduce((sum, item) => item.paid ? sum + (parseFloat(item.amount) || 0) : sum, 0)
    const totalJobPrice = parseFloat(formData.job_price) || 0
    const percentPaid = totalJobPrice > 0 ? Math.min(100, Math.round((totalCollected / totalJobPrice) * 100)) : 0
    const balanceDue = totalJobPrice - totalCollected

    // --- MENU CATEGORY LOGIC ---
    const entrees = formData.service_data?.menu_entrees || []
    const sides = formData.service_data?.menu_sides || []
    const drinks = formData.service_data?.menu_drinks || []

    const addItemToCategory = (category, itemName) => {
        if (!itemName) return
        const currentList = formData.service_data?.[category] || []
        if (!currentList.includes(itemName)) {
            updateService(category, [...currentList, itemName])
        }
    }

    const removeItemFromCategory = (category, itemName) => {
        const currentList = formData.service_data?.[category] || []
        const newList = currentList.filter(i => i !== itemName)
        updateService(category, newList)
    }

    // --- PIPELINE & FILES ---
    const PIPELINE_STEPS = ['lead', 'tasting', 'proposal', 'sold']
    const getStepLabel = (step) => { if (step === 'sold') return 'BOOKED'; return step.charAt(0).toUpperCase() + step.slice(1) }
    const setStatus = (step) => { setFormData(prev => ({ ...prev, status: step })) }
    
    const copyContractLink = () => { if (!clientId || clientId === 'new') { alert("Please save profile first."); return; } navigator.clipboard.writeText(`${window.location.origin}/sign/${clientId}`); alert("Link Copied!") }
    
    const handleFileUpload = async (e) => { try { setUploading(true); const file = e.target.files[0]; if(!file)return; if(!clientId || clientId==='new'){alert("Save first");return} const ext=file.name.split('.').pop(); const name=`${clientId}-${Math.random()}.${ext}`; const {error}=await supabase.storage.from('contracts').upload(name, file); if(error)throw error; const {data}=supabase.storage.from('contracts').getPublicUrl(name); setFormData(p=>({...p, contract_url:data.publicUrl})); alert("Uploaded!"); } catch(err){alert(err.message)} finally{setUploading(false)} }
    
    const addTimelineItem = () => { const currentTimeline = formData.service_data?.timeline || []; updateService('timeline', [...currentTimeline, { time: '', action: '' }]) }
    const updateTimelineItem = (index, field, value) => { const currentTimeline = [...(formData.service_data?.timeline || [])]; currentTimeline[index][field] = value; updateService('timeline', currentTimeline) }
    const removeTimelineItem = (index) => { const currentTimeline = [...(formData.service_data?.timeline || [])]; currentTimeline.splice(index, 1); updateService('timeline', currentTimeline) }

    // --- PRINTERS ---
    const printInvoice = () => {
        const printWindow = window.open('', '_blank')
        const invoiceNum = clientId !== 'new' ? clientId.split('-')[0].toUpperCase() : 'DRAFT'
        const today = new Date().toLocaleDateString()
        const guests = formData.service_data?.guest_count || 0
        const pricePerHead = formData.service_data?.price_per_head || 0
        
        const buildMenuSection = (title, items) => {
            if (!items || items.length === 0) return ''
            return `<div style="margin-bottom:5px;"><strong>${title}:</strong> ${items.join(', ')}</div>`
        }

        const menuHtml = `
            ${buildMenuSection('Entrees', entrees)}
            ${buildMenuSection('Sides', sides)}
            ${buildMenuSection('Drinks', drinks)}
        `
        
        printWindow.document.write(`
            <html>
            <head>
                <title>INVOICE #${invoiceNum}</title>
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 40px; }
                    .biz-name { font-size: 24px; font-weight: bold; color: #000; text-transform: uppercase; }
                    .biz-details { font-size: 14px; color: #666; margin-top: 5px; }
                    .invoice-title { font-size: 36px; font-weight: 900; color: #1e293b; text-align: right; }
                    .invoice-meta { text-align: right; font-size: 14px; color: #666; margin-top: 5px; }
                    .bill-to { margin-bottom: 40px; }
                    .bill-label { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #94a3b8; margin-bottom: 5px; }
                    .client-name { font-size: 18px; font-weight: bold; }
                    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    .table th { text-align: left; background: #f8fafc; padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; }
                    .table td { padding: 15px 12px; border-bottom: 1px solid #f1f5f9; }
                    .total-section { display: flex; justify-content: flex-end; }
                    .total-grid { width: 300px; }
                    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
                    .grand-total { font-size: 20px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; color: #000; }
                    .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #eee; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="biz-name">${businessProfile?.business_name || 'CATERING SERVICE'}</div>
                        <div class="biz-details">${businessProfile?.city || ''}, ${businessProfile?.state || ''}</div>
                    </div>
                    <div>
                        <div class="invoice-title">INVOICE</div>
                        <div class="invoice-meta">#${invoiceNum}</div>
                        <div class="invoice-meta">Date: ${today}</div>
                    </div>
                </div>
                <div class="bill-to">
                    <div class="bill-label">Bill To:</div>
                    <div class="client-name">${formData.full_name}</div>
                    <div>${formData.address}</div>
                    <div style="margin-top:5px; font-size:14px; color:#666;">Event: ${formData.service_data?.event_date || 'TBD'}</div>
                </div>
                <table class="table">
                    <thead><tr><th width="60%">Service Details</th><th width="10%">Qty</th><th width="15%">Rate</th><th width="15%" style="text-align:right">Amount</th></tr></thead>
                    <tbody>
                        <tr>
                            <td>
                                <strong>Event Service Package</strong>
                                <div style="font-size:12px; color:#666; margin-top:8px;">${menuHtml || 'Custom Menu'}</div>
                            </td>
                            <td>${guests}</td>
                            <td>$${pricePerHead}</td>
                            <td style="text-align:right">$${(guests * pricePerHead).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="total-section">
                    <div class="total-grid">
                        <div class="total-row grand-total"><span>Total</span><span>$${totalJobPrice.toLocaleString()}</span></div>
                        <div class="total-row" style="color:#16a34a; font-weight:bold;"><span>Paid</span><span>-$${totalCollected.toLocaleString()}</span></div>
                        <div class="total-row" style="color:#dc2626; font-weight:bold; font-size:16px;"><span>Balance</span><span>$${balanceDue.toLocaleString()}</span></div>
                    </div>
                </div>
                <div class="footer">Thank you for your business.</div>
            </body>
            </html>
        `)
        printWindow.document.close(); printWindow.print()
    }

    const printKitchenSheet = () => {
        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
            <html><head><title>KITCHEN SHEET</title>
            <style>
                body{font-family:sans-serif;padding:40px;}
                .header{border-bottom:4px solid #000;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center;}
                .title{font-size:40px;font-weight:900;text-transform:uppercase;}
                .section-title{font-size:24px;font-weight:bold;border-bottom:2px solid #ccc;margin-bottom:10px;padding-bottom:5px;margin-top:30px;color:#000;}
                .item-list{font-size:18px; line-height:1.6; list-style-type: square; margin-top:0;}
                .alert-box{border:4px dashed red;padding:20px;margin-bottom:30px;color:red;font-weight:bold;font-size:20px;}
                .meta{font-size:20px; margin-bottom:10px;}
            </style>
            </head><body>
                <div class="header">
                    <div class="title">Kitchen Prep</div>
                    <div style="text-align:right; font-size:24px; font-weight:bold;">${formData.service_data?.event_date || 'TBD'}</div>
                </div>
                ${formData.service_data?.dietary_restrictions ? `<div class="alert-box">DIETARY ALERT: ${formData.service_data.dietary_restrictions}</div>` : ''}
                <div style="background:#f1f5f9; padding:20px; border-radius:10px; margin-bottom:30px;">
                    <div class="meta"><strong>Client:</strong> ${formData.full_name}</div>
                    <div class="meta"><strong>Headcount:</strong> ${formData.service_data?.guest_count || '0'} Guests</div>
                    <div class="meta"><strong>Service Time:</strong> ${formData.service_data?.event_time || 'TBD'}</div>
                </div>
                ${entrees.length > 0 ? `<div class="section-title">ENTREES</div><ul class="item-list">${entrees.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}
                ${sides.length > 0 ? `<div class="section-title">SIDES</div><ul class="item-list">${sides.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}
                ${drinks.length > 0 ? `<div class="section-title">DRINKS</div><ul class="item-list">${drinks.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}
                <div class="section-title">NOTES</div>
                <div style="font-size:18px;">${formData.job_notes || 'No custom notes.'}</div>
                ${formData.service_data?.kitchen_notes ? `<div class="section-title">INSTRUCTIONS</div><div style="font-size:18px;">${formData.service_data.kitchen_notes}</div>` : ''}
            </body></html>
        `)
        printWindow.document.close(); printWindow.print()
    }
    
    const printRunOfShow = () => {
        const timeline = formData.service_data?.timeline || []
        const printWindow = window.open('', '_blank')
        printWindow.document.write(`<html><head><title>RUN OF SHOW</title><style>body{font-family:sans-serif;padding:40px;}.header{border-bottom:2px solid #000;margin-bottom:30px;}.title{font-size:32px;font-weight:bold;}.table{width:100%;border-collapse:collapse;margin-top:20px;}th{text-align:left;background:#eee;padding:10px;border-bottom:2px solid #000;}td{padding:15px 10px;border-bottom:1px solid #ccc;}</style></head><body><div class="header"><div class="title">Run of Show</div><div>${formData.full_name}</div></div><table class="table"><thead><tr><th width="150">TIME</th><th>ACTIVITY</th></tr></thead><tbody>${timeline.sort((a,b)=>a.time.localeCompare(b.time)).map(i=>`<tr><td>${i.time}</td><td>${i.action}</td></tr>`).join('')}</tbody></table></body></html>`)
        printWindow.document.close(); printWindow.print()
    }

    // Styles
    const sectionStyle = { background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }
    const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }
    const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }
    const timeline = formData.service_data?.timeline || []
    const currentStep = formData.status || 'lead'

    // Dropdown Component (Accepts Filtered Options)
    const MenuDropdown = ({ label, categoryList, categoryKey, options }) => (
        <div style={{marginBottom:'25px'}}>
            <label style={{...labelStyle, marginBottom:'8px', display:'flex', alignItems:'center', gap:'5px', color:'#334155', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                {label}
            </label>
            <div style={{position: 'relative'}}>
                <select 
                    onChange={(e) => { addItemToCategory(categoryKey, e.target.value); e.target.value="" }}
                    style={{...inputStyle, marginBottom:'10px', background:'#f8fafc', fontWeight:'500'}}
                >
                    <option value="">+ Add to {label}</option>
                    {options.map(m => (<option key={m.name} value={m.name}>{m.name}</option>))}
                </select>
                <ChevronDown size={14} style={{position:'absolute', right:'12px', top:'13px', pointerEvents:'none', color:'#94a3b8'}}/>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {categoryList.length === 0 && <span style={{fontSize:'13px', color:'#cbd5e1', fontStyle:'italic', paddingLeft:'5px'}}>No {label.toLowerCase()} selected.</span>}
                {categoryList.map(item => (
                    <div key={item} style={{ 
                        background: 'white', color: '#334155', borderLeft: '3px solid #cbd5e1', borderBottom: '1px solid #f1f5f9',
                        padding: '10px 15px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                        transition: 'all 0.2s'
                    }}>
                        <span>{item}</span>
                        <button onClick={() => removeItemFromCategory(categoryKey, item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '5px', display: 'flex', opacity: 0.6 }} title="Remove">
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )

    return (
        <div style={{ animation: 'fadeIn 0.5s' }}>
            
            {/* PIPELINE */}
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <label style={{...labelStyle, marginBottom:'10px', color:'#334155'}}>TRACKING STATUS</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                    {PIPELINE_STEPS.map((step, index) => {
                        const isActive = step === currentStep
                        const isPast = PIPELINE_STEPS.indexOf(currentStep) > index
                        let bgColor = isActive ? (step === 'sold' ? '#16a34a' : '#2563EB') : (isPast ? '#dbeafe' : '#e2e8f0')
                        let textColor = isActive ? 'white' : (isPast ? '#2563EB' : '#64748b')
                        return <button key={step} onClick={() => setStatus(step)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: bgColor, color: textColor, fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>{isPast && <Check size={12} />} {getStepLabel(step)}</button>
                    })}
                </div>
            </div>

            {/* CALCULATOR (FIXED WITH LOCAL BUFFERS) */}
            <div style={sectionStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div><label style={labelStyle}>Event Date</label><input type="date" value={formData.service_data?.event_date || ''} onChange={e => updateService('event_date', e.target.value)} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Service Time</label><input type="time" value={formData.service_data?.event_time || ''} onChange={e => updateService('event_time', e.target.value)} style={inputStyle} /></div>
                    
                    {/* FIXED: GUEST COUNT INPUT */}
                    <div>
                        <label style={labelStyle}>Guest Count</label>
                        <input 
                            type="number" 
                            placeholder="0" 
                            value={localGuests} // Use Local Buffer
                            onChange={e => setLocalGuests(e.target.value)} // Update Buffer immediately
                            onBlur={e => updateService('guest_count', e.target.value)} // Save & Calc on click away
                            style={{...inputStyle, fontWeight:'bold', color:'#2563EB'}} 
                        />
                    </div>
                </div>

                <div style={{ background:'#eff6ff', padding:'15px', borderRadius:'8px', border:'1px solid #bfdbfe', display:'flex', gap:'15px', alignItems:'flex-end' }}>
                    
                    {/* FIXED: PRICE PER PERSON INPUT */}
                    <div style={{flex:1}}>
                        <label style={{...labelStyle, color:'#1e40af'}}>Price Per Person ($)</label>
                        <div style={{position:'relative'}}>
                            <DollarSign size={14} style={{position:'absolute', left:'10px', top:'10px', color:'#93c5fd'}}/>
                            <input 
                                type="number" 
                                placeholder="0.00" 
                                value={localPrice} // Use Local Buffer
                                onChange={e => setLocalPrice(e.target.value)} // Update Buffer immediately
                                onBlur={e => updateService('price_per_head', e.target.value)} // Save & Calc on click away
                                style={{...inputStyle, paddingLeft:'25px', borderColor:'#bfdbfe'}} 
                            />
                        </div>
                    </div>

                    <div style={{paddingBottom:'10px', color:'#93c5fd'}}><X size={16} /></div>
                    
                    <div style={{flex:1}}>
                        <label style={{...labelStyle, color:'#1e40af'}}>Guest Count</label>
                        <input disabled type="number" value={localGuests || 0} style={{...inputStyle, background:'#e0f2fe', borderColor:'#bfdbfe', color:'#64748b'}} />
                    </div>
                    
                    <div style={{paddingBottom:'10px', color:'#93c5fd'}}>=</div>
                    
                    <div style={{flex:1}}>
                        <label style={{...labelStyle, color:'#1e40af'}}>Calculated Total</label>
                        <div style={{ background:'white', border:'1px solid #2563EB', borderRadius:'6px', padding:'10px', fontWeight:'bold', color:'#2563EB' }}>
                            ${parseFloat(formData.job_price || 0).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* PAYMENT SCHEDULE */}
            <div style={sectionStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h4 style={{margin:0, color: '#334155', display:'flex', alignItems:'center', gap:'8px'}}>Payment Schedule</h4>
                    <select value={paymentPlan.length} onChange={e => handleInstallmentChange(e.target.value)} style={{padding:'6px', borderRadius:'6px', border:'1px solid #cbd5e1', fontSize:'13px'}}>
                        <option value="0">No Payments Set</option>
                        <option value="1">1 Payment</option>
                        <option value="2">2 Payments</option>
                        <option value="3">3 Payments</option>
                        <option value="4">4 Payments</option>
                    </select>
                </div>
                {paymentPlan.length > 0 && (
                    <div style={{marginBottom:'20px'}}>
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'5px', fontWeight:'bold', color:'#64748b'}}><span>Collected: ${totalCollected.toLocaleString()}</span><span>{percentPaid}% Paid</span></div>
                        <div style={{width:'100%', height:'10px', background:'#f1f5f9', borderRadius:'5px', overflow:'hidden'}}><div style={{width:`${percentPaid}%`, height:'100%', background: percentPaid === 100 ? '#16a34a' : '#2563EB', transition:'width 0.5s'}}></div></div>
                    </div>
                )}
                {paymentPlan.map((item, index) => (
                    <div key={index} style={{display:'flex', gap:'10px', alignItems:'center', marginBottom:'10px'}}>
                        <div style={{width:'30px', fontWeight:'bold', color:'#94a3b8', fontSize:'13px'}}>#{index + 1}</div>
                        <div style={{flex:1}}><input type="date" value={item.date} onChange={e => updatePayment(index, 'date', e.target.value)} style={inputStyle} /></div>
                        <div style={{flex:1, position:'relative'}}><span style={{position:'absolute', left:'10px', top:'10px', color:'#94a3b8'}}>$</span><input type="number" value={item.amount} onChange={e => updatePayment(index, 'amount', e.target.value)} style={{...inputStyle, paddingLeft:'20px'}} /></div>
                        <div onClick={() => updatePayment(index, 'paid', !item.paid)} style={{cursor:'pointer', padding:'8px 12px', borderRadius:'6px', background: item.paid ? '#dcfce7' : '#f1f5f9', color: item.paid ? '#16a34a' : '#94a3b8', border: `1px solid ${item.paid ? '#bbf7d0' : '#e2e8f0'}`, display:'flex', alignItems:'center', gap:'6px', fontWeight:'bold', fontSize:'13px', minWidth:'80px', justifyContent:'center'}}>{item.paid ? <><Check size={14}/> Paid</> : 'Unpaid'}</div>
                    </div>
                ))}
            </div>

            {/* FILES & CONTRACTS */}
            <div style={{...sectionStyle, background:'#f0fdf4', borderColor:'#bbf7d0'}}>
                <h4 style={{marginTop:0, marginBottom:'15px', color:'#166534', display:'flex', alignItems:'center', gap:'8px'}}>Contracts & Files</h4>
                <div style={{display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'15px'}}>
                    <button onClick={copyContractLink} style={{ background: 'white', color: '#166534', border: '1px solid #166534', padding: '10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px' }}><Link size={16} /> Copy Link</button>
                    <div style={{position:'relative', overflow:'hidden', display:'inline-block'}}><button style={{ background: '#166534', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px' }}><Upload size={16} /> {uploading ? 'Uploading...' : 'Upload PDF'}</button><input type="file" onChange={handleFileUpload} disabled={uploading} style={{position:'absolute', left:0, top:0, opacity:0, width:'100%', height:'100%', cursor:'pointer'}} /></div>
                </div>
                <div style={{ paddingTop:'15px', borderTop:'1px solid #bbf7d0' }}>
                    {formData.contract_url === 'SIGNED_DIGITALLY' ? (
                        <div style={{background:'#dcfce7', padding:'10px', borderRadius:'6px', border:'1px solid #bbf7d0', display:'flex', flexDirection:'column', gap:'5px'}}>
                            <div style={{fontWeight:'bold', color:'#166534', display:'flex', alignItems:'center', gap:'6px'}}><Check size={16}/> Signed Digitally</div>
                            <div style={{fontSize:'12px', color:'#15803d'}}><strong>By:</strong> {formData.service_data?.signed_by || 'Client'}</div>
                            <div style={{fontSize:'12px', color:'#15803d'}}><strong>At:</strong> {formData.service_data?.signed_at ? new Date(formData.service_data.signed_at).toLocaleString() : 'N/A'}</div>
                        </div>
                    ) : ( <div><strong style={{fontSize:'13px', color:'#14532d'}}>Current File: </strong> {formData.contract_url ? (<a href={formData.contract_url} target="_blank" rel="noreferrer" style={{color:'#16a34a', textDecoration:'underline', fontWeight:'bold', marginLeft:'5px', display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'13px'}}><Eye size={12}/> View Uploaded File</a>) : <span style={{fontSize:'13px', opacity:0.6, color:'#14532d'}}>No contract on file yet.</span>}</div> )}
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
                <button onClick={printInvoice} style={{ background: '#059669', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}><DollarSign size={16} /> Print Invoice</button>
                <button onClick={printRunOfShow} style={{ background: 'white', color: '#334155', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px' }}><FileText size={16} /> Run of Show</button>
                <button onClick={printKitchenSheet} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px' }}><Printer size={16} /> Kitchen Sheet</button>
            </div>

            {/* MENU CONFIGURATION (Filtered) */}
            <div style={sectionStyle}>
                <h4 style={{marginTop:0, marginBottom:'25px', color:'#334155'}}>MENU CONFIGURATION</h4>
                
                <MenuDropdown label="Entrees" categoryKey="menu_entrees" categoryList={entrees} options={entreeOptions} />
                <div style={{borderTop:'1px dashed #e2e8f0', margin:'20px 0'}}></div>
                
                <MenuDropdown label="Sides" categoryKey="menu_sides" categoryList={sides} options={sideOptions} />
                <div style={{borderTop:'1px dashed #e2e8f0', margin:'20px 0'}}></div>
                
                <MenuDropdown label="Drinks" categoryKey="menu_drinks" categoryList={drinks} options={drinkOptions} />
                
                <div style={{marginTop:'25px'}}>
                    <label style={labelStyle}>Customizations / Notes</label>
                    <textarea rows={3} value={formData.job_notes || ''} onChange={e => setFormData({ ...formData, job_notes: e.target.value })} style={inputStyle} placeholder="Specific details (e.g. Mild Salsa)..." />
                </div>
            </div>

            {/* DIETARY & NOTES */}
            <div style={sectionStyle}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{...labelStyle, color: '#ef4444'}}>Dietary Restrictions</label>
                    <input type="text" placeholder="e.g. PEANUT ALLERGY" value={formData.service_data?.dietary_restrictions || ''} onChange={e => updateService('dietary_restrictions', e.target.value)} style={{ ...inputStyle, borderColor: '#fca5a5', background: '#fef2f2', color: '#b91c1c', fontWeight: 'bold' }} />
                </div>
                <div><label style={labelStyle}>Kitchen Instructions</label><textarea rows={3} placeholder="Team instructions..." value={formData.service_data?.kitchen_notes || ''} onChange={e => updateService('kitchen_notes', e.target.value)} style={{ ...inputStyle, background: '#f8fafc' }} /></div>
            </div>
            
            {/* TIMELINE */}
            <div style={sectionStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <label style={{...labelStyle, fontSize:'14px', color:'#1e293b'}}>Event Timeline</label>
                    <button onClick={addTimelineItem} style={{background:'none', border:'none', color:'#2563EB', cursor:'pointer', fontSize:'12px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'4px'}}><Plus size={14}/> Add Time</button>
                </div>
                {timeline.length === 0 ? <div style={{padding:'20px', textAlign:'center', color:'#94a3b8', background:'#f8fafc', borderRadius:'8px', border:'1px dashed #cbd5e1', fontSize:'13px'}}>No timeline events added yet.</div> : (
                    <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                        {timeline.map((item, index) => (
                            <div key={index} style={{display:'flex', gap:'10px', alignItems:'center'}}>
                                <input type="time" value={item.time} onChange={e => updateTimelineItem(index, 'time', e.target.value)} style={{width:'110px', ...inputStyle}} />
                                <input type="text" placeholder="Activity" value={item.action} onChange={e => updateTimelineItem(index, 'action', e.target.value)} style={{flex:1, ...inputStyle}} />
                                <button onClick={() => removeTimelineItem(index)} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer'}}><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}