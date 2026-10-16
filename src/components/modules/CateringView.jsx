import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient' 
import { Printer, Plus, Trash2, Check, Link, Upload, Eye, X, DollarSign, ChevronDown, CreditCard, Loader2 } from 'lucide-react'

export default function CateringView({ formData, setFormData, clientId }) {
    const [uploading, setUploading] = useState(false)
    const [processingPayment, setProcessingPayment] = useState(null)
    const [entreeOptions, setEntreeOptions] = useState([])
    const [sideOptions, setSideOptions] = useState([])
    const [drinkOptions, setDrinkOptions] = useState([])
    const [businessProfile, setBusinessProfile] = useState(null)

    const [localPrice, setLocalPrice] = useState(formData.service_data?.price_per_head || '')
    const [localGuests, setLocalGuests] = useState(formData.service_data?.guest_count || '')

    useEffect(() => {
        setLocalPrice(formData.service_data?.price_per_head || '')
        setLocalGuests(formData.service_data?.guest_count || '')
    }, [formData.service_data?.price_per_head, formData.service_data?.guest_count])

    useEffect(() => {
        const fetchData = async () => {
            const { data: services } = await supabase.from('services').select('name, category').order('name', { ascending: true })
            if (services) {
                setEntreeOptions(services.filter(s => s.category === 'Entree' || !s.category))
                setSideOptions(services.filter(s => s.category === 'Side'))
                setDrinkOptions(services.filter(s => s.category === 'Drink'))
            }
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.user_metadata) setBusinessProfile(user.user_metadata)
        }
        fetchData()
    }, [])

    const updateService = (field, value) => {
        const newServiceData = { ...formData.service_data, [field]: value }
        let newJobPrice = formData.job_price
        if (field === 'guest_count' || field === 'price_per_head') {
            const guests = parseFloat(field === 'guest_count' ? value : newServiceData.guest_count) || 0
            const price = parseFloat(field === 'price_per_head' ? value : newServiceData.price_per_head) || 0
            if (guests > 0 && price > 0) newJobPrice = guests * price
        }
        setFormData(prev => ({ ...prev, job_price: newJobPrice, service_data: newServiceData }))
    }

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

    // --- STRIPE PAYMENT INTEGRATION ---
    const handleStripePayment = async (index, amount) => {
        if (!amount || parseFloat(amount) <= 0) return alert("Enter a valid amount first.")
        
        try {
            setProcessingPayment(index)
            
            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: {
                    amount: parseFloat(amount),
                    description: `Catering Payment #${index + 1}`,
                    clientName: formData.full_name || 'Client',
                    returnUrl: window.location.href, 
                    user_id: formData.user_id 
                }
            })

            if (error) throw error
            if (!data?.url) throw new Error("No payment URL returned")

            window.location.href = data.url

        } catch (error) {
            console.error(error)
            alert("Payment Error: " + (error.message || "Could not initialize checkout"))
            setProcessingPayment(null)
        }
    }

    const totalCollected = paymentPlan.reduce((sum, item) => item.paid ? sum + (parseFloat(item.amount) || 0) : sum, 0)
    const totalJobPrice = parseFloat(formData.job_price) || 0
    const percentPaid = totalJobPrice > 0 ? Math.min(100, Math.round((totalCollected / totalJobPrice) * 100)) : 0
    const balanceDue = totalJobPrice - totalCollected

    const entrees = formData.service_data?.menu_entrees || []
    const sides = formData.service_data?.menu_sides || []
    const drinks = formData.service_data?.menu_drinks || []

    const addItemToCategory = (category, itemName) => {
        if (!itemName) return
        const currentList = formData.service_data?.[category] || []
        if (!currentList.includes(itemName)) updateService(category, [...currentList, itemName])
    }

    const removeItemFromCategory = (category, itemName) => {
        const currentList = formData.service_data?.[category] || []
        const newList = currentList.filter(i => i !== itemName)
        updateService(category, newList)
    }

    const PIPELINE_STEPS = ['lead', 'tasting', 'proposal', 'sold']
    const getStepLabel = (step) => { if (step === 'sold') return 'BOOKED'; return step.charAt(0).toUpperCase() + step.slice(1) }
    const setStatus = (step) => { setFormData(prev => ({ ...prev, status: step })) }
    
    // --- UPDATED SECURE LINK COPY ---
    const copyContractLink = () => { 
        if (!clientId || clientId === 'new') { 
            alert("Please save profile first."); 
            return; 
        } 
        
        const secureToken = formData.public_token;
        if (!secureToken) {
            alert("Security token missing! Try refreshing the page or making sure you ran the Supabase SQL.");
            return;
        }

        navigator.clipboard.writeText(`${window.location.origin}/sign/${secureToken}`); 
        alert("Secure Link Copied!"); 
    }
    
    const handleFileUpload = async (e) => { try { setUploading(true); const file = e.target.files[0]; if(!file)return; if(!clientId || clientId==='new'){alert("Save first");return} const ext=file.name.split('.').pop(); const name=`${clientId}-${Math.random()}.${ext}`; const {error}=await supabase.storage.from('contracts').upload(name, file); if(error)throw error; const {data}=supabase.storage.from('contracts').getPublicUrl(name); setFormData(p=>({...p, contract_url:data.publicUrl})); alert("Uploaded!"); } catch(err){alert(err.message)} finally{setUploading(false)} }
    
    const addTimelineItem = () => { const currentTimeline = formData.service_data?.timeline || []; updateService('timeline', [...currentTimeline, { time: '', action: '' }]) }
    const updateTimelineItem = (index, field, value) => { const currentTimeline = [...(formData.service_data?.timeline || [])]; currentTimeline[index][field] = value; updateService('timeline', currentTimeline) }
    const removeTimelineItem = (index) => { const currentTimeline = [...(formData.service_data?.timeline || [])]; currentTimeline.splice(index, 1); updateService('timeline', currentTimeline) }

    const printViaHiddenFrame = (content) => {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(content);
        doc.close();

        iframe.contentWindow.focus();
        setTimeout(() => {
            iframe.contentWindow.print();
            setTimeout(() => { document.body.removeChild(iframe) }, 1000); 
        }, 500);
    }

    const printInvoice = () => {
        try {
            const safeId = String(clientId || 'new')
            const invoiceNum = safeId !== 'new' ? safeId.split('-')[0].toUpperCase() : 'DRAFT'
            const today = new Date().toLocaleDateString()
            const guests = formData.service_data?.guest_count || 0
            const pricePerHead = formData.service_data?.price_per_head || 0
            const total = parseFloat(formData.job_price || 0)
            const businessName = businessProfile?.business_name || 'Catering Service'
            const businessCity = businessProfile?.city || ''
            const eventDate = formData.service_data?.event_date ? new Date(formData.service_data.event_date).toLocaleDateString() : 'TBD'
            const eventTime = formData.service_data?.event_time || 'TBD'
            
            const menuItems = []
            if (entrees.length) menuItems.push(`<strong>Entrees:</strong> ${entrees.join(', ')}`)
            if (sides.length) menuItems.push(`<strong>Sides:</strong> ${sides.join(', ')}`)
            if (drinks.length) menuItems.push(`<strong>Drinks:</strong> ${drinks.join(', ')}`)
            const menuHtml = menuItems.length ? menuItems.join('<br/>') : 'Custom Menu'

            const paymentRowsHtml = paymentPlan.length > 0 ? paymentPlan.map((item, index) => {
                const dateStr = item.date ? new Date(item.date).toLocaleDateString() : 'TBD'
                const amountStr = item.amount ? `$${parseFloat(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '$0.00'
                const statusBadge = item.paid 
                    ? '<span style="background:#dcfce7; color:#166534; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 1px solid #bbf7d0;">PAID</span>' 
                    : '<span style="background:#f1f5f9; color:#64748b; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 1px solid #e2e8f0;">UNPAID</span>'
                
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee; font-size: 14px;">
                        <div><strong style="color:#1e3a8a">Payment #${index + 1}</strong> <span style="color:#64748b; margin-left: 10px;">Due: ${dateStr}</span></div>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <strong style="font-size: 16px;">${amountStr}</strong>
                            ${statusBadge}
                        </div>
                    </div>
                `
            }).join('') : '<div style="padding: 15px; font-style: italic; color: #94a3b8;">Total due upon receipt.</div>'

            const content = `
                <html>
                <head>
                    <title>INVOICE #${invoiceNum}</title>
                    <style>
                        body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 50px; color: #333; max-width: 900px; margin: 0 auto; line-height: 1.5; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 40px; }
                        .biz-title { font-size: 28px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; letter-spacing: 1px; margin: 0; }
                        .biz-details { color: #64748b; font-size: 14px; margin-top: 5px; }
                        .invoice-label { font-size: 40px; font-weight: 900; color: #e2e8f0; text-align: right; line-height: 0.8; margin: 0; }
                        .invoice-meta { text-align: right; font-size: 15px; font-weight: bold; color: #334155; margin-top: 10px; }
                        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
                        .summary-box { background: #f8fafc; padding: 25px; borderRadius: 12px; border: 1px solid #e2e8f0; }
                        .box-label { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; letter-spacing: 0.5px; }
                        .client-name { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
                        .info-line { font-size: 14px; color: #475569; margin-bottom: 4px; display: flex; gap: 8px; }
                        .table-container { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 30px; }
                        table { width: 100%; border-collapse: collapse; }
                        th { background: #1e3a8a; color: white; text-align: left; padding: 15px; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px; }
                        td { padding: 18px 15px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
                        .menu-details { font-size: 13px; color: #475569; margin-top: 10px; line-height: 1.6; padding-left: 10px; border-left: 3px solid #cbd5e1; }
                        .totals-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
                        .totals-box { width: 300px; }
                        .total-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 15px; color: #475569; }
                        .grand-total { font-size: 26px; font-weight: 900; color: #1e3a8a; border-top: 3px solid #1e3a8a; padding-top: 15px; margin-top: 10px; }
                        .payment-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; page-break-inside: avoid; }
                        .footer { margin-top: 50px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #eee; padding-top: 30px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div><h1 class="biz-title">${businessName}</h1><div class="biz-details">${businessCity}</div></div>
                        <div><h1 class="invoice-label">INVOICE</h1><div class="invoice-meta">#${invoiceNum}</div><div class="invoice-meta">Issued: ${today}</div></div>
                    </div>
                    <div class="summary-grid">
                        <div class="summary-box">
                            <div class="box-label">Bill To</div>
                            <div class="client-name">${formData.full_name}</div>
                            ${formData.address ? `<div class="info-line">${formData.address}</div>` : ''}
                            ${formData.phone ? `<div class="info-line">${formData.phone}</div>` : ''}
                            ${formData.email ? `<div class="info-line">${formData.email}</div>` : ''}
                        </div>
                        <div class="summary-box" style="background: #f0f9ff; border-color: #bae6fd;">
                            <div class="box-label" style="color: #0284c7; border-color: #bae6fd;">Event Details</div>
                            <div class="info-line"><strong>Date:</strong> ${eventDate}</div>
                            <div class="info-line"><strong>Time:</strong> ${eventTime}</div>
                            <div class="info-line"><strong>Guest Count:</strong> ${guests}</div>
                        </div>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead><tr><th width="55%">Description</th><th width="15%">Guests</th><th width="15%">Rate</th><th width="15%" style="text-align:right">Amount</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <strong style="font-size: 16px; color: #1e293b;">Catering Service Package</strong>
                                        <div class="menu-details">${menuHtml}</div>
                                        ${formData.job_notes ? `<div style="margin-top: 15px; font-size: 13px; color: #64748b;"><strong>Notes:</strong> ${formData.job_notes}</div>` : ''}
                                    </td>
                                    <td style="font-size: 15px; font-weight: bold;">${guests}</td>
                                    <td style="font-size: 15px; font-weight: bold;">$${pricePerHead.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    <td style="text-align:right; font-size: 16px; font-weight: bold;">$${(guests * pricePerHead).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="totals-section">
                        <div class="totals-box">
                            <div class="total-row"><span>Subtotal</span><span>$${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                            <div class="total-row grand-total"><span>Total</span><span>$${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                        </div>
                    </div>
                    <div class="payment-section">
                         <div class="box-label" style="margin-bottom: 20px;">Payment Schedule & Terms</div>
                         ${paymentRowsHtml}
                         <div class="total-row" style="margin-top: 20px; border-top: 2px solid #e2e8f0; padding-top: 15px; font-weight: bold;"><span>Total Paid</span><span style="color: #166534;">$${totalCollected.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                         <div class="total-row" style="font-size: 18px; font-weight: 900; color: #dc2626;"><span>Balance Due</span><span>$${balanceDue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    </div>
                    <div class="footer">Thank you for your business. Please make checks payable to ${businessName}.</div>
                </body>
                </html>
            `
            printViaHiddenFrame(content);
        } catch (error) {
            alert("Error printing invoice: " + error.message)
        }
    }

    const printKitchenSheet = () => {
        const content = `
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
        `
        printViaHiddenFrame(content);
    }

    const sectionStyle = { background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }
    const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }
    const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }
    const timeline = formData.service_data?.timeline || []
    const currentStep = formData.status || 'lead'

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

            {/* CALCULATOR */}
            <div style={sectionStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div><label style={labelStyle}>Event Date</label><input type="date" value={formData.service_data?.event_date || ''} onChange={e => updateService('event_date', e.target.value)} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Service Time</label><input type="time" value={formData.service_data?.event_time || ''} onChange={e => updateService('event_time', e.target.value)} style={inputStyle} /></div>
                    
                    {/* GUEST COUNT */}
                    <div>
                        <label style={labelStyle}>Guest Count</label>
                        <input 
                            type="number" 
                            placeholder="0" 
                            value={localGuests} 
                            onChange={e => setLocalGuests(e.target.value)}
                            onBlur={e => updateService('guest_count', e.target.value)}
                            style={{...inputStyle, fontWeight:'bold', color:'#2563EB'}} 
                        />
                    </div>
                </div>

                <div style={{ background:'#eff6ff', padding:'15px', borderRadius:'8px', border:'1px solid #bfdbfe', display:'flex', gap:'15px', alignItems:'flex-end' }}>
                    
                    {/* PRICE PER PERSON */}
                    <div style={{flex:1}}>
                        <label style={{...labelStyle, color:'#1e40af'}}>Price Per Person ($)</label>
                        <div style={{position:'relative'}}>
                            <DollarSign size={14} style={{position:'absolute', left:'10px', top:'10px', color:'#93c5fd'}}/>
                            <input 
                                type="number" 
                                placeholder="0.00" 
                                value={localPrice}
                                onChange={e => setLocalPrice(e.target.value)} 
                                onBlur={e => updateService('price_per_head', e.target.value)} 
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

            {/* PAYMENT SCHEDULE (WITH STRIPE BUTTONS) */}
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
                        
                        {/* MANUAL TOGGLE (Checkbox) */}
                        <div onClick={() => updatePayment(index, 'paid', !item.paid)} style={{cursor:'pointer', padding:'8px 12px', borderRadius:'6px', background: item.paid ? '#dcfce7' : '#f1f5f9', color: item.paid ? '#16a34a' : '#94a3b8', border: `1px solid ${item.paid ? '#bbf7d0' : '#e2e8f0'}`, display:'flex', alignItems:'center', gap:'6px', fontWeight:'bold', fontSize:'13px', minWidth:'80px', justifyContent:'center'}}>{item.paid ? <><Check size={14}/> Paid</> : 'Unpaid'}</div>
                        
                        {/* STRIPE PAY BUTTON (Only show if UNPAID and has amount) */}
                        {!item.paid && parseFloat(item.amount) > 0 && (
                            <button 
                                onClick={() => handleStripePayment(index, item.amount)} 
                                disabled={processingPayment !== null}
                                style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Pay Online with Stripe"
                            >
                                {processingPayment === index ? <Loader2 className="spin" size={16} /> : <CreditCard size={16} />}
                            </button>
                        )}
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
                <button onClick={printKitchenSheet} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px' }}><Printer size={16} /> Kitchen Sheet</button>
            </div>

            {/* MENU CONFIGURATION */}
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