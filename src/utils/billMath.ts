import type { BillVerification, ElectricityBill } from '../types/bill';

export function formatVND(value: number | null | undefined, withSymbol = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const formatted = new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
  return withSymbol ? `${formatted} ₫` : formatted;
}

export function formatNumber(value: number | null | undefined, maxDecimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

export function verifyBillMath(bill: ElectricityBill): BillVerification {
  // 1. Check meter readings
  const reportedMeterKwh = bill.meterReadings.reduce((sum, r) => sum + (r.billedKwh || 0), 0);
  const expectedMeterKwh = bill.meterReadings.reduce((sum, r) => {
    const diff = (r.newReading - r.oldReading) * (r.multiplier || 1);
    const net = diff + (r.directKwh || 0) - (r.deductedKwh || 0);
    return sum + net;
  }, 0);

  const meterPassed =
    bill.meterReadings.length === 0 ||
    Math.abs(expectedMeterKwh - reportedMeterKwh) <= 1;

  const meterMessage =
    bill.meterReadings.length === 0
      ? 'Không có dòng chỉ số công tơ'
      : meterPassed
        ? `Khớp chỉ số công tơ (${formatNumber(expectedMeterKwh)} kWh)`
        : `Chênh lệch chỉ số: tính được ${formatNumber(expectedMeterKwh)} kWh, hóa đơn ghi ${formatNumber(reportedMeterKwh)} kWh`;

  // 2. Check tariff breakdown vs subtotal & totalBilledKwh
  const tiersTotalKwh = bill.tariffBreakdown.reduce((sum, t) => sum + (t.kwh || 0), 0);
  const tiersTotalAmount = bill.tariffBreakdown.reduce((sum, t) => sum + (t.amount || 0), 0);
  const reportedSubtotal = bill.summary.subtotalAmount || 0;
  const kwhDiff = Math.abs(tiersTotalKwh - (bill.summary.totalBilledKwh || 0));
  const amountDiff = Math.abs(tiersTotalAmount - reportedSubtotal);

  const tierPassed =
    bill.tariffBreakdown.length === 0 || (kwhDiff <= 1 && amountDiff <= 5);

  const tierMessage =
    bill.tariffBreakdown.length === 0
      ? 'Chưa có chi tiết bậc thang'
      : tierPassed
        ? `Tổng ${bill.tariffBreakdown.length} bậc đạt ${formatNumber(tiersTotalKwh)} kWh · ${formatVND(tiersTotalAmount, true)}`
        : `Tổng bậc thang (${formatVND(tiersTotalAmount, true)}) khác cộng trước thuế (${formatVND(reportedSubtotal, true)})`;

  // 3. Check VAT & total payable
  const vatRate = bill.summary.vatRatePercent ?? 10;
  const expectedVat = Math.round(reportedSubtotal * (vatRate / 100));
  const reportedVat = bill.summary.vatAmount || 0;
  const expectedTotal = reportedSubtotal + reportedVat;
  const reportedTotal = bill.summary.totalPayable || 0;

  const vatDiff = Math.abs(expectedVat - reportedVat);
  const totalDiff = Math.abs(expectedTotal - reportedTotal);
  const vatPassed = vatDiff <= 5 && totalDiff <= 5;

  const vatMessage = vatPassed
    ? `Thuế GTGT ${vatRate}% (${formatVND(reportedVat, true)}) + Tiền điện khớp tổng ${formatVND(reportedTotal, true)}`
    : `Tổng tiền trước thuế + VAT (${formatVND(expectedTotal, true)}) khác tổng thanh toán (${formatVND(reportedTotal, true)})`;

  return {
    isAllValid: meterPassed && tierPassed && vatPassed,
    meterCheck: {
      passed: meterPassed,
      expectedKwh: expectedMeterKwh,
      reportedKwh: reportedMeterKwh,
      message: meterMessage,
    },
    tierSumCheck: {
      passed: tierPassed,
      tiersTotalKwh,
      tiersTotalAmount,
      reportedSubtotal,
      message: tierMessage,
    },
    vatAndTotalCheck: {
      passed: vatPassed,
      expectedVat,
      reportedVat,
      expectedTotal,
      reportedTotal,
      message: vatMessage,
    },
  };
}

export function buildBillCSV(bill: ElectricityBill): string {
  const rows: string[][] = [
    ['Mục', 'Trường thông tin', 'Giá trị'],
    ['Đơn vị điện lực', 'Tổng công ty', bill.utilityCompany.corporationName],
    ['Đơn vị điện lực', 'Công ty điện lực', bill.utilityCompany.unitName],
    ['Đơn vị điện lực', 'Địa chỉ', bill.utilityCompany.address],
    ['Đơn vị điện lực', 'Mã số thuế', bill.utilityCompany.taxCode],
    ['Hóa đơn', 'Mẫu số', bill.invoiceMeta.formCode],
    ['Hóa đơn', 'Ký hiệu', bill.invoiceMeta.serialCode],
    ['Hóa đơn', 'Số hóa đơn', bill.invoiceMeta.invoiceNumber],
    ['Hóa đơn', 'ID hóa đơn', bill.invoiceMeta.invoiceId],
    ['Hóa đơn', 'Kỳ / Tháng', `${bill.invoiceMeta.period} (Tháng ${bill.invoiceMeta.month})`],
    ['Hóa đơn', 'Từ ngày - Đến ngày', `${bill.invoiceMeta.fromDate} - ${bill.invoiceMeta.toDate}`],
    ['Khách hàng', 'Tên khách hàng', bill.customerInfo.name],
    ['Khách hàng', 'Mã thanh toán / Mã KH', bill.customerInfo.paymentCode || bill.customerInfo.customerCode],
    ['Khách hàng', 'Số công tơ', bill.customerInfo.meterNumber],
    ['Khách hàng', 'Mã điểm đo', bill.customerInfo.meteringPointCode],
    ['Khách hàng', 'Mã giá', bill.customerInfo.tariffCode],
    ...bill.meterReadings.map((r) => [
      'Chỉ số công tơ',
      `Bộ ${r.registerType}`,
      `Cũ: ${r.oldReading} | Mới: ${r.newReading} | HSN: ${r.multiplier} | ĐN tính giá: ${r.billedKwh} kWh`,
    ]),
    ...bill.tariffBreakdown.map((t) => [
      'Bậc thang',
      t.tierLabel,
      `${t.kwh} kWh × ${t.unitPrice} đ = ${t.amount} đ`,
    ]),
    ['Thanh toán', 'Tổng điện năng tiêu thụ (kWh)', String(bill.summary.totalBilledKwh)],
    ['Thanh toán', 'Tiền điện trước thuế (VNĐ)', String(bill.summary.subtotalAmount)],
    ['Thanh toán', `Thuế GTGT (${bill.summary.vatRatePercent}%)`, String(bill.summary.vatAmount)],
    ['Thanh toán', 'Tổng tiền thanh toán (VNĐ)', String(bill.summary.totalPayable)],
    ['Thanh toán', 'Số tiền bằng chữ', bill.summary.amountInWords],
  ];

  const escapeCsv = (cell: string) => {
    const safe = (cell ?? '').replace(/"/g, '""');
    return `"${safe}"`;
  };

  // BOM for UTF-8 Excel compatibility with Vietnamese diacritics
  return '\uFEFF' + rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}
