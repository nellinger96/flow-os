import { useTranslation } from 'react-i18next'
import { PIPELINE } from '../../lib/status'

const COLORS = {
    lead: 'bg-slate-100 text-slate-600',
    tasting: 'bg-amber-100 text-amber-700',
    proposal: 'bg-blue-100 text-blue-700',
    sold: 'bg-green-100 text-green-700',
}

export default function StatusBadge({ status, small }) {
    const { t } = useTranslation()
    const s = PIPELINE.includes(status) ? status : 'lead'
    return (
        <span className={`shrink-0 rounded-full font-bold uppercase tracking-wide ${COLORS[s]} ${small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}>
            {t(`status.${s}`)}
        </span>
    )
}
