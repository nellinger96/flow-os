import { toNumber } from '../../lib/format'

// Update one or more service_data fields. When guests or price per person
// change and both are set, the contract total is recalculated (a total typed
// in by hand for flat-rate jobs is left alone otherwise).
export function patchServiceData(setClient, patch) {
    setClient(prev => {
        const service_data = { ...(prev.service_data || {}), ...patch }
        let job_price = prev.job_price
        if ('guest_count' in patch || 'price_per_head' in patch) {
            const guests = toNumber(service_data.guest_count)
            const price = toNumber(service_data.price_per_head)
            if (guests > 0 && price > 0) job_price = Math.round(guests * price * 100) / 100
        }
        return { ...prev, service_data, job_price }
    })
}
