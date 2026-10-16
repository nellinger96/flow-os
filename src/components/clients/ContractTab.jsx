import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Clock, Eye, FileText, Link as LinkIcon, Loader2, Printer, Unlock, Upload, X } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { formatDateTime } from '../../lib/format'
import { contractHtml, printHtml } from '../../lib/printDocs'
import { Card } from './ui'

const SIGNATURE_KEYS = ['signed_by', 'signed_at', 'terms_accepted']

// Contracts signed before snapshots existed: rebuild from the current record
function legacyContract(c) {
    const sd = c.service_data || {}
    return {
        legacy: true,
        terms_version: 1,
        full_name: c.full_name,
        address: c.address,
        city: c.city,
        job_notes: c.job_notes,
        job_price: c.job_price,
        service_data: sd,
        signed_by: sd.signed_by,
        signed_at: sd.signed_at,
        terms_accepted: sd.terms_accepted,
    }
}

function ContractViewer({ contract, business, onClose }) {
    const { t, i18n } = useTranslation()
    const html = contractHtml({
        contract,
        business: { business_name: contract.business_name || business?.business_name, city: business?.city },
        t,
        lng: i18n.language,
    })
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
            <div className="flex h-full max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                    <div className="min-w-0">
                        <div className="font-bold text-slate-900">{t('contract.viewSigned')}</div>
                        <div className={`text-xs ${contract.legacy ? 'text-amber-600' : 'text-green-600'}`}>
                            {contract.legacy ? t('contract.legacyNotice') : t('contract.snapshotNotice')}
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <button onClick={() => printHtml(html)} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800">
                            <Printer size={15} /> {t('contract.printSigned')}
                        </button>
                        <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={t('contract.close')}>
                            <X size={18} />
                        </button>
                    </div>
                </div>
                <iframe title={t('contract.viewSigned')} srcDoc={html} sandbox="" className="flex-1 bg-white" />
            </div>
        </div>
    )
}

export default function ContractTab({ client, savedClient, dirty, onClientReplaced, business }) {
    const { t, i18n } = useTranslation()
    const [viewing, setViewing] = useState(null)
    const [busy, setBusy] = useState(null) // 'upload' | 'unlock'
    const saved = savedClient || client
    const sd = saved.service_data || {}
    const signedDigitally = saved.contract_url === 'SIGNED_DIGITALLY'
    const uploadedUrl = saved.contract_url && !signedDigitally ? saved.contract_url : null
    const current = signedDigitally ? (saved.signed_contract || legacyContract(saved)) : null
    const history = Array.isArray(sd.contract_history) ? sd.contract_history : []

    function copyLink() {
        if (!saved.public_token) return alert(t('contract.tokenMissing'))
        navigator.clipboard.writeText(`${window.location.origin}/sign/${saved.public_token}`)
        alert(t('contract.linkCopied'))
    }

    async function unlock() {
        if (dirty) return alert(t('contract.saveFirst'))
        if (!window.confirm(t('contract.unlockConfirm'))) return
        setBusy('unlock')
        const nextServiceData = { ...sd, contract_history: [...history, { ...current, unlocked_at: new Date().toISOString() }] }
        SIGNATURE_KEYS.forEach(k => delete nextServiceData[k])
        const { data, error } = await supabase.from('customers')
            .update({ contract_url: null, signed_contract: null, signed_at: null, service_data: nextServiceData })
            .eq('id', saved.id).select().single()
        setBusy(null)
        if (error) return alert(error.message)
        onClientReplaced(data)
        alert(t('contract.unlocked'))
    }

    async function upload(e) {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        if (dirty) return alert(t('contract.saveFirst'))
        setBusy('upload')
        try {
            const ext = file.name.split('.').pop()
            const path = `${saved.id}-${crypto.randomUUID()}.${ext}`
            const { error: upErr } = await supabase.storage.from('contracts').upload(path, file)
            if (upErr) throw upErr
            const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(path)
            const { data, error } = await supabase.from('customers').update({ contract_url: publicUrl }).eq('id', saved.id).select().single()
            if (error) throw error
            onClientReplaced(data)
            alert(t('contract.uploaded'))
        } catch (err) {
            alert(err.message)
        } finally {
            setBusy(null)
        }
    }

    return (
        <>
            <Card>
                {signedDigitally ? (
                    <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4">
                        <CheckCircle2 className="mt-0.5 shrink-0 text-green-600" size={22} />
                        <div className="min-w-0 flex-1">
                            <div className="font-bold text-green-800">{t('contract.signed')}</div>
                            <div className="text-sm text-green-700">
                                {current.signed_by ? t('contract.signedBy', { name: current.signed_by }) : t('contract.signedNoName')}
                                {current.signed_at && ` ${t('contract.signedAt', { date: formatDateTime(current.signed_at, i18n.language) })}`}
                            </div>
                        </div>
                    </div>
                ) : uploadedUrl ? (
                    <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4">
                        <FileText className="mt-0.5 shrink-0 text-green-600" size={22} />
                        <div>
                            <div className="font-bold text-green-800">{t('contract.paperOnFile')}</div>
                            <a href={uploadedUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-green-700 underline">{t('contract.viewFile')}</a>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4">
                        <Clock className="mt-0.5 shrink-0 text-slate-400" size={22} />
                        <div>
                            <div className="font-bold text-slate-700">{t('contract.notSent')}</div>
                            <div className="text-sm text-slate-500">{t('contract.notSentHint')}</div>
                        </div>
                    </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                    {signedDigitally ? (
                        <>
                            <button onClick={() => setViewing(current)} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                                <Eye size={16} /> {t('contract.viewSigned')}
                            </button>
                            <button onClick={unlock} disabled={busy === 'unlock'} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                                {busy === 'unlock' ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />} {t('contract.unlock')}
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={copyLink} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                                <LinkIcon size={16} /> {t('contract.copyLink')}
                            </button>
                            <label className={`flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${busy === 'upload' ? 'pointer-events-none opacity-50' : ''}`}>
                                {busy === 'upload' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                {busy === 'upload' ? t('contract.uploading') : t('contract.uploadPdf')}
                                <input type="file" accept="application/pdf,image/*" onChange={upload} className="hidden" />
                            </label>
                        </>
                    )}
                </div>
            </Card>

            {history.length > 0 && (
                <Card title={t('contract.history')}>
                    <div className="divide-y divide-slate-100">
                        {history.map((h, i) => (
                            <button key={i} onClick={() => setViewing(h)} className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm hover:text-blue-700">
                                <span>{t('contract.signedBy', { name: h.signed_by || '—' })} {h.signed_at && t('contract.signedAt', { date: formatDateTime(h.signed_at, i18n.language) })}</span>
                                <Eye size={15} className="shrink-0 text-slate-400" />
                            </button>
                        ))}
                    </div>
                </Card>
            )}

            {viewing && <ContractViewer contract={viewing} business={business} onClose={() => setViewing(null)} />}
        </>
    )
}
