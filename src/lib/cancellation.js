import { parseLocalDate, toNumber } from './format'

export const CANCELED = 'canceled'

// What the contract terms say when an event is canceled (terms version 1):
//   - the deposit is non-refundable
//   - less than 30 days before the event: 50% of the total
//   - less than 7 days before the event: the full total
// The owner can change the amount before confirming (e.g. to waive the fee).
export function suggestCancellation(client, cancelDateISO) {
    const sd = client.service_data || {}
    const total = toNumber(client.job_price)
    const plan = Array.isArray(sd.payment_plan) ? sd.payment_plan : []
    const paid = plan.reduce((s, p) => (p.paid ? s + toNumber(p.amount) : s), 0)
    const deposit = plan[0] && plan[0].paid ? toNumber(plan[0].amount) : 0
    const signed = Boolean(client.contract_url)

    const event = parseLocalDate(sd.event_date)
    const canceled = parseLocalDate(cancelDateISO)
    const daysBefore = event && canceled ? Math.round((event - canceled) / 86400000) : null

    let rule = 'deposit'
    let fee = deposit
    if (daysBefore !== null && daysBefore < 7) { rule = 'under7'; fee = total }
    else if (daysBefore !== null && daysBefore < 30) { rule = 'under30'; fee = Math.max(deposit, Math.round(total * 50) / 100) }
    if (!signed) { rule = 'unsigned'; fee = 0 }

    return { total, paid, deposit, daysBefore, rule, fee: Math.min(fee, total), signed }
}

// Money left to settle once the fee is decided
export function settlement(paid, fee) {
    const p = toNumber(paid)
    const f = toNumber(fee)
    return { refund: Math.max(p - f, 0), owes: Math.max(f - p, 0) }
}

// Still something to do about money after a cancellation?
export function cancellationPending(c) {
    const x = c?.service_data?.cancellation
    if (!x) return false
    return (toNumber(x.owes) > 0 && !x.fee_paid) || (toNumber(x.refund) > 0 && !x.refund_done)
}
