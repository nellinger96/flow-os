import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Loader2 } from 'lucide-react'

export default function StripeCallback() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [status, setStatus] = useState('Connecting to Stripe...')

    useEffect(() => {
        const handleConnection = async () => {
            const code = searchParams.get('code')
            if (!code) return navigate('/settings')

            try {
                const { data: { user } } = await supabase.auth.getUser()
                
                // Call your Edge Function to exchange the code for an ID
                const { data, error } = await supabase.functions.invoke('stripe-connect', {
                    body: { code, user_id: user.id }
                })

                if (error) throw error

                setStatus('Success! Redirecting...')
                setTimeout(() => navigate('/settings'), 1500)
            } catch (error) {
                console.error(error)
                setStatus('Error connecting account. Please try again.')
                setTimeout(() => navigate('/settings'), 3000)
            }
        }
        handleConnection()
    }, [])

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            <Loader2 className="spin" size={48} color="#2563EB" />
            <h2 style={{ color: '#1e293b' }}>{status}</h2>
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}