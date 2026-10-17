// Truck schedules for one day: when each truck has to leave, arrive and is
// free again, and which stops it can't make in time.

export const TRUCK_COLORS = {
    blue: { dot: 'bg-blue-500', soft: 'bg-blue-50 text-blue-800 border-blue-200', solid: 'bg-blue-600 text-white' },
    green: { dot: 'bg-green-500', soft: 'bg-green-50 text-green-800 border-green-200', solid: 'bg-green-600 text-white' },
    amber: { dot: 'bg-amber-500', soft: 'bg-amber-50 text-amber-800 border-amber-200', solid: 'bg-amber-500 text-white' },
    purple: { dot: 'bg-purple-500', soft: 'bg-purple-50 text-purple-800 border-purple-200', solid: 'bg-purple-600 text-white' },
    rose: { dot: 'bg-rose-500', soft: 'bg-rose-50 text-rose-800 border-rose-200', solid: 'bg-rose-600 text-white' },
    slate: { dot: 'bg-slate-500', soft: 'bg-slate-100 text-slate-800 border-slate-300', solid: 'bg-slate-700 text-white' },
}
export const TRUCK_COLOR_KEYS = Object.keys(TRUCK_COLORS)

export const DEFAULT_SETTINGS = { kitchen_address: '', setup_minutes: 60, drive_minutes: 30, service_minutes: 240, teardown_minutes: 30 }

// "15:30" -> 930 (minutes after midnight), or null
export function toMinutes(time) {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(time || ''))
    return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

// 930 -> "3:30 PM" (or "15:30" style for Spanish)
export function minutesLabel(min, lng) {
    if (min === null || min === undefined) return ''
    const d = new Date(2000, 0, 1, 0, 0)
    d.setMinutes(min)
    return d.toLocaleTimeString(lng === 'es' ? 'es-MX' : 'en-US', { hour: 'numeric', minute: '2-digit' })
}

export const placeOf = (client) => [client.address, client.city].filter(Boolean).join(', ')

export function mapsLeg(from, to) {
    if (!to) return null
    return `https://www.google.com/maps/dir/?api=1${from ? `&origin=${encodeURIComponent(from)}` : ''}&destination=${encodeURIComponent(to)}`
}

export function mapsRoute(origin, stops) {
    const places = stops.filter(Boolean)
    if (!places.length) return null
    const destination = encodeURIComponent(places[places.length - 1])
    const waypoints = places.slice(0, -1).map(encodeURIComponent).join('%7C')
    return `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}`
}

// events: booked clients for the day; runs: event_runs rows
// Returns { lanes: [{ truck, stops }], unassigned: [client] }
// Each stop: { client, run, service, serviceEnd, endEstimated, setup, teardown, drive, arriveBy, leaveBy, departAt, lateBy, from }
// The crew serves, so the truck is busy until service ends plus pack-up time.
export function buildRunSheet({ events, runs, trucks, settings }) {
    const cfg = { ...DEFAULT_SETTINGS, ...(settings || {}) }
    const runFor = new Map(runs.map(r => [r.customer_id, r]))
    const truckIds = new Set(trucks.map(t => t.id))
    const unassigned = []
    const byTruck = new Map(trucks.map(t => [t.id, []]))

    events.forEach(client => {
        const run = runFor.get(client.id) || null
        if (run?.truck_id && truckIds.has(run.truck_id)) byTruck.get(run.truck_id).push({ client, run })
        else unassigned.push(client)
    })

    const lanes = trucks.map(truck => {
        const list = byTruck.get(truck.id)
            .map(({ client, run }) => ({ client, run, service: toMinutes(client.service_data?.event_time) }))
            .sort((a, b) => (a.service ?? 9999) - (b.service ?? 9999))

        let prevDepart = null
        let prevPlace = cfg.kitchen_address || ''
        const stops = list.map(({ client, run, service }) => {
            const setup = run?.setup_minutes ?? cfg.setup_minutes
            const teardown = run?.teardown_minutes ?? cfg.teardown_minutes
            const drive = run?.drive_minutes ?? cfg.drive_minutes
            const stop = { client, run, service, serviceEnd: null, endEstimated: false, setup, teardown, drive, from: prevPlace, arriveBy: null, leaveBy: null, departAt: null, lateBy: 0 }
            if (service !== null) {
                let end = toMinutes(client.service_data?.event_end_time)
                if (end === null) {
                    end = service + cfg.service_minutes
                    stop.endEstimated = true
                } else if (end <= service) {
                    end += 24 * 60 // runs past midnight
                }
                stop.serviceEnd = end
                stop.arriveBy = service - setup
                stop.leaveBy = stop.arriveBy - drive
                stop.departAt = end + teardown
                if (prevDepart !== null && stop.leaveBy < prevDepart) stop.lateBy = prevDepart - stop.leaveBy
                prevDepart = stop.departAt
            }
            prevPlace = placeOf(client) || prevPlace
            return stop
        })
        return { truck, stops }
    })

    return { lanes, unassigned, settings: cfg }
}

// Live state of a stop for "today" views
//   now: minutes after midnight (only when the day is today), else null
export function stopState(stop, now) {
    const r = stop.run || {}
    if (r.finished_at) return { key: 'finished' }
    if (r.setup_done_at) return { key: 'setupDone' }
    if (r.arrived_at) return { key: 'arrived' }
    if (r.departed_at) return { key: 'onTheWay' }
    if (now !== null && stop.leaveBy !== null && now > stop.leaveBy) return { key: 'shouldHaveLeft', minutes: now - stop.leaveBy }
    return { key: 'waiting' }
}

// Minutes after midnight for an ISO timestamp, in local time
export function minutesOfDay(iso) {
    if (!iso) return null
    const d = new Date(iso)
    return d.getHours() * 60 + d.getMinutes()
}
