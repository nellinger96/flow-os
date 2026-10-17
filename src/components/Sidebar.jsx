import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase, isTestDatabase } from '../supabaseClient'
import { LANGUAGES } from '../i18n'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Users, FileText, BarChart3, Settings, LogOut, X, Calendar, Truck } from 'lucide-react'

export default function Sidebar({ isOpen, onClose, onLogout }) {
    const navigate = useNavigate()
    const location = useLocation()
    const { t, i18n } = useTranslation()
    const [businessName, setBusinessName] = useState('My Business')

    // Fetch Business Name on Load
    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.user_metadata?.business_name) {
                setBusinessName(user.user_metadata.business_name)
            }
        }
        getProfile()
    }, [])

    // Define menu items (Tracker Removed)
    const menuItems = [
        { label: t('nav.dashboard'), path: '/', icon: <Home size={20} /> },
        { label: t('nav.calendar'), path: '/calendar', icon: <Calendar size={20} /> },
        { label: t('nav.loadout'), path: '/loadout', icon: <Truck size={20} /> },
        { label: t('nav.directory'), path: '/clients', icon: <Users size={20} /> },
        { label: t('nav.invoices'), path: '/invoices', icon: <FileText size={20} /> },
        { label: t('nav.analytics'), path: '/analytics', icon: <BarChart3 size={20} /> },
        { label: t('nav.settings'), path: '/settings', icon: <Settings size={20} /> },
    ]

    const activeStyle = { background: '#2563EB', color: 'white' }

    return (
        <>
            {/* OVERLAY FOR MOBILE */}
            {isOpen && (
                <div 
                    onClick={onClose}
                    style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 9998 }}
                />
            )}

            {/* SIDEBAR */}
            <div style={{
                width: '260px', height: '100vh', background: 'white', borderRight: '1px solid #e2e8f0',
                position: 'fixed', top: 0, left: isOpen ? 0 : '-260px', transition: 'left 0.3s ease', zIndex: 9999,
                display: 'flex', flexDirection: 'column'
            }}>
                {/* --- CUSTOM BRAND HEADER --- */}
                <div style={{ padding: '25px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '800', lineHeight: '1.2' }}>
                            {businessName}
                        </h2>
                        <div style={{ 
                            fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', 
                            letterSpacing: '2px', marginTop: '6px', textTransform: 'uppercase' 
                        }}>
                            CATERFLOW OS
                        </div>
                        {isTestDatabase && <div style={{ marginTop: '6px', display: 'inline-block', background: '#fef3c7', color: '#b45309', fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px' }}>{t('common.testData')}</div>}
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}>
                        <X size={24} />
                    </button>
                </div>

                {/* MENU ITEMS */}
                <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {menuItems.map(item => {
                        const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
                        return (
                            <button
                                key={item.path}
                                onClick={() => { navigate(item.path); onClose(); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '12px 15px', borderRadius: '8px', border: 'none',
                                    fontSize: '14px', fontWeight: '500', cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    ...(isActive ? activeStyle : { background: 'transparent', color: '#64748b' })
                                }}
                                onMouseOver={(e) => !isActive && (e.currentTarget.style.background = '#f8fafc')}
                                onMouseOut={(e) => !isActive && (e.currentTarget.style.background = 'transparent')}
                            >
                                {item.icon} {item.label}
                            </button>
                        )
                    })}
                </div>

                {/* FOOTER */}
                <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>{t('common.language')}</div>
                        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                            {LANGUAGES.map(l => (
                                <button
                                    key={l.code}
                                    onClick={() => i18n.changeLanguage(l.code)}
                                    style={{ flex: 1, padding: '6px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', background: i18n.language === l.code ? 'white' : 'transparent', color: i18n.language === l.code ? '#2563EB' : '#64748b', boxShadow: i18n.language === l.code ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                                >
                                    {l.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button 
                        onClick={onLogout}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', width: '100%', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        <LogOut size={20} /> {t('nav.signOut')}
                    </button>
                </div>
            </div>
        </>
    )
}