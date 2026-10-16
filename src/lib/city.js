// Suggest a city from a free-typed address. Only ever used as a suggestion
// the caterer confirms; never saved automatically.

const COMMON_CITIES = [
    'Adelanto', 'Anaheim', 'Apple Valley', 'Banning', 'Beaumont', 'Big Bear Lake', 'Bloomington',
    'Chino', 'Chino Hills', 'Claremont', 'Colton', 'Corona', 'Eastvale', 'Fontana', 'Grand Terrace',
    'Hemet', 'Hesperia', 'Highland', 'Jurupa Valley', 'Lake Elsinore', 'Lancaster', 'Loma Linda',
    'Long Beach', 'Los Angeles', 'Menifee', 'Mira Loma', 'Montclair', 'Moreno Valley', 'Murrieta',
    'Norco', 'Ontario', 'Oro Grande', 'Palmdale', 'Perris', 'Phelan', 'Pomona', 'Rancho Cucamonga',
    'Redlands', 'Rialto', 'Riverside', 'San Bernardino', 'Santa Ana', 'Temecula', 'Upland',
    'Victorville', 'Yucaipa',
]

const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

function stripStateAndZip(address) {
    return address
        .replace(/\b\d{5}(-\d{4})?\s*$/, '')
        .replace(/[\s,]*\b(ca|calif|california)\b\.?[\s,]*$/i, '')
        .replace(/[\s,]+$/, '')
        .trim()
}

export function guessCity(address, knownCities = []) {
    if (!address) return ''
    const cleaned = stripStateAndZip(String(address))
    if (!cleaned) return ''

    // Prefer a known city name at the end of the address (longest match wins,
    // so "Rancho Cucamonga" beats "Cucamonga")
    const candidates = [...new Set([...knownCities, ...COMMON_CITIES].map(c => titleCase(c.trim())).filter(Boolean))]
        .sort((a, b) => b.length - a.length)
    const lower = cleaned.toLowerCase()
    const match = candidates.find(c => lower.endsWith(c.toLowerCase()) || lower.endsWith(', ' + c.toLowerCase()))
    if (match) return match

    // "123 Main St, Fontana": the last comma-separated part, if it has no digits
    const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
        const last = parts[parts.length - 1]
        if (!/\d/.test(last) && last.length > 2) return titleCase(last)
    }
    return ''
}
