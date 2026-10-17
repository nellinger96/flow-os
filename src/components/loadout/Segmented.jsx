// Two or more big toggle buttons in a row (e.g. Loading / Packing back)
export default function Segmented({ value, onChange, options }) {
    return (
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5">
            {options.map(([key, label]) => (
                <button key={key} onClick={() => onChange(key)} className={`flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-bold transition sm:px-3 ${value === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                    {label}
                </button>
            ))}
        </div>
    )
}
