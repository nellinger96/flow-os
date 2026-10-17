import { toNumber } from './format'

// "2026-10-12" (or the date part of a timestamp), ignoring junk like "TBD"
export function isoDay(value) {
    const v = String(value || '').slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= '2000-01-01' ? v : ''
}

// Where a booked client stands on money. Shared by Invoices, Calendar and the
// dashboard so every page agrees.
//
// The job price is the contract total. Scheduled payments come from
// service_data.payment_plan; records saved before schedules existed fall back
// to the old deposit / final payment fields. Whatever the schedule doesn't
// cover is due by the event date.
export function paymentSummary(client, today) {
    const sd = client.service_data || {}
    const total = toNumber(client.job_price)
    const eventDate = isoDay(sd.event_date || sd.service_date)
    const plan = Array.isArray(sd.payment_plan) ? sd.payment_plan : []

    let paid = 0
    const dues = [] // unpaid amounts: { index, date, amount, late, unscheduled }

    if (plan.length) {
        plan.forEach((p, index) => {
            const amount = toNumber(p.amount)
            if (p.paid) paid += amount
            else if (amount > 0) dues.push({ index, date: isoDay(p.date), amount })
        })
    } else {
        const isPaid = (v) => String(v || '').toLowerCase() === 'paid'
        if (isPaid(sd.payment_1_status || sd.deposit_status)) paid += toNumber(sd.payment_1_amount || sd.deposit_amount)
        if (isPaid(sd.payment_2_status || sd.final_payment_status)) paid += toNumber(sd.payment_2_amount || sd.final_payment_amount)
    }

    const balance = Math.max(total - paid, 0)
    const scheduledUnpaid = dues.reduce((s, d) => s + d.amount, 0)
    const unscheduled = Math.max(balance - scheduledUnpaid, 0)
    if (unscheduled > 0) dues.push({ index: null, date: eventDate, amount: unscheduled, unscheduled: true })

    dues.forEach(d => { d.late = Boolean(d.date) && d.date < today })
    dues.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))

    const overdueAmount = Math.min(dues.filter(d => d.late).reduce((s, d) => s + d.amount, 0), balance)

    let status = 'Unpaid'
    if (total > 0 && balance <= 0) status = 'Paid'
    else if (overdueAmount > 0) status = 'Overdue'
    else if (paid > 0) status = 'Partial'

    return {
        total,
        paid,
        balance,
        overdueAmount,
        dues: balance > 0 ? dues : [],
        nextDue: balance > 0 ? dues[0] || null : null,
        status,
        eventDate,
    }
}
