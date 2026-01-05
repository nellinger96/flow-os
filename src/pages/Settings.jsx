import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Trash2, Save, ArrowLeft, Building, Utensils, Coffee, Salad, Beef, Edit2, X, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
    const [profile, setProfile] = useState({ business_name: '', city: '', state: '' })
    const [items, setItems] = useState([])
    const [newItem, setNewItem] = useState({ name: '', category: 'Entree', description: '' }) 
    const [editingId, setEditingId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [savingProfile, setSavingProfile] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.user_metadata) {
                setProfile({
                    business_name: user.user_metadata.business_name || '',
                    city: user.user_metadata.city || '',
                    state: user.user_metadata.state || ''
                })
            }
            const { data } = await supabase.from('services').select('*').order('created_at', { ascending: true })
            setItems(data?.filter(i => i.item_type !== 'rental') || [])
            setLoading(false)
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
    }

    async function deleteItem(id) {
        if (!confirm("Delete this item?")) return
        await supabase.from('services').delete().eq('id', id)
        setItems(items.filter(i => i.id !== id))
    }

    const getIcon = (cat) => {
        if (cat === 'Drink') return <Coffee size={16} color="#d97706"/>
        if (cat === 'Side') return <Salad size={16} color="#16a34a"/>
        return <Beef size={16} color="#e11d48"/>
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', paddingBottom:'80px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><ArrowLeft size={24} /></button>
                <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Settings</h1>
            </div>

            {/* BUSINESS PROFILE */}
            <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><Building size={20} color="#3b82f6" /> Business Profile</h3>
                    <button onClick={saveProfile} disabled={savingProfile} style={{ background: '#0f172a', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Save size={16} /> {savingProfile ? 'Saving...' : 'Save'}
                    </button>
                </div>
                <div className="profile-grid">
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Business Name</label>
                        <input value={profile.business_name} onChange={e => setProfile({...profile, business_name: e.target.value})} placeholder="e.g. Apex Catering" className="std-input" />
                    </div>
                    <div className="city-state-grid">
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>City</label>
                            <input value={profile.city} onChange={e => setProfile({...profile, city: e.target.value})} placeholder="e.g. Miami" className="std-input" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>State</label>
                            <input value={profile.state} onChange={e => setProfile({...profile, state: e.target.value})} placeholder="e.g. FL" className="std-input" />
                        </div>
                    </div>
                </div>
            </div>

            {/* MENU MANAGER */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '25px' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                    <h3 style={{ margin: 0, display:'flex', alignItems:'center', gap:'10px' }}><Utensils size={20} color="#f59e0b"/> Menu Items</h3>
                    {editingId && <button onClick={resetForm} style={{background:'#fee2e2', color:'#dc2626', border:'none', padding:'6px 12px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', fontSize:'12px', display:'flex', gap:'5px', alignItems:'center'}}><X size={14}/> Cancel</button>}
                </div>

                <div className={`input-grid ${editingId ? 'editing' : ''}`}>
                    <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="std-input">
                        <option value="Entree">Entree</option>
                        <option value="Side">Side</option>
                        <option value="Drink">Drink</option>
                    </select>
                    <input placeholder="Item Name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="std-input" />
                    <input placeholder="Description" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="std-input" />
                    
                    <button onClick={handleSaveItem} style={{ background: editingId ? '#ea580c' : '#2563EB', color: 'white', border: 'none', height: '42px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                        {editingId ? <Check size={20} /> : <Plus size={20} />}
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {items.map(s => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: editingId === s.id ? '2px solid #fdba74' : '1px solid #f1f5f9', borderRadius: '8px', background: editingId === s.id ? '#fff7ed' : 'white' }}>
                            <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                                <div style={{background:'#f8fafc', padding:'8px', borderRadius:'8px'}}>{getIcon(s.category)}</div>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: '#334155' }}>{s.name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{s.category}</div>
                                </div>
                            </div>
                            <div style={{display:'flex', gap:'5px'}}>
                                <button onClick={() => startEditing(s)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#334155', padding: '8px', borderRadius: '6px' }}><Edit2 size={16} /></button>
                                <button onClick={() => deleteItem(s.id)} style={{ background: '#fef2f2', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '8px', borderRadius: '6px' }}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                .std-input { padding: 10px; borderRadius: 6px; border: 1px solid #cbd5e1; width: 100%; box-sizing: border-box; }
                .profile-grid { display: grid; gap: 15px; }
                .city-state-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .input-grid { display: grid; grid-template-columns: 1fr 2fr 2fr 60px; gap: 10px; align-items: center; background: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px dashed #cbd5e1; }
                .input-grid.editing { background: #fff7ed; border: 1px solid #fdba74; }

                @media (max-width: 768px) {
                    .input-grid { grid-template-columns: 1fr; gap: 15px; }
                    .city-state-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    )
}