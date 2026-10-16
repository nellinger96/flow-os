import { useEffect, useState } from 'react'
import { ChefHat, Loader2, X } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { MENU_CATEGORIES, LEGACY_MENU_FIELD } from '../../lib/menu'

// AI grocery list (on hold; see the project plan). Behavior unchanged from the
// original Clients page, just moved into its own component.
export default function GroceryModal({ client, onClose }) {
    const [list, setList] = useState([])
    const [loading, setLoading] = useState(false)
    const sd = client.service_data || {}
    const guestCount = Number(sd.guest_count) || 0
    const menuItems = [
        ...MENU_CATEGORIES.filter(c => c.food).flatMap(c => sd[c.field] || []),
        ...(sd[LEGACY_MENU_FIELD] || []),
    ]
    const ready = guestCount > 0 && menuItems.length > 0

    useEffect(() => {
        if (!ready) return
        let cancelled = false
        setLoading(true)
        supabase.functions.invoke('grocery-ai', { body: { guest_count: guestCount, menu_items: menuItems } })
            .then(({ data, error }) => {
                if (cancelled) return
                if (error) alert('AI Error: ' + error.message)
                else setList(Array.isArray(data) ? data : [])
            })
            .finally(() => !cancelled && setLoading(false))
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2 text-blue-600"><ChefHat size={20} /></div>
                        <div>
                            <h3 className="m-0 font-bold">AI Chef List</h3>
                            <div className="text-xs text-slate-500">Powered by Gemini</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><X size={22} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                    {!ready ? (
                        <div className="p-8 text-center text-slate-400">Please set the <strong>Guest Count</strong> and <strong>Menu</strong> first.</div>
                    ) : loading ? (
                        <div className="p-8 text-center">
                            <Loader2 className="mx-auto mb-3 animate-spin text-blue-600" size={32} />
                            <div className="font-bold text-slate-700">Calculating ingredients…</div>
                            <div className="mt-1 text-sm text-slate-500">Analyzing menu for {guestCount} people</div>
                        </div>
                    ) : list.length > 0 ? (
                        <div className="divide-y divide-dashed divide-slate-200">
                            {list.map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-3">
                                    <span className="font-medium text-slate-700">{item.item}</span>
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-600">{item.quantity}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-400">No ingredients found. Try adding more menu items.</div>
                    )}
                </div>
            </div>
        </div>
    )
}
