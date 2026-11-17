export interface UtilityCompany {
  corporationName: string;
  unitName: string;
  address: string;
  phone: string;
  repairPhone: string;
  taxCode: string;
}

export interface InvoiceMeta {
  title: string;
  subtitle: string;
  formCode: string;
  serialCode: string;
  invoiceNumber: string;
  invoiceId: string;
  batch: string;
  month: string;
  period: string;
  fromDate: string;
  toDate: string;
  issueDate: string;
  signer: string;
}

export interface CustomerInfo {
  name: string;
  address: string;
  usageAddress: string;
  phone: string;
  taxCode: string;
  customerCode: string;
  paymentCode: string;
  stationCode: string;
  gcsBookCode: string;
  gcsSession: string;
  meterNumber: string;
  meteringPointCode: string;
  sectorCode: string;
  tariffCode: string;
  householdsCount: number | null;
  teamCode: string;
  voltageLevel: string;
  slvcSlhc: string;
  cosPhi: string;
  kFactorPercent: string;
}

export interface MeterReading {
  registerType: string; // e.g., KT, BT, CD, TD
  newReading: number;
  oldReading: number;
  multiplier: number;
  consumedKwh: number;
  directKwh: number;
  deductedKwh: number;
  billedKwh: number;
}

export interface TariffTier {
  tierLabel: string;
  kwh: number;
  unitPrice: number;
  amount: number;
}

export interface BillSummary {
  totalBilledKwh: number;
  subtotalAmount: number;
  vatRatePercent: number;
  vatAmount: number;
  totalPayable: number;
  amountInWords: string;
}

export interface ElectricityBill {
  utilityCompany: UtilityCompany;
  invoiceMeta: InvoiceMeta;
  customerInfo: CustomerInfo;
  meterReadings: MeterReading[];
  tariffBreakdown: TariffTier[];
  summary: BillSummary;
  notes?: string;
}

export interface BillVerification {
  isAllValid: boolean;
  meterCheck: {
    passed: boolean;
    expectedKwh: number;
    reportedKwh: number;
    message: string;
  };
  tierSumCheck: {
    passed: boolean;
    tiersTotalKwh: number;
    tiersTotalAmount: number;
    reportedSubtotal: number;
    message: string;
  };
  vatAndTotalCheck: {
    passed: boolean;
    expectedVat: number;
    reportedVat: number;
    expectedTotal: number;
    reportedTotal: number;
    message: string;
  };
}

export interface SavedBillRecord {
  id: string;
  fileName: string;
  scannedAt: string;
  imageUrl: string;
  mimeType: string;
  isSample?: boolean;
  bill: ElectricityBill;
}
