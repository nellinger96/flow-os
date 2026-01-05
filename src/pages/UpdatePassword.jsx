import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function UpdatePassword() {
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    async function handlePasswordReset(e) {
        e.preventDefault()
        setLoading(true)

        // The user is technically "logged in" temporarily when they click the email link.
        // We just need to update their user object.
        const { error } = await supabase.auth.updateUser({ password: password })

        if (error) {
            alert("Error: " + error.message)
        } else {
            alert("Password updated successfully! Redirecting...")
            navigate('/') // Go back to home/dashboard
        }
        setLoading(false)
    }

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontFamily:'sans-serif' }}>
            <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '350px' }}>
                <h2 style={{ textAlign: 'center', color: '#1e293b' }}>🔐 New Password</h2>
                <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '20px', fontSize:'14px' }}>
                    Enter your new password below.
                </p>

                <form onSubmit={handlePasswordReset}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>New Password</label>
                        <input 
                            type="password" 
                            required 
                            minLength={6}
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }} 
                        />
                    </div>
                    <button disabled={loading} style={{ width: '100%', padding: '12px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    )
}