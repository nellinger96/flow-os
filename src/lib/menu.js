// Menu categories. `key` matches services.category; `field` is where the
// chosen items are stored in customers.service_data.
export const MENU_CATEGORIES = [
    { key: 'Entree', field: 'menu_entrees', food: true },
    { key: 'Side', field: 'menu_sides', food: true },
    { key: 'Drink', field: 'menu_drinks', food: true },
    { key: 'Dessert', field: 'menu_desserts', food: true },
    { key: 'Supplies', field: 'menu_supplies', food: false },
]

// Very old clients stored a single flat list
export const LEGACY_MENU_FIELD = 'selected_menu_items'

export const ALL_MENU_FIELDS = [...MENU_CATEGORIES.map(c => c.field), LEGACY_MENU_FIELD]

export const normalizeItem = (name) => String(name || '').trim().toLowerCase()

export function categoryForService(service) {
    return MENU_CATEGORIES.find(c => c.key === service.category) || MENU_CATEGORIES[0]
}

// Menu sections that have items, in display order (legacy items last)
export function menuSections(serviceData) {
    const sd = serviceData || {}
    const sections = MENU_CATEGORIES
        .map(c => ({ key: c.key, food: c.food, items: Array.isArray(sd[c.field]) ? sd[c.field] : [] }))
        .filter(s => s.items.length > 0)
    const legacy = Array.isArray(sd[LEGACY_MENU_FIELD]) ? sd[LEGACY_MENU_FIELD] : []
    if (legacy.length) sections.push({ key: 'Entree', food: true, items: legacy, legacy: true })
    return sections
}
