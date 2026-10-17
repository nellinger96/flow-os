import { supabase } from '../supabaseClient'

// Create a new lead (optionally with service_data such as an event date) and
// return its id, or null if it failed (the user has already been told why).
export async function createLead(t, serviceData = {}) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        alert(t('clients.pleaseLogIn'))
        return null
    }
    const { data, error } = await supabase.from('customers')
        .insert({ full_name: t('clients.newClientName'), email: '', phone: '', address: '', city: '', job_price: 0, status: 'lead', service_data: serviceData, user_id: user.id })
        .select('id').single()
    if (error) {
        alert(t('clients.createFailed', { message: error.message }))
        return null
    }
    return data.id
}
