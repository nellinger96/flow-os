import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'

// Full-screen panel on phones, slide-over panel on larger screens
export default function Sheet({ title, onClose, footer, children }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div className="fixed inset-0 z-[9995] flex justify-end bg-black/40" onClick={onClose}>
            <div className="flex h-full w-full flex-col bg-slate-50 shadow-2xl md:max-w-xl" onClick={e => e.stopPropagation()} role="dialog" aria-label={title}>
                <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Back">
                        <ArrowLeft size={22} />
                    </button>
                    <h2 className="min-w-0 flex-1 truncate text-lg font-bold text-slate-900">{title}</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4">{children}</div>
                {footer && (
                    <div className="border-t border-slate-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
                )}
            </div>
        </div>
    )
}
