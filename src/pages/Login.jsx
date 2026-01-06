import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Lock, Mail, Loader2, LayoutGrid, User, Building, ArrowLeft } from 'lucide-react'

export default function Login() {
    // Mode: 'login', 'signup', or 'forgot'
    const [mode, setMode] = useState('login')
    
    // Form State
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [businessName, setBusinessName] = useState('')
    
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [message, setMessage] = useState(null) // Success messages (e.g. "Check your email")
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)
        
        try {
            if (mode === 'signup') {
                // --- SIGN UP LOGIC (Auto-tag as Catering) ---
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            business_name: businessName,
                            business_type: 'Catering' // Hardcoded for simplified version
                        }
                    }
                })
                if (error) throw error
                if (data.user) {
                    alert("Account created! Welcome to Flow OS.")
                    navigate('/') 
                }
            } else if (mode === 'forgot') {
                // --- FORGOT PASSWORD LOGIC ---
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/update-password',
                })
                if (error) throw error
                setMessage("Password reset link sent! Check your email.")
                setLoading(false)
                return 
            } else {
                // --- LOGIN LOGIC ---
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
                navigate('/')
            }
        } catch (err) {
            setError(err.message)
        } finally {
            if (mode !== 'forgot') setLoading(false)
        }
    }

    const toggleMode = (newMode) => {
        setMode(newMode)
        setError(null)
        setMessage(null)
    }

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', overflow: 'hidden' }}>
            
            {/* LEFT SIDE: FORM */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', background: 'white', overflowY: 'auto' }}>
                <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeIn 0.6s ease-out' }}>
                    
                    {/* LOGO AREA */}
                    <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#0f172a', padding: '10px', borderRadius: '12px', color: 'white' }}>
                            <LayoutGrid size={24} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>CATERFLOW OS</h2>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>Catering Edition</span>
                        </div>
                    </div>

                    <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', marginBottom: '10px' }}>
                        {mode === 'login' && 'Welcome back.'}
                        {mode === 'signup' && 'Create Account.'}
                        {mode === 'forgot' && 'Reset Password.'}
                    </h1>
                    <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '16px', lineHeight: '1.5' }}>
                        {mode === 'login' && 'Please enter your credentials to access your workspace.'}
                        {mode === 'signup' && 'Join other kitchen pros running better businesses.'}
                        {mode === 'forgot' && 'Enter your email to receive a recovery link.'}
                    </p>

                    {/* ALERTS */}
                    {error && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Lock size={16} /> {error}
                        </div>
                    )}
                    {message && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Mail size={16} /> {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        
                        {/* SIGN UP FIELDS */}
                        {mode === 'signup' && (
                            <div style={{ animation: 'fadeIn 0.3s' }}>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Full Name</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                                        <input 
                                            required placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)}
                                            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Business Name</label>
                                    <div style={{ position: 'relative' }}>
                                        <Building size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                                        <input 
                                            required placeholder="Apex Catering" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                                            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* EMAIL (All Modes) */}
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                                <input 
                                    type="email" required placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
                                    style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        {/* PASSWORD (Login & Signup only) */}
                        {mode !== 'forgot' && (
                            <div style={{ marginBottom: '15px' }}>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Password</label>
                                    {mode === 'login' && (
                                        <button 
                                            type="button"
                                            onClick={() => toggleMode('forgot')}
                                            style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            Forgot password?
                                        </button>
                                    )}
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                                    <input 
                                        type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                        )}

                        <button 
                            type="submit" disabled={loading}
                            style={{ 
                                width: '100%', padding: '14px', borderRadius: '8px', border: 'none', 
                                background: '#0f172a', color: 'white', fontSize: '16px', fontWeight: 'bold', 
                                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', marginTop: '10px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                            }}
                        >
                            {loading ? <Loader2 size={20} className="spin" /> : <>
                                {mode === 'login' && <>Sign In <ArrowRight size={20} /></>}
                                {mode === 'signup' && <>Create Account <ArrowRight size={20} /></>}
                                {mode === 'forgot' && <>Send Reset Link <ArrowRight size={20} /></>}
                            </>}
                        </button>
                    </form>

                    {/* FOOTER SWITCHERS */}
                    <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
                        {mode === 'login' && (
                            <>
                                Don't have an account? <button onClick={() => toggleMode('signup')} style={linkStyle}>Create one</button>
                            </>
                        )}
                        {mode === 'signup' && (
                            <>
                                Already have an account? <button onClick={() => toggleMode('login')} style={linkStyle}>Sign In</button>
                            </>
                        )}
                        {mode === 'forgot' && (
                            <button onClick={() => toggleMode('login')} style={{...linkStyle, display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', margin:'0 auto'}}>
                                <ArrowLeft size={14}/> Back to Sign In
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: BRAND VISUAL */}
            <div style={{ flex: '1.2', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', background: '#3b82f6', borderRadius: '50%', opacity: '0.2', filter: 'blur(80px)' }}></div>
                <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '400px', height: '400px', background: '#ec4899', borderRadius: '50%', opacity: '0.2', filter: 'blur(80px)' }}></div>
                
                <div style={{ color: 'white', maxWidth: '450px', zIndex: 10, padding: '40px' }}>
                    <div style={{ fontSize: '36px', fontWeight: '800', marginBottom: '20px', lineHeight: '1.2' }}>
                        {mode === 'login' ? '"Simplicity is the ultimate sophistication."' : mode === 'signup' ? '"The secret of getting ahead is getting started."' : '"Recovery is part of the process."'}
                    </div>
                    <div style={{ fontSize: '18px', opacity: 0.8, lineHeight: '1.6', fontWeight: '300' }}>
                        Manage your menus, track your events, and streamline your kitchen operations with CaterFlow OS.
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @media (max-width: 900px) { div[style*="flex: 1.2"] { display: none !important; } }
            `}</style>
        </div>
    )
}

const linkStyle = { background: 'none', border: 'none', color: '#2563EB', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }