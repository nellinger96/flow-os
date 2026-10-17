// Small shared building blocks for the client tabs

export function Card({ title, action, children, className = '' }) {
    return (
        <section className={`mb-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5 ${className}`}>
            {(title || action) && (
                <div className="mb-3 flex items-center justify-between gap-2">
                    {title && <h3 className="text-base font-bold text-slate-900">{title}</h3>}
                    {action}
                </div>
            )}
            {children}
        </section>
    )
}

export function Label({ children, hint }) {
    return (
        <span className="mb-1 block text-sm font-semibold text-slate-700">
            {children}
            {hint && <span className="ml-1 font-normal text-slate-400">· {hint}</span>}
        </span>
    )
}
