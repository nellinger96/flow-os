import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart3, CalendarDays, ChevronRight, Home, LogOut, Menu, Settings, Truck, Users, Wallet, X } from 'lucide-react'
import { isTestDatabase } from '../../supabaseClient'
import { LANGUAGES } from '../../i18n'

// Every page of the logged-in app, in menu order
const PAGES = [
    { path: '/', key: 'home', icon: Home, exact: true },
    { path: '/calendar', key: 'calendar', icon: CalendarDays },
    { path: '/day', key: 'eventDay', icon: Truck, also: ['/loadout'] },
    { path: '/clients', key: 'clients', icon: Users },
    { path: '/invoices', key: 'payments', icon: Wallet },
    { path: '/analytics', key: 'reports', icon: BarChart3 },
    { path: '/settings', key: 'settings', icon: Settings },
]
// The four always visible at the bottom of a phone; the rest are under "More"
const PHONE_TABS = ['/', '/calendar', '/clients', '/invoices']

function isActive(page, pathname) {
    if (page.exact) return pathname === page.path || pathname === '/dashboard'
    return [page.path, ...(page.also || [])].some(p => pathname === p || pathname.startsWith(`${p}/`))
}

function LanguageSwitch() {
    const { i18n } = useTranslation()
    return (
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => i18n.changeLanguage(l.code)}
                    className={`flex-1 rounded-lg py-2 text-sm font-bold ${i18n.language === l.code ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
                    {l.label}
                </button>
            ))}
        </div>
    )
}

function TestBadge() {
    const { t } = useTranslation()
    if (!isTestDatabase) return null
    return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">{t('common.testData')}</span>
}

export default function AppShell({ businessName, onLogout, children }) {
    const { t } = useTranslation()
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const [moreOpen, setMoreOpen] = useState(false)
    const current = PAGES.find(p => isActive(p, pathname))
    const morePages = PAGES.filter(p => !PHONE_TABS.includes(p.path))
    const moreActive = current && !PHONE_TABS.includes(current.path)

    return (
        <div className="min-h-screen bg-slate-50 md:pl-64">
            {/* DESKTOP: menu always visible on the left */}
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
                <div className="border-b border-slate-100 px-5 py-5">
                    <div className="truncate text-lg font-extrabold text-slate-900">{businessName || 'CaterFlow'}</div>
                    <div className="mt-1"><TestBadge /></div>
                </div>
                <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                    {PAGES.map(page => {
                        const Icon = page.icon
                        const active = isActive(page, pathname)
                        return (
                            <NavLink key={page.path} to={page.path}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition ${active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                                <Icon size={21} />{t(`nav.${page.key}`)}
                            </NavLink>
                        )
                    })}
                </nav>
                <div className="space-y-3 border-t border-slate-100 p-4">
                    <LanguageSwitch />
                    <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600">
                        <LogOut size={18} />{t('nav.signOut')}
                    </button>
                </div>
            </aside>

            {/* PHONE: page name at the top */}
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:hidden">
                <h1 className="truncate text-lg font-extrabold text-slate-900">{current ? t(`nav.${current.key}`) : ''}</h1>
                <TestBadge />
            </header>

            <main className="pb-24 md:pb-0">{children}</main>

            {/* PHONE: main pages always one tap away */}
            <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
                {PAGES.filter(p => PHONE_TABS.includes(p.path)).map(page => {
                    const Icon = page.icon
                    const active = isActive(page, pathname)
                    return (
                        <NavLink key={page.path} to={page.path} className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[12px] font-semibold ${active ? 'text-blue-700' : 'text-slate-500'}`}>
                            <Icon size={24} strokeWidth={active ? 2.4 : 2} />{t(`nav.${page.key}`)}
                        </NavLink>
                    )
                })}
                <button onClick={() => setMoreOpen(true)} className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[12px] font-semibold ${moreActive ? 'text-blue-700' : 'text-slate-500'}`}>
                    <Menu size={24} />{t('nav.more')}
                </button>
            </nav>

            {moreOpen && (
                <div className="fixed inset-0 z-[9990] flex items-end bg-black/40 md:hidden" onClick={() => setMoreOpen(false)}>
                    <div className="w-full rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()}>
                        <div className="mb-2 flex items-center justify-between px-1">
                            <div className="text-lg font-extrabold text-slate-900">{businessName || 'CaterFlow'}</div>
                            <button onClick={() => setMoreOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label={t('contract.close')}><X size={22} /></button>
                        </div>
                        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                            {morePages.map(page => {
                                const Icon = page.icon
                                return (
                                    <button key={page.path} onClick={() => { setMoreOpen(false); navigate(page.path) }} className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-slate-50">
                                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Icon size={21} /></span>
                                        <span className="flex-1">
                                            <span className="block text-base font-bold text-slate-900">{t(`nav.${page.key}`)}</span>
                                            <span className="block text-sm text-slate-500">{t(`nav.hint.${page.key}`)}</span>
                                        </span>
                                        <ChevronRight size={18} className="text-slate-300" />
                                    </button>
                                )
                            })}
                        </div>
                        <div className="mt-4"><LanguageSwitch /></div>
                        <button onClick={() => { setMoreOpen(false); onLogout() }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-slate-500 active:bg-red-50">
                            <LogOut size={18} />{t('nav.signOut')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
