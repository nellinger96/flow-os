import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Trash2, Save, ArrowLeft, Building, Utensils, Coffee, Salad, Beef, Edit2, X, Check, CreditCard, CheckCircle, ExternalLink, LogOut, CakeSlice, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const MENU_SECTIONS = [
    { key: 'Entree', singular: 'Entree', label: 'Entrees', color: '#be123c', Icon: Beef },
    { key: 'Side', singular: 'Side', label: 'Sides', color: '#15803d', Icon: Salad },
    { key: 'Drink', singular: 'Drink', label: 'Drinks', color: '#b45309', Icon: Coffee },
    { key: 'Dessert', singular: 'Dessert', label: 'Desserts', color: '#db2777', Icon: CakeSlice },
    { key: 'Supplies', singular: 'Supplies', label: 'Supplies (not counted as food)', color: '#475569', Icon: Package },
]

export default function Settings() {
    const [profile, setProfile] = useState({ business_name: '', city: '', state: '', stripe_account_id: null })
    const [items, setItems] = useState([])
    const [newItem, setNewItem] = useState({ name: '', category: 'Entree', description: '' }) 
    const [editingId, setEditingId] = useState(null)
    const [savingProfile, setSavingProfile] = useState(false)
    const navigate = useNavigate()

    // --- STRIPE CONFIGURATION ---
    // NOTE: When you go live, you will change this Client ID to the Live one!
    const STRIPE_CLIENT_ID = 'ca_U6kYuZzJeEPABPOFJCuVBoMFafdBLFhN'
    const REDIRECT_URI = 'https://caterflowos.netlify.app/'
    const stripeConnectUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${STRIPE_CLIENT_ID}&scope=read_write&redirect_uri=${REDIRECT_URI}`

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            
            // 1. Get Basic Info
            let currentProfile = {
                business_name: user?.user_metadata?.business_name || '',
                city: user?.user_metadata?.city || '',
                state: user?.user_metadata?.state || '',
                stripe_account_id: null
            }

            // 2. Get Stripe Status
            if (user) {
                const { data: dbProfile } = await supabase.from('profiles').select('stripe_account_id').eq('id', user.id).single()
                if (dbProfile) {
                    currentProfile.stripe_account_id = dbProfile.stripe_account_id
                }
            }
            setProfile(currentProfile)

            // 3. Get Menu Items
            const { data } = await supabase.from('services').select('*').order('created_at', { ascending: true })
            setItems(data?.filter(i => i.item_type !== 'rental') || [])
        }
        init()
    }, [])

    async function saveProfile() {
        setSavingProfile(true)
        const { error } = await supabase.auth.updateUser({ data: { business_name: profile.business_name, city: profile.city, state: profile.state } })
        setSavingProfile(false)
        if (error) alert("Error saving profile")
        else alert("Profile updated!")
    }

    async function disconnectStripe() {
        if (!confirm("Are you sure you want to disconnect? You won't be able to accept payments until you reconnect.")) return
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase.from('profiles').update({ stripe_account_id: null }).eq('id', user.id)
            if (error) throw error
            setProfile(prev => ({ ...prev, stripe_account_id: null }))
            alert("Bank account disconnected.")
        } catch (error) {
            alert("Error disconnecting: " + error.message)
        }
    }

    async function handleSaveItem() {
        if (!newItem.name) return alert("Item Name required")
        const { data: { user } } = await supabase.auth.getUser()
        const payload = { name: newItem.name, description: newItem.description, category: newItem.category, item_type: 'catering', user_id: user.id }

        if (editingId) {
            await supabase.from('services').update(payload).eq('id', editingId)
        } else {
            await supabase.from('services').insert(payload)
        }
        resetForm()
        const { data } = await supabase.from('services').select('*').order('created_at', { ascending: true })
        setItems(data?.filter(i => i.item_type !== 'rental') || [])
    }

    function resetForm() {
        setEditingId(null)
        setNewItem({ name: '', category: 'Entree', description: '' })
    }

    function startEditing(item) {
        setEditingId(item.id)
        setNewItem({ name: item.name, category: item.category || 'Entree', description: item.description || '' })
        // Scroll to input
        document.getElementById('menu-input').scrollIntoView({ behavior: 'smooth' })
    }

    async function deleteItem(id) {
        if (!confirm("Delete this item?")) return
        await supabase.from('services').delete().eq('id', id)
        setItems(items.filter(i => i.id !== id))
    }

    // Helper to group items by category
    const getItemsByCategory = (cat) => items.filter(i => i.category === cat)

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', paddingBottom:'80px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><ArrowLeft size={24} /></button>
                <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Settings</h1>
            </div>

            {/* STRIPE SETTINGS */}
            <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                    <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '50%' }}><CreditCard size={24} color="#2563EB" /></div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Payout Settings</h3>
                        <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '14px' }}>Connect your bank to receive client payments.</p>
                    </div>
                </div>
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    {profile.stripe_account_id ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#166534', fontWeight: 'bold' }}>
                                    <CheckCircle size={20} /><span>Bank Account Connected</span>
                                </div>
                                <button onClick={disconnectStripe} style={{ background: 'none', border: 'none', padding: 0, color: '#ef4444', fontSize: '12px', cursor: 'pointer', textAlign: 'left', textDecoration: 'underline', marginTop: '4px' }}>Disconnect / Reset</button>
                            </div>
                            <span style={{ fontSize: '12px', background: '#dcfce7', padding: '6px 12px', borderRadius: '20px', border: '1px solid #bbf7d0', color: '#15803d', fontWeight:'bold' }}>Active</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ fontSize: '14px', color: '#475569' }}>Connect Stripe to start charging clients immediately.</div>
                            <a href={stripeConnectUrl} style={{ background: '#635bff', color: 'white', padding: '12px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '10px', width: 'fit-content' }}>
                                <CreditCard size={18} /> Setup Payouts <ExternalLink size={14}/>
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* BUSINESS PROFILE */}
            <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Building size={20} color="#3b82f6" /> Business Profile</h3>
                    <button onClick={saveProfile} disabled={savingProfile} style={{ background: '#0f172a', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>{savingProfile ? 'Saving...' : 'Save'}</button>
                </div>
                <div className="profile-grid">
                    <div><label className="lbl">Business Name</label><input value={profile.business_name} onChange={e => setProfile({...profile, business_name: e.target.value})} className="std-input" /></div>
                    <div className="city-state-grid">
                        <div><label className="lbl">City</label><input value={profile.city} onChange={e => setProfile({...profile, city: e.target.value})} className="std-input" /></div>
                        <div><label className="lbl">State</label><input value={profile.state} onChange={e => setProfile({...profile, state: e.target.value})} className="std-input" /></div>
                    </div>
                </div>
            </div>

            {/* NEW MENU MANAGER */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '25px' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                    <h3 style={{ margin: 0, display:'flex', alignItems:'center', gap:'10px' }}><Utensils size={20} color="#f59e0b"/> Menu Manager</h3>
                    {editingId && <button onClick={resetForm} style={{background:'#fee2e2', color:'#dc2626', border:'none', padding:'6px 12px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', fontSize:'12px', display:'flex', gap:'5px', alignItems:'center'}}><X size={14}/> Cancel Edit</button>}
                </div>

                {/* Input Area */}
                <div id="menu-input" className={`input-grid ${editingId ? 'editing' : ''}`}>
                    <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="std-input">
                        {MENU_SECTIONS.map(({ key, singular }) => <option key={key} value={key}>{singular}</option>)}
                    </select>
                    <input placeholder="New Item Name (e.g. Tacos)" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="std-input" />
                    <button onClick={handleSaveItem} style={{ background: editingId ? '#ea580c' : '#2563EB', color: 'white', border: 'none', height: '42px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {editingId ? <Check size={20} /> : <Plus size={20} />}
                    </button>
                </div>

                {/* VISUAL MENU DISPLAY */}
                <div style={{ display: 'grid', gap: '20px', marginTop: '30px' }}>
                    
                    {MENU_SECTIONS.map(({ key, label, color, Icon }) => (
                        <div key={key} className="menu-section">
                            <h4 style={{margin: '0 0 10px 0', color, display:'flex', alignItems:'center', gap:'8px'}}><Icon size={18}/> {label}</h4>
                            <div className="tag-container">
                                {getItemsByCategory(key).length === 0 && <span className="empty-msg">No {label.toLowerCase()} yet.</span>}
                                {getItemsByCategory(key).map(item => (
                                    <div key={item.id} className="menu-tag" onClick={() => startEditing(item)}>
                                        {item.name}
                                        <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="del-btn"><X size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                </div>
            </div>

            <style>{`
                .std-input { padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; width: 100%; box-sizing: border-box; }
                .lbl { display: block; font-size: 13px; font-weight: bold; color: #475569; margin-bottom: 5px; }
                .profile-grid { display: grid; gap: 15px; }
                .city-state-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .input-grid { display: grid; grid-template-columns: 1fr 2fr 60px; gap: 10px; align-items: center; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px dashed #cbd5e1; }
                .input-grid.editing { background: #fff7ed; border: 1px solid #fdba74; }
                
                /* NEW STYLES FOR MENU TAGS */
                .menu-section { background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #f1f5f9; }
                .tag-container { display: flex; flex-wrap: wrap; gap: 8px; }
                .menu-tag { 
                    background: white; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 20px; 
                    font-size: 14px; color: #334155; cursor: pointer; display: flex; alignItems: center; gap: 8px;
                    transition: all 0.1s;
                }
                .menu-tag:hover { border-color: #3b82f6; color: #3b82f6; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                .del-btn { background: #fef2f2; border: none; color: #ef4444; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
                .del-btn:hover { background: #fee2e2; }
                .empty-msg { font-size: 13px; color: #94a3b8; font-style: italic; }

                @media (max-width: 768px) {
                    .input-grid { grid-template-columns: 1fr; gap: 15px; }
                    .city-state-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    )
}