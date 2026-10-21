import { useTranslation } from 'react-i18next'
import { PIPELINE } from '../../lib/status'

const COLORS = {
    lead: 'bg-slate-100 text-slate-600',
    tasting: 'bg-amber-100 text-amber-700',
    proposal: 'bg-blue-100 text-blue-700',
    sold: 'bg-green-100 text-green-700',
    canceled: 'bg-red-100 text-red-700',
}

export default function StatusBadge({ status, small }) {
    const { t } = useTranslation()
    const s = status === 'canceled' || PIPELINE.includes(status) ? status : 'lead'
    return (
        <span className={`shrink-0 rounded-full font-bold ${COLORS[s]} ${small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}`}>
            {t(`status.${s}`)}
        </span>
    )
}
