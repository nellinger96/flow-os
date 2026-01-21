import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, Mail, Lock, Chrome, CheckCircle } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const [strength, setStrength] = useState(0)
    const navigate = useNavigate()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) navigate('/dashboard')
        })
    }, [navigate])

    useEffect(() => {
        if (!password) { setStrength(0); return }
        let score = 0
        if (password.length > 6) score += 1
        if (password.length > 10) score += 1
        if (/[A-Z]/.test(password)) score += 1
        if (/[0-9]/.test(password)) score += 1
        if (/[^A-Za-z0-9]/.test(password)) score += 1
        setStrength(score)
    }, [password])

    const getStrengthColor = () => {
        if (strength <= 2) return '#ef4444'
        if (strength <= 3) return '#eab308'
        return '#22c55e'
    }

    const getStrengthLabel = () => {
        if (strength <= 2) return 'Weak'
        if (strength <= 3) return 'Medium'
        return 'Strong'
    }

    async function handleAuth(e) {
        e.preventDefault()
        setLoading(true)
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: { data: { business_name: 'My Catering Co.' } }
                })
                if (error) throw error
                alert("Success! Check your email for the confirmation link.")
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
                navigate('/dashboard')
            }
        } catch (error) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleGoogleLogin() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/dashboard` }
        })
        if (error) alert(error.message)
    }

    return (
        <div className="login-container">
            
            {/* LEFT: FORM SECTION */}
            <div className="form-section">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ marginBottom: '40px' }}>
                        <div style={{ background: '#0f172a', color: 'white', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '20px', fontSize:'18px' }}>CF</div>
                        <h1 style={{ fontSize: '32px', margin: '0 0 10px 0', color: '#1e293b', fontWeight:'800' }}>{isSignUp ? 'Create Account' : 'Welcome back.'}</h1>
                        <p style={{ color: '#64748b', margin: 0, fontSize:'15px' }}>
                            {isSignUp ? 'Start managing your catering business today.' : 'Enter your credentials to access your workspace.'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '15px', top: '14px' }} />
                                <input 
                                    type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="chef@example.com"
                                    style={{ width: '100%', padding: '12px 12px 12px 45px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing:'border-box' }}
                                />
                            </div>
                        </div>

                        <div>
                            <div style={{ display:'flex', justifyContent:'space-between' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Password</label>
                                {!isSignUp && <span style={{ fontSize:'12px', color:'#2563EB', cursor:'pointer' }}>Forgot password?</span>}
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '15px', top: '14px' }} />
                                <input 
                                    type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                                    style={{ width: '100%', padding: '12px 12px 12px 45px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing:'border-box' }}
                                />
                            </div>
                            {isSignUp && password.length > 0 && (
                                <div style={{ marginTop: '12px', background:'#f8fafc', padding:'10px', borderRadius:'8px', border:'1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'5px', fontWeight:'bold', color: getStrengthColor() }}>
                                        <span>Strength</span><span>{getStrengthLabel()}</span>
                                    </div>
                                    <div style={{ display: 'flex', height: '4px', gap: '5px' }}>
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} style={{ flex: 1, borderRadius: '2px', background: strength >= i ? getStrengthColor() : '#e2e8f0', transition: '0.3s' }}></div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button type="submit" disabled={loading} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
                            {loading ? <Loader2 className="spin" size={20}/> : (isSignUp ? 'Create Account' : 'Sign In')}
                        </button>
                    </form>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', margin: '30px 0' }}>
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>OR CONTINUE WITH</div>
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                    </div>

                    <button onClick={handleGoogleLogin} style={{ background: 'white', border: '1px solid #cbd5e1', color: '#475569', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <Chrome size={18} color="#EA4335" /> Google
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '14px', color: '#64748b' }}>
                        {isSignUp ? "Already have an account?" : "Don't have an account?"}
                        <button onClick={() => { setIsSignUp(!isSignUp); setPassword(''); }} style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 'bold', cursor: 'pointer', marginLeft: '5px' }}>
                            {isSignUp ? 'Sign In' : 'Create one'}
                        </button>
                    </div>
                </div>

                {/* STRIPE COMPLIANCE FOOTER (Added Here) */}
                <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', padding: '20px 0', borderTop: '1px solid #f1f5f9' }}>
                    <Link to="/privacy" style={{ cursor: 'pointer', marginRight: '15px', textDecoration: 'none', color: '#94a3b8' }}>Privacy Policy</Link>
                    <Link to="/terms" style={{ cursor: 'pointer', marginRight: '15px', textDecoration: 'none', color: '#94a3b8' }}>Terms of Service</Link>
                    <span>© 2026 CaterFlow OS</span>
                </div>
            </div>

            {/* RIGHT: IMAGE SECTION (Hidden on Mobile) */}
            <div className="image-section">
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(circle at 30% 30%, #1e293b 0%, #0f172a 100%)' }}></div>
                <div style={{ position: 'relative', zIndex: 10, maxWidth: '400px', padding: '40px' }}>
                    <h2 style={{ fontSize: '48px', fontWeight: '800', lineHeight: '1.1', marginBottom: '20px', letterSpacing:'-1px' }}>
                        Scale your <br/> <span style={{color:'#60a5fa'}}>Catering Business</span>
                    </h2>
                    <p style={{ fontSize: '18px', opacity: 0.7, lineHeight: '1.6', fontWeight:'300' }}>
                        Manage menus, track payments, and streamline your kitchen operations.
                    </p>
                    <div style={{ marginTop:'40px', display:'flex', alignItems:'center', gap:'15px', fontSize:'13px', opacity:0.8 }}>
                        <CheckCircle size={16} color="#22c55e" /> Free 14-day trial
                        <CheckCircle size={16} color="#22c55e" /> No credit card required
                    </div>
                </div>
            </div>

            {/* RESPONSIVE CSS STYLES */}
            <style>{`
                .login-container {
                    display: flex;
                    min-height: 100vh;
                    font-family: sans-serif;
                    background: white;
                }
                .form-section {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between; /* Ensures footer stays at bottom if height allows */
                    padding: 40px 60px;
                    max-width: 500px;
                    height: 100vh;
                    box-sizing: border-box;
                    overflow-y: auto;
                }
                .image-section {
                    flex: 1.2;
                    background: #0f172a;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    position: relative;
                    overflow: hidden;
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                /* MOBILE RULES */
                @media (max-width: 900px) {
                    .image-section { display: none; } /* Hide image on tablet/mobile */
                    .form-section { 
                        max-width: 100%; 
                        padding: 20px; 
                    }
                }
            `}</style>
        </div>
    )
}