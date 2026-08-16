import { daysPastDue } from '../utils/dateUtils';

// Kırmızı: gecikmiş (vade geçti, kalan tutar > 0)
// Sarı: 3 gün içinde vadesi dolacak (henüz gecikmemiş, kalan tutar > 0)
// Yeşil: güncel (gecikmiş/yaklaşan borç yok)
export const STATUS = { RED: 'RED', YELLOW: 'YELLOW', GREEN: 'GREEN' };

export function computeCustomerStatusFromDocs(invoices, checks) {
  let worst = STATUS.GREEN;
  let maxDaysPast = 0;

  const items = [
    ...invoices.filter(i => Number(i.remainingAmount) > 0),
    ...checks.filter(c => c.status !== 'collected'),
  ];

  for (const item of items) {
    const diff = daysPastDue(item.dueDate);
    if (diff > 0) {
      worst = STATUS.RED;
      if (diff > maxDaysPast) maxDaysPast = diff;
    } else if (diff >= -3 && worst !== STATUS.RED) {
      worst = STATUS.YELLOW;
    }
  }

  return { status: worst, daysPastDue: maxDaysPast };
}
