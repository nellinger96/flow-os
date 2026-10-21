import { escapeHtml as esc, formatDate, formatDateTime, formatTime, formatTimeRange, money, toNumber, todayISO } from './format'
import { menuSections } from './menu'
import { termsFor } from './contractTerms'

export function printHtml(html) {
    const iframe = document.createElement('iframe')
    Object.assign(iframe.style, { position: 'absolute', width: '0', height: '0', border: 'none' })
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(html)
    doc.close()
    iframe.contentWindow.focus()
    setTimeout(() => {
        iframe.contentWindow.print()
        setTimeout(() => iframe.remove(), 1000)
    }, 400)
}

const BASE_CSS = `
  body { font-family: Helvetica, Arial, sans-serif; color: #1e293b; max-width: 820px; margin: 0 auto; padding: 40px; line-height: 1.5; }
  h1 { margin: 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 28px; }
  .biz { font-size: 24px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; }
  .muted { color: #64748b; font-size: 13px; }
  .doc-title { font-size: 30px; font-weight: 900; color: #cbd5e1; text-align: right; text-transform: uppercase; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px; }
  .label { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: .5px; color: #64748b; margin-bottom: 8px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eef2f7; font-size: 14px; }
  .total { font-size: 20px; font-weight: 900; color: #1e3a8a; border-top: 2px solid #1e3a8a; border-bottom: none; margin-top: 6px; }
  .badge { font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 10px; }
  .paid { background: #dcfce7; color: #166534; } .unpaid { background: #f1f5f9; color: #64748b; }
  ul { margin: 4px 0 12px; padding-left: 20px; }
  .section { margin-bottom: 22px; page-break-inside: avoid; }
  .terms p { font-size: 12px; color: #475569; margin: 6px 0; }
  .sig { border: 2px solid #1e3a8a; border-radius: 10px; padding: 16px 18px; }
  .sig-name { font-family: 'Brush Script MT', cursive; font-size: 30px; color: #1e3a8a; }
  .footer { margin-top: 36px; text-align: center; font-size: 12px; color: #94a3b8; }
`

function page(title, body) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${BASE_CSS}</style></head><body>${body}</body></html>`
}

function header(business, docTitle, metaLines = []) {
    return `<div class="header">
      <div><div class="biz">${esc(business?.business_name || 'Catering Service')}</div><div class="muted">${esc(business?.city || '')}</div></div>
      <div><div class="doc-title">${esc(docTitle)}</div>${metaLines.map(l => `<div class="muted" style="text-align:right">${esc(l)}</div>`).join('')}</div>
    </div>`
}

function menuHtml(serviceData, t) {
    const sections = menuSections(serviceData)
    if (!sections.length) return `<div class="muted">${esc(t('doc.customMenu'))}</div>`
    return sections.map(s => `<div><strong>${esc(t(`menu.category.${s.key}`))}</strong><ul>${s.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')
}

function paymentRows(plan, t, lng) {
    if (!plan?.length) return `<div class="muted">${esc(t('doc.dueOnReceipt'))}</div>`
    return plan.map((p, i) => `<div class="row">
        <span><strong>${esc(t('doc.payment', { n: i + 1 }))}</strong> <span class="muted">${esc(t('doc.due'))}: ${esc(formatDate(p.date, lng) || t('common.tbd'))}</span></span>
        <span>${esc(money(p.amount))} <span class="badge ${p.paid ? 'paid' : 'unpaid'}">${esc(p.paid ? t('payments.paid') : t('payments.unpaid'))}</span></span>
      </div>`).join('')
}

function eventBox(c, t, lng) {
    const sd = c.service_data || {}
    return `<div class="box"><div class="label">${esc(t('doc.eventDetails'))}</div>
      <div><strong>${esc(t('doc.date'))}:</strong> ${esc(formatDate(sd.event_date, lng, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) || t('common.tbd'))}</div>
      <div><strong>${esc(t('doc.time'))}:</strong> ${esc(formatTimeRange(sd.event_time, sd.event_end_time, lng) || t('common.tbd'))}</div>
      <div><strong>${esc(t('doc.guests'))}:</strong> ${esc(sd.guest_count || 0)}</div>
    </div>`
}

export function invoiceHtml({ client, business, t, lng }) {
    const sd = client.service_data || {}
    const plan = sd.payment_plan || []
    const total = toNumber(client.job_price)
    const paid = plan.reduce((s, p) => (p.paid ? s + toNumber(p.amount) : s), 0)
    const number = client.id ? String(client.id) : 'DRAFT'
    const body = `
      ${header(business, t('doc.invoice'), [`#${number}`, `${t('doc.issued')}: ${formatDate(todayISO(), lng)}`])}
      <div class="grid">
        <div class="box"><div class="label">${esc(t('doc.billTo'))}</div>
          <div style="font-size:18px;font-weight:bold">${esc(client.full_name)}</div>
          ${[client.address, client.phone, client.email].filter(Boolean).map(v => `<div class="muted">${esc(v)}</div>`).join('')}
        </div>
        ${eventBox(client, t, lng)}
      </div>
      <div class="section box">
        <div class="label">${esc(t('doc.cateringPackage'))}</div>
        ${menuHtml(sd, t)}
        ${client.job_notes ? `<div class="muted"><strong>${esc(t('doc.notes'))}:</strong> ${esc(client.job_notes)}</div>` : ''}
        <div class="row" style="margin-top:10px"><span>${esc(sd.guest_count || 0)} × ${esc(money(sd.price_per_head))}</span><span>${esc(money(total))}</span></div>
        <div class="row total"><span>${esc(t('doc.total'))}</span><span>${esc(money(total))}</span></div>
      </div>
      <div class="section box">
        <div class="label">${esc(t('doc.paymentSchedule'))}</div>
        ${paymentRows(plan, t, lng)}
        <div class="row"><strong>${esc(t('doc.totalPaid'))}</strong><strong style="color:#166534">${esc(money(paid))}</strong></div>
        <div class="row" style="border:none"><strong>${esc(t('doc.balanceDue'))}</strong><strong style="color:#dc2626">${esc(money(total - paid))}</strong></div>
      </div>
      <div class="footer">${esc(t('doc.thankYou'))}</div>`
    return page(`${t('doc.invoice')} #${number}`, body)
}

export function kitchenSheetHtml({ client, t, lng }) {
    const sd = client.service_data || {}
    const timeline = (sd.timeline || []).filter(r => r.time || r.action)
    const body = `
      <div class="header"><div class="biz" style="font-size:34px;color:#000">${esc(t('doc.kitchenPrep'))}</div>
        <div style="font-size:22px;font-weight:bold">${esc(formatDate(sd.event_date, lng) || t('common.tbd'))}</div></div>
      ${sd.dietary_restrictions ? `<div class="section" style="border:4px dashed #dc2626;color:#dc2626;padding:14px;font-weight:bold;font-size:18px">${esc(t('doc.dietaryAlert'))}: ${esc(sd.dietary_restrictions)}</div>` : ''}
      <div class="section box" style="font-size:18px">
        <div><strong>${esc(t('doc.client'))}:</strong> ${esc(client.full_name)}</div>
        <div><strong>${esc(t('doc.guests'))}:</strong> ${esc(sd.guest_count || 0)}</div>
        <div><strong>${esc(t('doc.time'))}:</strong> ${esc(formatTimeRange(sd.event_time, sd.event_end_time, lng) || t('common.tbd'))}</div>
        <div><strong>${esc(t('doc.location'))}:</strong> ${esc(client.address || '')}</div>
      </div>
      <div class="section" style="font-size:17px">${menuHtml(sd, t)}</div>
      ${timeline.length ? `<div class="section"><div class="label">${esc(t('event.timeline'))}</div>${timeline.map(r => `<div class="row"><strong>${esc(formatTime(r.time, lng))}</strong><span>${esc(r.action)}</span></div>`).join('')}</div>` : ''}
      ${client.job_notes ? `<div class="section"><div class="label">${esc(t('doc.notes'))}</div><div style="font-size:17px">${esc(client.job_notes)}</div></div>` : ''}
      ${sd.kitchen_notes ? `<div class="section"><div class="label">${esc(t('doc.instructions'))}</div><div style="font-size:17px">${esc(sd.kitchen_notes)}</div></div>` : ''}`
    return page(t('doc.kitchenPrep'), body)
}

// `contract` has the shape of customers.signed_contract (or the same shape
// built from the live client record for contracts signed before snapshots).
export function contractHtml({ contract, business, t, lng }) {
    const terms = termsFor(contract.terms_version || contract.version, lng)
    const sd = contract.service_data || {}
    const body = `
      ${header(business, t('doc.contract'), contract.signed_at ? [`${t('doc.signedOn')} ${formatDateTime(contract.signed_at, lng)}`] : [])}
      <div class="grid">
        <div class="box"><div class="label">${esc(t('doc.client'))}</div>
          <div style="font-size:18px;font-weight:bold">${esc(contract.full_name)}</div>
          ${[contract.address, contract.city].filter(Boolean).map(v => `<div class="muted">${esc(v)}</div>`).join('')}
        </div>
        ${eventBox(contract, t, lng)}
      </div>
      <div class="section box"><div class="label">${esc(t('doc.menu'))}</div>
        ${menuHtml(sd, t)}
        ${contract.job_notes ? `<div class="muted"><strong>${esc(t('doc.notes'))}:</strong> ${esc(contract.job_notes)}</div>` : ''}
        <div class="row total"><span>${esc(t('doc.total'))}</span><span>${esc(money(contract.job_price))}</span></div>
      </div>
      <div class="section box"><div class="label">${esc(t('doc.paymentSchedule'))}</div>${paymentRows(sd.payment_plan, t, lng)}</div>
      <div class="section terms"><div class="label">${esc(t('sign.terms'))}</div>
        ${terms.map(([title, text], i) => `<p><strong>${i + 1}. ${esc(title)}:</strong> ${esc(text)}</p>`).join('')}
      </div>
      <div class="section sig"><div class="label">${esc(t('doc.signature'))}</div>
        <div class="sig-name">${esc(contract.signed_by || '')}</div>
        <div class="muted">${esc(contract.signed_by || '')}${contract.signed_at ? ` · ${esc(formatDateTime(contract.signed_at, lng))}` : ''}</div>
        ${contract.terms_accepted ? `<div class="muted">${esc(t('doc.termsAccepted'))}</div>` : ''}
      </div>`
    return page(`${t('doc.contract')} – ${contract.full_name || ''}`, body)
}

// Load-out sheet for a day: one page per event with boxes to tick when loading
// and when packing back up. `events` is [{ client, items }] from buildLoadList.
export function loadoutHtml({ day, events, t, lng }) {
    const css = `
      .event { page-break-after: always; }
      .event:last-child { page-break-after: auto; }
      .setup { border: 4px solid #0f172a; border-radius: 12px; padding: 12px 16px; margin: 14px 0; font-size: 17px; }
      .setup .big { font-size: 26px; font-weight: 900; }
      table { width: 100%; border-collapse: collapse; font-size: 15px; }
      th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #0f172a; padding: 6px 4px; }
      td { border-bottom: 1px solid #e2e8f0; padding: 8px 4px; vertical-align: top; }
      .box-cell { width: 54px; text-align: center; font-size: 22px; }
      .qty { width: 48px; font-weight: 900; }
      .why { color: #64748b; font-size: 12px; }`
    const body = events.map(({ client, items }) => {
        const sd = client.service_data || {}
        const setup = sd.setup || {}
        const place = [client.address, client.city].filter(Boolean).join(', ')
        const setupLines = [
            setup.table_covers ? `<div class="big">${esc(t('loadout.setup.table_covers'))}: ${esc(setup.table_covers)}</div>` : '',
            setup.tables ? `<div><strong>${esc(t('loadout.setup.tables'))}:</strong> ${esc(setup.tables)}</div>` : '',
            setup.colors ? `<div><strong>${esc(t('loadout.setup.colors'))}:</strong> ${esc(setup.colors)}</div>` : '',
            setup.notes ? `<div><strong>${esc(t('loadout.setup.notes'))}:</strong> ${esc(setup.notes)}</div>` : '',
            sd.dietary_restrictions ? `<div style="color:#dc2626;font-weight:bold">${esc(t('doc.dietaryAlert'))}: ${esc(sd.dietary_restrictions)}</div>` : '',
        ].join('')
        const rows = items.map(i => `<tr>
            <td class="box-cell">☐</td><td class="box-cell">☐</td>
            <td class="qty">${esc(i.qty ? Math.round(i.qty * 100) / 100 : '')}</td>
            <td><strong>${esc(i.name)}</strong></td>
          </tr>`).join('')
        return `<div class="event">
          <div class="header" style="margin-bottom:8px">
            <div><div class="biz" style="color:#0f172a">${esc(client.full_name)}</div>
              <div class="muted">${esc(formatDate(day, lng, { weekday: 'long', month: 'long', day: 'numeric' }))} · ${esc(formatTimeRange(sd.event_time, sd.event_end_time, lng) || t('common.tbd'))} · ${esc(t('clients.guestsShort', { count: toNumber(sd.guest_count) }))}</div>
              <div class="muted">${esc(place)}</div></div>
            <div class="doc-title">${esc(t('loadout.title'))}</div>
          </div>
          ${setupLines ? `<div class="setup">${setupLines}</div>` : ''}
          <table><thead><tr><th class="box-cell">${esc(t('loadout.loaded'))}</th><th class="box-cell">${esc(t('loadout.back'))}</th><th>${esc(t('loadout.qty'))}</th><th>${esc(t('loadout.item'))}</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="4" class="why">${esc(t('loadout.emptyList'))}</td></tr>`}</tbody></table>
        </div>`
    }).join('')
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(t('loadout.title'))}</title><style>${BASE_CSS}${css}</style></head><body>${body}</body></html>`
}

// Run sheet for a day: one section per truck with leave / arrive / service times
export function runSheetHtml({ day, sheet, t, lng }) {
    const fmt = (m) => {
        if (m === null || m === undefined) return '—'
        const d = new Date(2000, 0, 1, 0, 0)
        d.setMinutes(m)
        return d.toLocaleTimeString(lng === 'es' ? 'es-MX' : 'en-US', { hour: 'numeric', minute: '2-digit' })
    }
    const css = `
      .truck { page-break-after: always; }
      .truck:last-child { page-break-after: auto; }
      table { width: 100%; border-collapse: collapse; font-size: 15px; margin-top: 10px; }
      th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #0f172a; padding: 6px 4px; }
      td { border-bottom: 1px solid #e2e8f0; padding: 9px 4px; vertical-align: top; }
      .t { font-weight: 900; white-space: nowrap; }
      .late { color: #dc2626; font-weight: bold; font-size: 13px; }`
    const lanes = sheet.lanes.filter(l => l.stops.length)
    const body = lanes.map(({ truck, stops }) => `<div class="truck">
        <div class="header" style="margin-bottom:6px">
          <div><div class="biz" style="color:#0f172a">${esc(truck.name)}</div>
            <div class="muted">${esc(formatDate(day, lng, { weekday: 'long', month: 'long', day: 'numeric' }))}</div>
            ${sheet.settings.kitchen_address ? `<div class="muted">${esc(t('day.kitchen'))}: ${esc(sheet.settings.kitchen_address)}</div>` : ''}</div>
          <div class="doc-title">${esc(t('day.tabSchedule'))}</div>
        </div>
        <table><thead><tr><th>${esc(t('day.leaveBy'))}</th><th>${esc(t('day.arriveBy'))}</th><th>${esc(t('day.service'))}</th><th>${esc(t('doc.client'))}</th></tr></thead><tbody>
        ${stops.map(s => `<tr>
            <td class="t">${esc(fmt(s.leaveBy))}</td><td class="t">${esc(fmt(s.arriveBy))}</td><td class="t">${esc(fmt(s.service))}</td>
            <td><strong>${esc(s.client.full_name)}</strong> · ${esc(t('clients.guestsShort', { count: toNumber(s.client.service_data?.guest_count) }))}
              <div class="muted">${esc([s.client.address, s.client.city].filter(Boolean).join(', '))}</div>
              ${s.client.service_data?.setup?.table_covers ? `<div><strong>${esc(t('loadout.setup.table_covers'))}:</strong> ${esc(s.client.service_data.setup.table_covers)}</div>` : ''}
              ${s.lateBy > 0 ? `<div class="late">${esc(t('day.cantMakeIt', { count: s.lateBy }))}</div>` : ''}</td>
          </tr>`).join('')}
        </tbody></table></div>`).join('')
    const empty = `<div class="muted">${esc(t('day.nothingAssigned'))}</div>`
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(t('day.tabSchedule'))}</title><style>${BASE_CSS}${css}</style></head><body>${body || empty}</body></html>`
}

// Cancellation confirmation for the client: the original event and contract,
// when and why it was canceled, and how the money was settled.
export function cancellationHtml({ client, business, t, lng }) {
    const sd = client.service_data || {}
    const c = sd.cancellation || {}
    const long = (iso) => formatDate(iso, lng, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const signedBy = client.signed_contract?.signed_by || sd.signed_by
    const signedAt = client.signed_contract?.signed_at || sd.signed_at
    const contractLine = client.contract_url === 'SIGNED_DIGITALLY'
        ? t('cancel.docSigned', { name: signedBy || client.full_name, date: signedAt ? formatDate(signedAt, lng) : '' })
        : client.contract_url ? t('contract.paperOnFile') : t('cancel.docNoContract')
    const refund = toNumber(c.refund)
    const owes = toNumber(c.owes)
    const resultRow = refund > 0
        ? `<div class="row total"><span>${esc(t('cancel.docRefund'))}</span><span>${esc(money(refund))}</span></div>`
        : owes > 0
            ? `<div class="row total"><span>${esc(t('cancel.docOwes'))}</span><span>${esc(money(owes))}</span></div>`
            : `<div class="row total"><span>${esc(t('cancel.nothingDue'))}</span><span>${esc(money(0))}</span></div>`
    const body = `
      ${header(business, t('cancel.docTitle'), [`${t('doc.issued')}: ${formatDate(todayISO(), lng)}`])}
      <div class="section" style="font-size:16px">${esc(t('cancel.docStatement', { name: client.full_name || '', event: long(sd.event_date) || t('common.tbd'), date: long(c.canceled_on) }))}</div>
      <div class="grid">
        <div class="box"><div class="label">${esc(t('doc.client'))}</div>
          <div style="font-size:18px;font-weight:bold">${esc(client.full_name)}</div>
          ${[client.address, client.city].filter(Boolean).map(v => `<div class="muted">${esc(v)}</div>`).join('')}
          <div class="muted" style="margin-top:8px">${esc(contractLine)}</div>
        </div>
        ${eventBox(client, t, lng)}
      </div>
      <div class="section box"><div class="label">${esc(t('cancel.docDetails'))}</div>
        <div class="row"><span>${esc(t('cancel.date'))}</span><strong>${esc(long(c.canceled_on))}</strong></div>
        <div class="row"><span>${esc(t('cancel.whoAsked'))}</span><strong>${esc(t(`cancel.by.${c.requested_by || 'client'}`))}</strong></div>
        ${c.reason ? `<div class="row"><span>${esc(t('cancel.reason'))}</span><strong>${esc(c.reason)}</strong></div>` : ''}
      </div>
      <div class="section box"><div class="label">${esc(t('cancel.money'))}</div>
        <div class="row"><span>${esc(t('cancel.total'))}</span><span>${esc(money(c.total))}</span></div>
        <div class="row"><span>${esc(t('cancel.paid'))}</span><span>${esc(money(c.paid))}</span></div>
        <div class="row"><span>${esc(t('cancel.fee'))}</span><span>${esc(money(c.fee))}</span></div>
        ${resultRow}
      </div>
      <div class="section muted">${esc(t('cancel.docNote'))}</div>
      <div class="grid" style="margin-top:50px">
        <div><div style="border-top:1px solid #0f172a;padding-top:6px">${esc(business?.business_name || '')}</div><div class="muted">${esc(t('cancel.docSignDate'))}</div></div>
        <div><div style="border-top:1px solid #0f172a;padding-top:6px">${esc(client.full_name || '')}</div><div class="muted">${esc(t('cancel.docSignDate'))}</div></div>
      </div>`
    return page(`${t('cancel.docTitle')} – ${client.full_name || ''}`, body)
}
