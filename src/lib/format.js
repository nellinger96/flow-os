export const toNumber = (value) => {
    const n = parseFloat(value)
    return Number.isFinite(n) ? n : 0
}

const localeFor = (lng) => (lng === 'es' ? 'es-MX' : 'en-US')

// "2026-11-01" must stay Nov 1 in every time zone. `new Date("2026-11-01")`
// is midnight UTC, which is Oct 31 in California.
export function parseLocalDate(value) {
    if (!value) return null
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(value, lng, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
    const d = parseLocalDate(value)
    return d ? d.toLocaleDateString(localeFor(lng), options) : ''
}

export function formatDateTime(value, lng) {
    const d = value ? new Date(value) : null
    return d && !Number.isNaN(d.getTime())
        ? d.toLocaleString(localeFor(lng), { dateStyle: 'medium', timeStyle: 'short' })
        : ''
}

// "16:30" -> "4:30 PM"
export function formatTime(value, lng) {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(value || ''))
    if (!m) return value || ''
    const d = new Date(2000, 0, 1, Number(m[1]), Number(m[2]))
    return d.toLocaleTimeString(localeFor(lng), { hour: 'numeric', minute: '2-digit' })
}

export function money(value) {
    const n = toNumber(value)
    return n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
        maximumFractionDigits: 2,
    })
}

export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

export function todayISO() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// First US phone number in the field ("951-400-9866 951-231-7859" -> 9514009866)
export function dialable(phone) {
    const m = String(phone || '').match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)
    return m ? m[0].replace(/[^\d+]/g, '') : ''
}
