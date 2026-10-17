// Terms shown on the signing page. Signed snapshots record the version they
// were signed under, so if these ever change, add a new version instead of
// editing an old one; that keeps every printed signed contract accurate.
export const CONTRACT_TERMS = {
    1: [
        ['Deposit & Payments', 'A non-refundable deposit is required to secure the date. Full payment is due as per the schedule above. Late payments may result in service cancellation.'],
        ['Cancellations', 'Cancellations made less than 30 days before the event are subject to a 50% fee. Cancellations made less than 7 days prior are non-refundable.'],
        ['Guest Count', 'Final guest count must be confirmed 7 days prior to the event. This count will be used for final billing and food preparation.'],
        ['Leftovers', 'Any leftover food is the responsibility of the client. We are not responsible for food safety once it has been handed over or left at the venue.'],
        ['Liability', "We are not liable for any damages to the venue or personal property unless directly caused by our staff's negligence."],
        ['Service Time', 'Service will be provided for the specific hours listed. Additional hours will incur an extra charge.'],
    ],
}

export const CURRENT_TERMS_VERSION = 1

// Spanish translation of each version, shown when the reader picks Español.
// Same terms, same numbering; keep in step with CONTRACT_TERMS.
export const CONTRACT_TERMS_ES = {
    1: [
        ['Anticipo y pagos', 'Se requiere un anticipo no reembolsable para apartar la fecha. El pago total se hace según el plan de pagos de arriba. Los pagos atrasados pueden causar la cancelación del servicio.'],
        ['Cancelaciones', 'Las cancelaciones hechas con menos de 30 días antes del evento tienen un cargo del 50%. Las cancelaciones con menos de 7 días de anticipación no son reembolsables.'],
        ['Número de personas', 'El número final de personas se debe confirmar 7 días antes del evento. Ese número se usa para el cobro final y para preparar la comida.'],
        ['Comida que sobra', 'La comida que sobre es responsabilidad del cliente. No somos responsables de la seguridad de la comida una vez entregada o dejada en el lugar.'],
        ['Responsabilidad', 'No somos responsables por daños al lugar o a objetos personales, a menos que los cause directamente un descuido de nuestro personal.'],
        ['Horario del servicio', 'El servicio se da durante el horario indicado. Las horas extra tienen un cargo adicional.'],
    ],
}

// Terms of a version in the reader's language (English if there's no translation)
export function termsFor(version, lng) {
    const v = version || CURRENT_TERMS_VERSION
    if (lng === 'es' && CONTRACT_TERMS_ES[v]) return CONTRACT_TERMS_ES[v]
    return CONTRACT_TERMS[v] || CONTRACT_TERMS[CURRENT_TERMS_VERSION]
}
