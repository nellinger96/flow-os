import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import es from './locales/es.json'

export const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
]

const STORAGE_KEY = 'caterflow.language'

function initialLanguage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved && LANGUAGES.some(l => l.code === saved)) return saved
    } catch {
        // storage unavailable (private mode); fall through
    }
    return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'
}

i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, es: { translation: es } },
    lng: initialLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
    try { localStorage.setItem(STORAGE_KEY, lng) } catch { /* ignore */ }
    document.documentElement.lang = lng
})
document.documentElement.lang = i18n.language

export default i18n
