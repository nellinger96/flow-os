import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User } from 'lucide-react'
import { supabase } from '../supabaseClient'
import ClientList from '../components/clients/ClientList'
import ClientDetail from '../components/clients/ClientDetail'
import GroceryModal from '../components/clients/GroceryModal'

// Columns the Clients page is allowed to write. signed_contract / signed_at
// are only ever written by the signing function or the contract tab.
const EDITABLE_FIELDS = ['full_name', 'email', 'phone', 'address', 'city', 'job_notes', 'job_price', 'status', 'service_data']
const SIGNATURE_KEYS = ['signed_by', 'signed_at', 'terms_accepted']

const isDirty = (draft, saved) => EDITABLE_FIELDS.some(f => JSON.stringify(draft[f] ?? null) !== JSON.stringify(saved[f] ?? null))

// Holds the editable copy of one client. Mounted with key={client.id}, so it
// starts from a fresh copy whenever a different client is opened.
function ClientEditor({ saved, onSaved, onDeleted, onBack, dirtyRef, ...detailProps }) {
    const { t } = useTranslation()
    const [draft, setDraft] = useState(() => structuredClone(saved))
    const [saving, setSaving] = useState(false)
    const [showGrocery, setShowGrocery] = useState(false)
    const dirty = isDirty(draft, saved)

    useEffect(() => { dirtyRef.current = dirty }, [dirty, dirtyRef])
    useEffect(() => () => { dirtyRef.current = false }, [dirtyRef])

    // Warn before closing the tab with unsaved edits
    useEffect(() => {
        if (!dirty) return
        const handler = (e) => { e.preventDefault(); e.returnValue = '' }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [dirty])

    function replace(row) {
        onSaved(row)
        setDraft(structuredClone(row))
    }

    async function save() {
        setSaving(true)
        const payload = Object.fromEntries(EDITABLE_FIELDS.map(f => [f, draft[f] ?? null]))

        // If the client signed while this page was open, keep their signature
        const { data: fresh } = await supabase.from('customers').select('contract_url, service_data').eq('id', draft.id).single()
        if (fresh?.contract_url === 'SIGNED_DIGITALLY' && saved.contract_url !== 'SIGNED_DIGITALLY') {
            payload.status = 'sold'
            payload.service_data = { ...payload.service_data }
            SIGNATURE_KEYS.forEach(k => { if (fresh.service_data?.[k] !== undefined) payload.service_data[k] = fresh.service_data[k] })
        }

        const { data, error } = await supabase.from('customers').update(payload).eq('id', draft.id).select().single()
        setSaving(false)
        if (error) {
            alert(t('clients.saveFailed', { message: error.message }))
            return false
        }
        replace(data)
        return true
    }

    // Save a single change right away (e.g. status), keeping other unsaved edits
    async function quickUpdate(patch) {
        const { data, error } = await supabase.from('customers').update(patch).eq('id', draft.id).select().single()
        if (error) {
            alert(t('clients.saveFailed', { message: error.message }))
            return false
        }
        onSaved(data)
        setDraft(prev => ({ ...prev, ...patch }))
        return true
    }

    async function remove() {
        if (!window.confirm(t('clients.confirmDelete', { name: draft.full_name }))) return
        const { error } = await supabase.from('customers').delete().eq('id', draft.id)
        if (error) return alert(t('clients.deleteFailed', { message: error.message }))
        dirtyRef.current = false
        onDeleted(draft.id)
    }

    return (
        <>
            <ClientDetail
                {...detailProps}
                client={draft}
                setClient={setDraft}
                savedClient={saved}
                onClientReplaced={replace}
                dirty={dirty}
                saving={saving}
                onSave={save}
                onDiscard={() => setDraft(structuredClone(saved))}
                onQuickUpdate={quickUpdate}
                onDelete={remove}
                onBack={onBack}
                onGrocery={() => setShowGrocery(true)}
            />
            {showGrocery && <GroceryModal client={draft} onClose={() => setShowGrocery(false)} />}
        </>
    )
}

export default function Clients() {
    const { t } = useTranslation()
    const [searchParams, setSearchParams] = useSearchParams()
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [menuLibrary, setMenuLibrary] = useState([])
    const [business, setBusiness] = useState(null)
    const dirtyRef = useRef(false)

    const selectedId = searchParams.get('id')
    const selected = clients.find(c => String(c.id) === selectedId) || null

    useEffect(() => {
        let cancelled = false
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }
            const [{ data: customers }, { data: services }] = await Promise.all([
                supabase.from('customers').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                supabase.from('services').select('id, name, category').neq('item_type', 'rental').order('name'),
            ])
            if (cancelled) return
            setBusiness(user.user_metadata || null)
            setClients(customers || [])
            setMenuLibrary(services || [])
            setLoading(false)
        }
        load()
        return () => { cancelled = true }
    }, [])

    const confirmDiscard = () => !dirtyRef.current || window.confirm(t('clients.discardChanges'))

    function open(id) {
        if (String(id ?? '') === (selectedId ?? '') || !confirmDiscard()) return
        setSearchParams(id ? { id: String(id) } : {})
    }

    async function createClient() {
        if (!confirmDiscard()) return
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return alert(t('clients.pleaseLogIn'))
        const { data, error } = await supabase.from('customers')
            .insert({ full_name: t('clients.newClientName'), email: '', phone: '', address: '', city: '', job_price: 0, status: 'lead', service_data: {}, user_id: user.id })
            .select().single()
        if (error) return alert(t('clients.createFailed', { message: error.message }))
        dirtyRef.current = false
        setClients(prev => [data, ...prev])
        setSearchParams({ id: String(data.id) })
    }

    const knownCities = useMemo(() => [...new Set(clients.map(c => c.city?.trim()).filter(Boolean))], [clients])

    return (
        <div className="app-viewport flex bg-slate-50 font-sans">
            <aside className={`${selected ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col border-r border-slate-200 bg-white lg:w-80 xl:w-96`}>
                <ClientList clients={clients} loading={loading} selectedId={selected?.id} onSelect={open} onCreate={createClient} />
            </aside>

            <main className={`${selected ? 'flex' : 'hidden lg:flex'} min-w-0 flex-1 flex-col`}>
                {selected ? (
                    <ClientEditor
                        key={selected.id}
                        saved={selected}
                        dirtyRef={dirtyRef}
                        onSaved={(row) => setClients(prev => prev.map(c => (c.id === row.id ? row : c)))}
                        onDeleted={(id) => { setClients(prev => prev.filter(c => c.id !== id)); setSearchParams({}) }}
                        onBack={() => open(null)}
                        menuLibrary={menuLibrary}
                        onMenuItemCreated={(item) => setMenuLibrary(prev => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)))}
                        knownCities={knownCities}
                        business={business}
                    />
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center text-slate-300">
                        <User size={64} className="mb-4 opacity-60" />
                        {loading ? t('common.loading') : t('clients.selectClient')}
                    </div>
                )}
            </main>
        </div>
    )
}
