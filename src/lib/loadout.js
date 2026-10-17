import { MENU_CATEGORIES, LEGACY_MENU_FIELD, normalizeItem } from './menu'
import { toNumber } from './format'

// Equipment categories, in the order they're packed and shown
export const GEAR_CATEGORIES = ['serving', 'heating', 'linens', 'setup', 'disposables', 'cleaning', 'other']

export const SETUP_FIELDS = ['table_covers', 'tables', 'colors', 'notes']

// Common catering gear offered as a starting list (names in loadout.starter.<key>)
export const STARTER_GEAR = [
    { key: 'chafing', category: 'heating', rule: 'per_guests', qty: 1, guests_per: 40 },
    { key: 'sterno', category: 'heating', rule: 'per_guests', qty: 2, guests_per: 40 },
    { key: 'cazuela', category: 'serving', rule: 'manual', qty: 1 },
    { key: 'servingSpoon', category: 'serving', rule: 'manual', qty: 1 },
    { key: 'tongs', category: 'serving', rule: 'manual', qty: 1 },
    { key: 'ladle', category: 'serving', rule: 'manual', qty: 1 },
    { key: 'dispenser', category: 'serving', rule: 'manual', qty: 1 },
    { key: 'tableCover', category: 'linens', rule: 'manual', qty: 1 },
    { key: 'table', category: 'setup', rule: 'manual', qty: 1 },
    { key: 'canopy', category: 'setup', rule: 'manual', qty: 1 },
    { key: 'extension', category: 'setup', rule: 'every_event', qty: 1 },
    { key: 'gloves', category: 'disposables', rule: 'every_event', qty: 1 },
    { key: 'foilPans', category: 'disposables', rule: 'per_guests', qty: 2, guests_per: 25 },
    { key: 'trashBags', category: 'cleaning', rule: 'every_event', qty: 1 },
    { key: 'paperTowels', category: 'cleaning', rule: 'every_event', qty: 1 },
]

const FOOD_FIELDS = [...MENU_CATEGORIES.filter(c => c.food).map(c => c.field), LEGACY_MENU_FIELD]
const SUPPLY_FIELD = MENU_CATEGORIES.find(c => c.key === 'Supplies').field

// The checklist for one event.
//   equipment: the caterer's gear
//   menuLinks: [{ service_name, equipment_id, qty }] gear each menu item needs
//   items:     event_load_items rows for this event (check-offs and changes)
// Returns { items, removed }: items to pack (sorted) and auto items removed for
// this event (so the owner can put them back).
export function buildLoadList({ client, equipment, menuLinks, items }) {
    const sd = client.service_data || {}
    const guests = toNumber(sd.guest_count)
    const list = new Map()

    const add = (key, base, qty, reason) => {
        const row = list.get(key) || { key, qty: 0, reasons: [], auto: true, ...base }
        if (qty !== null) row.qty = (row.qty || 0) + qty
        if (reason && !row.reasons.includes(reason)) row.reasons.push(reason)
        list.set(key, row)
    }

    const gear = new Map(equipment.map(e => [e.id, e]))
    equipment.forEach(e => {
        const base = { equipmentId: e.id, name: e.name, category: e.category }
        if (e.rule === 'every_event') add(`eq:${e.id}`, base, toNumber(e.qty), { type: 'every' })
        if (e.rule === 'per_guests' && guests > 0 && e.guests_per > 0) {
            add(`eq:${e.id}`, base, Math.ceil(guests / e.guests_per) * toNumber(e.qty), { type: 'guests', per: e.guests_per })
        }
    })

    // Gear linked to the menu items on this event
    const linksByItem = new Map()
    menuLinks.forEach(l => {
        const k = normalizeItem(l.service_name)
        if (!linksByItem.has(k)) linksByItem.set(k, [])
        linksByItem.get(k).push(l)
    })
    const seenFood = new Set()
    FOOD_FIELDS.forEach(field => (Array.isArray(sd[field]) ? sd[field] : []).forEach(name => {
        const k = normalizeItem(name)
        if (!k || seenFood.has(k)) return
        seenFood.add(k)
        ;(linksByItem.get(k) || []).forEach(l => {
            const e = gear.get(l.equipment_id)
            if (e) add(`eq:${e.id}`, { equipmentId: e.id, name: e.name, category: e.category }, toNumber(l.qty), { type: 'menu', item: name })
        })
    }))

    // Supplies picked on the client's menu are things to bring too
    ;(Array.isArray(sd[SUPPLY_FIELD]) ? sd[SUPPLY_FIELD] : []).forEach(name => {
        const k = normalizeItem(name)
        if (k) add(`sup:${k}`, { name, category: 'disposables' }, null, { type: 'supply' })
    })

    // Event-specific changes and one-off items
    const removed = []
    ;(items || []).forEach(row => {
        if (row.item_key.startsWith('custom:')) {
            if (row.removed) return
            list.set(row.item_key, { key: row.item_key, name: row.label || '—', category: 'other', qty: row.qty, reasons: [], auto: false, custom: true })
        }
        const item = list.get(row.item_key)
        if (!item) return
        if (row.removed) {
            list.delete(row.item_key)
            removed.push(item)
            return
        }
        if (row.qty !== null && row.qty !== undefined && !item.custom) {
            item.qty = toNumber(row.qty)
            item.qtyChanged = true
        }
        item.loadedAt = row.loaded_at
        item.loadedBy = row.loaded_by
        item.returnedAt = row.returned_at
        item.returnedBy = row.returned_by
    })

    const order = (c) => { const i = GEAR_CATEGORIES.indexOf(c); return i === -1 ? GEAR_CATEGORIES.length : i }
    const sorted = [...list.values()].sort((a, b) => order(a.category) - order(b.category) || a.name.localeCompare(b.name))
    return { items: sorted, removed }
}

// Gear needed across several events on the same day vs. what's owned
export function dayShortages(lists, equipment) {
    const need = new Map()
    lists.forEach(list => list.forEach(item => {
        if (item.equipmentId) need.set(item.equipmentId, (need.get(item.equipmentId) || 0) + toNumber(item.qty))
    }))
    return equipment
        .filter(e => e.stock !== null && e.stock !== undefined && need.get(e.id) > e.stock)
        .map(e => ({ id: e.id, name: e.name, need: need.get(e.id), stock: e.stock }))
}

export const formatQty = (qty) => (qty === null || qty === undefined || qty === '' ? '' : String(Math.round(toNumber(qty) * 100) / 100))

// Google Maps directions through the day's stops in order (starts from wherever the phone is)
export function dayRouteUrl(clients) {
    const stops = clients.map(c => [c.address, c.city].filter(Boolean).join(', ')).filter(Boolean)
    if (!stops.length) return null
    const destination = encodeURIComponent(stops[stops.length - 1])
    const waypoints = stops.slice(0, -1).map(encodeURIComponent).join('%7C')
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}`
}
