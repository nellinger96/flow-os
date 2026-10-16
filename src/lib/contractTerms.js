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
