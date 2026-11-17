import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  FileSpreadsheet,
  FileJson,
  Printer,
  RotateCcw,
  Save,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { ElectricityBill, SavedBillRecord } from '../types/bill';
import { buildBillCSV, formatNumber, formatVND, verifyBillMath } from '../utils/billMath';

export type ActiveTab = 'overview' | 'breakdown' | 'history' | 'export';

interface BillDisplayPaneProps {
  activeTab: ActiveTab;
  bill: ElectricityBill | null;
  isReading: boolean;
  error: string | null;
  history: SavedBillRecord[];
  activeRecordId: string | null;
  onRetryRead: () => void;
  onUpdateBill: (updated: ElectricityBill) => void;
  onSelectHistory: (record: SavedBillRecord) => void;
  onDeleteHistory: (id: string) => void;
  onUploadClick: () => void;
}

const TIER_COLORS = [
  'bg-blue-700',
  'bg-blue-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-orange-600',
  'bg-red-600',
];

export const BillDisplayPane: React.FC<BillDisplayPaneProps> = ({
  activeTab,
  bill,
  isReading,
  error,
  history,
  activeRecordId,
  onRetryRead,
  onUpdateBill,
  onSelectHistory,
  onDeleteHistory,
  onUploadClick,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ElectricityBill | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const verification = useMemo(() => (bill ? verifyBillMath(bill) : null), [bill]);

  const startEditing = () => {
    if (!bill) return;
    setDraft(structuredClone(bill));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft(null);
    setIsEditing(false);
  };

  const saveEditing = () => {
    if (!draft) return;
    onUpdateBill(draft);
    setDraft(null);
    setIsEditing(false);
  };

  const handleCopyJson = async () => {
    if (!bill) return;
    await navigator.clipboard.writeText(JSON.stringify(bill, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1800);
  };

  const handleDownloadJson = () => {
    if (!bill) return;
    const blob = new Blob([JSON.stringify(bill, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hoa-don-dien-${bill.invoiceMeta.invoiceNumber || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    if (!bill) return;
    const csv = buildBillCSV(bill);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hoa-don-dien-${bill.invoiceMeta.invoiceNumber || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // History tab works even if no bill is currently loaded
  if (activeTab === 'history') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Lịch sử hóa đơn đã đọc</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Lưu cục bộ trên trình duyệt để xem lại và đối chiếu các kỳ thanh toán.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {history.length} bản ghi
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-base font-semibold text-slate-800">Chưa có hóa đơn nào được lưu</p>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Tải lên ảnh hoặc file PDF hóa đơn tiền điện để hệ thống đọc và lưu lại tại đây.
            </p>
            <button
              type="button"
              onClick={onUploadClick}
              className="mt-2 inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
            >
              Tải hóa đơn đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Số hóa đơn / Đơn vị</th>
                  <th className="py-3 px-4">Kỳ / Tháng</th>
                  <th className="py-3 px-4">Mã thanh toán</th>
                  <th className="py-3 px-4 text-right">Sản lượng</th>
                  <th className="py-3 px-4 text-right">Tổng thanh toán</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {history.map((item) => {
                  const isCurrent = item.id === activeRecordId;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectHistory(item)}
                      className={`cursor-pointer transition-colors ${
                        isCurrent ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {item.bill.invoiceMeta.invoiceNumber
                            ? `Số ${item.bill.invoiceMeta.invoiceNumber}`
                            : item.fileName}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[220px]">
                          {item.bill.utilityCompany.unitName || item.fileName}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-mono tabular-nums whitespace-nowrap">
                        {item.bill.invoiceMeta.period || item.bill.invoiceMeta.month || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-mono tabular-nums whitespace-nowrap">
                        {item.bill.customerInfo.paymentCode || item.bill.customerInfo.customerCode || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                        {formatNumber(item.bill.summary.totalBilledKwh)} kWh
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {formatVND(item.bill.summary.totalPayable, true)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteHistory(item.id);
                          }}
                          aria-label={`Xóa hóa đơn ${item.bill.invoiceMeta.invoiceNumber || item.fileName}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Loading Skeleton
  if (isReading) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Đang đọc dữ liệu hóa đơn">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 animate-pulse"
            >
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
              <div className="h-7 w-32 bg-slate-200 rounded" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-56 bg-slate-200 rounded" />
              <div className="h-4 w-72 bg-slate-100 rounded" />
            </div>
            <div className="h-8 w-28 bg-slate-200 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 bg-slate-100 rounded" />
                <div className="h-4 w-36 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
          <div className="h-44 w-full bg-slate-100 rounded-lg" />
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Không thể đọc hóa đơn</h2>
            <p className="text-sm text-slate-600">{error}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRetryRead}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Thử đọc lại</span>
          </button>
          <button
            type="button"
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <span>Chọn hóa đơn khác</span>
          </button>
        </div>
      </div>
    );
  }

  // Empty State
  if (!bill || !verification) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Sẵn sàng đọc hóa đơn tiền điện</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Tải lên ảnh chụp hoặc file PDF hóa đơn điện để trích xuất tự động chỉ số công tơ, bậc thang giá điện và tổng tiền thanh toán.
        </p>
        <button
          type="button"
          onClick={onUploadClick}
          className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
        >
          Tải hóa đơn lên
        </button>
      </div>
    );
  }

  const displayedBill = isEditing && draft ? draft : bill;
  const avgUnitPriceAfterTax =
    displayedBill.summary.totalBilledKwh > 0
      ? displayedBill.summary.totalPayable / displayedBill.summary.totalBilledKwh
      : 0;
  const avgUnitPriceBeforeTax =
    displayedBill.summary.totalBilledKwh > 0
      ? displayedBill.summary.subtotalAmount / displayedBill.summary.totalBilledKwh
      : 0;

  // Export tab
  if (activeTab === 'export') {
    const jsonString = JSON.stringify(bill, null, 2);
    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Xuất dữ liệu hóa đơn</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Tải xuống bảng kê CSV cho Excel, dữ liệu JSON có cấu trúc hoặc in bản đối soát.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Tải CSV (Excel)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Tải JSON</span>
            </button>
            <button
              type="button"
              onClick={handleCopyJson}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Copy className="w-4 h-4" />
              <span>{copiedJson ? 'Đã sao chép' : 'Sao chép JSON'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>In hóa đơn</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <FileJson className="w-4 h-4" />
            <span>Dữ liệu JSON đã trích xuất</span>
          </div>
          <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-[520px] leading-relaxed">
            {jsonString}
          </pre>
        </div>
      </div>
    );
  }

  // Breakdown / Analytics Tab
  if (activeTab === 'breakdown') {
    const totalTierKwh = bill.tariffBreakdown.reduce((s, t) => s + (t.kwh || 0), 0);
    const totalTierAmount = bill.tariffBreakdown.reduce((s, t) => s + (t.amount || 0), 0);

    return (
      <div className="space-y-5">
        {/* Audit Checklist */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900">Đối soát số học hóa đơn</h2>
            <div className="flex items-center gap-2 text-sm font-semibold">
              {verification.isAllValid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Khớp toàn bộ số liệu</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-700">Cần rà soát chênh lệch</span>
                </>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-200 border-t border-slate-200">
            {[
              { label: '1. Kiểm tra chỉ số công tơ', item: verification.meterCheck },
              { label: '2. Kiểm tra cộng tiền theo bậc thang', item: verification.tierSumCheck },
              { label: '3. Kiểm tra thuế GTGT & Tổng thanh toán', item: verification.vatAndTotalCheck },
            ].map((row) => (
              <div key={row.label} className="py-3.5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{row.label}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{row.item.message}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                    row.item.passed ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {row.item.passed ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span>{row.item.passed ? 'Hợp lệ' : 'Chênh lệch'}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tier Proportion Chart & Detailed Cost Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Phân bổ sản lượng & chi phí theo bậc thang</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Đơn giá bình quân trước thuế: <span className="font-mono tabular-nums font-medium text-slate-800">{formatVND(avgUnitPriceBeforeTax, true)}/kWh</span>
              {' · '}
              Sau thuế GTGT: <span className="font-mono tabular-nums font-medium text-slate-800">{formatVND(avgUnitPriceAfterTax, true)}/kWh</span>
            </p>
          </div>

          {bill.tariffBreakdown.length > 0 ? (
            <>
              {/* Stacked Horizontal Bar */}
              <div className="space-y-2">
                <div className="h-4 w-full rounded-md overflow-hidden flex bg-slate-100">
                  {bill.tariffBreakdown.map((tier, idx) => {
                    const pct = totalTierKwh > 0 ? (tier.kwh / totalTierKwh) * 100 : 0;
                    return (
                      <div
                        key={`${tier.tierLabel}-${idx}`}
                        style={{ width: `${pct}%` }}
                        title={`${tier.tierLabel}: ${tier.kwh} kWh (${pct.toFixed(1)}%)`}
                        className={`${TIER_COLORS[idx % TIER_COLORS.length]} h-full transition-all`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
                  {bill.tariffBreakdown.map((tier, idx) => {
                    const pct = totalTierKwh > 0 ? (tier.kwh / totalTierKwh) * 100 : 0;
                    return (
                      <div key={`legend-${idx}`} className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-sm inline-block ${
                            TIER_COLORS[idx % TIER_COLORS.length]
                          }`}
                        />
                        <span>{tier.tierLabel}:</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-800">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-x-auto border-t border-slate-200 pt-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="py-3 pr-4">Bậc / Biểu giá</th>
                      <th className="py-3 px-4 text-right">Sản lượng (kWh)</th>
                      <th className="py-3 px-4 text-right">Tỷ trọng điện</th>
                      <th className="py-3 px-4 text-right">Đơn giá (VNĐ)</th>
                      <th className="py-3 px-4 text-right">Thành tiền (VNĐ)</th>
                      <th className="py-3 pl-4 text-right">Tỷ trọng tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {bill.tariffBreakdown.map((tier, idx) => {
                      const kwhPct = totalTierKwh > 0 ? (tier.kwh / totalTierKwh) * 100 : 0;
                      const amtPct = totalTierAmount > 0 ? (tier.amount / totalTierAmount) * 100 : 0;
                      return (
                        <tr key={`row-${idx}`} className="hover:bg-slate-50/70">
                          <td className="py-3 pr-4 font-medium text-slate-900">{tier.tierLabel}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                            {formatNumber(tier.kwh)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                            {kwhPct.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                            {formatVND(tier.unitPrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {formatVND(tier.amount)}
                          </td>
                          <td className="py-3 pl-4 text-right font-mono tabular-nums text-slate-500">
                            {amtPct.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Hóa đơn này không liệt kê chi tiết bậc thang.</p>
          )}
        </div>
      </div>
    );
  }

  // Default Tab: 'overview' — Full Structured Electricity Bill Display
  return (
    <div className="space-y-5">
      {/* 4-Column Key Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Tổng tiền thanh toán</p>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-blue-700 tracking-tight">
            {formatVND(displayedBill.summary.totalPayable, true)}
          </p>
          <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            Gồm GTGT {displayedBill.summary.vatRatePercent}% ({formatVND(displayedBill.summary.vatAmount, true)})
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Điện năng tiêu thụ</p>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
            {formatNumber(displayedBill.summary.totalBilledKwh)} kWh
          </p>
          <p className="mt-1 text-xs text-slate-500 truncate">
            {displayedBill.customerInfo.tariffCode || 'Biểu giá điện năng'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Đơn giá bình quân</p>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
            {formatVND(avgUnitPriceAfterTax)} <span className="text-sm font-normal text-slate-500">đ/kWh</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            Trước thuế: {formatVND(avgUnitPriceBeforeTax)} đ/kWh
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Kỳ hóa đơn & Đối soát</p>
          <p className="mt-1.5 text-lg font-bold font-mono tabular-nums text-slate-900 truncate">
            {displayedBill.invoiceMeta.period
              ? `Kỳ ${displayedBill.invoiceMeta.period}`
              : displayedBill.invoiceMeta.month || '—'}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold">
            {verification.isAllValid ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-emerald-700">Khớp số học hóa đơn</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-amber-700">Phát hiện chênh lệch</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Structured Electronic Bill Sheet */}
      <div className="print-full bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Document Header & Action Bar */}
        <div className="px-6 py-5 border-b border-slate-200 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-blue-700">
              {displayedBill.utilityCompany.corporationName || 'Đơn vị điện lực'}
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {displayedBill.invoiceMeta.title || 'HÓA ĐƠN GTGT (TIỀN ĐIỆN)'}
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              {displayedBill.invoiceMeta.subtitle && (
                <>
                  <span>{displayedBill.invoiceMeta.subtitle}</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>
                Từ ngày <strong className="font-mono tabular-nums text-slate-700">{displayedBill.invoiceMeta.fromDate || '—'}</strong> đến{' '}
                <strong className="font-mono tabular-nums text-slate-700">{displayedBill.invoiceMeta.toDate || '—'}</strong>
              </span>
              {displayedBill.invoiceMeta.month && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Tháng {displayedBill.invoiceMeta.month}</span>
                </>
              )}
              {displayedBill.invoiceMeta.batch && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Đợt {displayedBill.invoiceMeta.batch}</span>
                </>
              )}
            </div>
          </div>

          <div className="no-print flex items-center gap-2 shrink-0">
            {!isEditing ? (
              <>
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={saveEditing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu thay đổi</span>
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Hủy</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Section 1: Utility Company & Invoice Identifiers */}
        <div className="px-6 py-5 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-2">
            <h3 className="text-xs font-semibold text-slate-500">Đơn vị phát hành hóa đơn</h3>
            <p className="text-base font-bold text-slate-900">
              {displayedBill.utilityCompany.unitName || '—'}
            </p>
            <p className="text-sm text-slate-600">
              {displayedBill.utilityCompany.address || '—'}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
              <span>
                MST: <span className="font-mono tabular-nums text-slate-900">{displayedBill.utilityCompany.taxCode || '—'}</span>
              </span>
              <span>
                ĐT CSKH: <span className="font-mono tabular-nums text-slate-900">{displayedBill.utilityCompany.phone || '—'}</span>
              </span>
              {displayedBill.utilityCompany.repairPhone && (
                <span>
                  ĐT Sửa chữa: <span className="font-mono tabular-nums text-slate-900">{displayedBill.utilityCompany.repairPhone}</span>
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 text-sm md:border-l md:border-slate-200 md:pl-6">
            <h3 className="text-xs font-semibold text-slate-500 mb-2">Ký hiệu hóa đơn</h3>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Mẫu số</span>
              <span className="font-mono tabular-nums font-medium text-slate-900">
                {displayedBill.invoiceMeta.formCode || '—'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Ký hiệu</span>
              <span className="font-mono tabular-nums font-medium text-slate-900">
                {displayedBill.invoiceMeta.serialCode || '—'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Số hóa đơn</span>
              <span className="font-mono tabular-nums font-bold text-slate-900">
                {displayedBill.invoiceMeta.invoiceNumber || '—'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">ID HĐ</span>
              <span className="font-mono tabular-nums text-slate-800">
                {displayedBill.invoiceMeta.invoiceId || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Customer & Metering Point Details */}
        <div className="px-6 py-5 border-b border-slate-200 space-y-4">
          <h3 className="text-xs font-semibold text-slate-500">Thông tin khách hàng & Điểm đo</h3>

          {isEditing && draft ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(
                [
                  ['Tên khách hàng', 'name'],
                  ['Địa chỉ khách hàng', 'address'],
                  ['Mã thanh toán', 'paymentCode'],
                  ['Mã khách hàng', 'customerCode'],
                  ['Số công tơ', 'meterNumber'],
                  ['Mã điểm đo', 'meteringPointCode'],
                  ['Mã trạm', 'stationCode'],
                  ['Số GCS', 'gcsBookCode'],
                  ['Mã giá', 'tariffCode'],
                ] as const
              ).map(([label, field]) => (
                <label key={field} className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">{label}</span>
                  <input
                    type="text"
                    value={draft.customerInfo[field] ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        customerInfo: {
                          ...draft.customerInfo,
                          [field]: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </label>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3.5 text-sm">
              <div>
                <div className="text-xs text-slate-500">Tên khách hàng</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {displayedBill.customerInfo.name || <span className="text-slate-400 font-normal">(Trống / đã che trên ảnh)</span>}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-slate-500">Địa chỉ khách hàng / dùng điện</div>
                <div className="text-slate-800 mt-0.5">
                  {displayedBill.customerInfo.address ||
                    displayedBill.customerInfo.usageAddress || (
                      <span className="text-slate-400">(Trống / đã che trên ảnh)</span>
                    )}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Mã thanh toán / Mã KH</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {displayedBill.customerInfo.paymentCode || displayedBill.customerInfo.customerCode || '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Số công tơ</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {displayedBill.customerInfo.meterNumber || '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Mã điểm đo</div>
                <div className="font-mono tabular-nums text-slate-800 mt-0.5 break-all">
                  {displayedBill.customerInfo.meteringPointCode || '—'}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Mã giá áp dụng</div>
                <div className="font-mono text-slate-800 mt-0.5">
                  {displayedBill.customerInfo.tariffCode || '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Trạm / Số GCS / Phiên</div>
                <div className="font-mono tabular-nums text-slate-800 mt-0.5">
                  {[
                    displayedBill.customerInfo.stationCode,
                    displayedBill.customerInfo.gcsBookCode,
                    displayedBill.customerInfo.gcsSession,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Số hộ · Cấp ĐA · Mã tổ</div>
                <div className="font-mono tabular-nums text-slate-800 mt-0.5">
                  {displayedBill.customerInfo.householdsCount ?? '—'} hộ · Cấp{' '}
                  {displayedBill.customerInfo.voltageLevel || '—'} · Tổ{' '}
                  {displayedBill.customerInfo.teamCode || '—'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Meter Readings Table */}
        <div className="px-6 py-5 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-slate-500">Bảng chỉ số công tơ</h3>
            {(displayedBill.customerInfo.slvcSlhc ||
              displayedBill.customerInfo.cosPhi ||
              displayedBill.customerInfo.kFactorPercent) && (
              <div className="text-xs font-mono tabular-nums text-slate-500">
                SLVC/SLHC: {displayedBill.customerInfo.slvcSlhc || '0/0'} · Cosφ:{' '}
                {displayedBill.customerInfo.cosPhi || '0'} · Hệ số K:{' '}
                {displayedBill.customerInfo.kFactorPercent || '0'}%
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Bộ chỉ số</th>
                  <th className="py-2.5 px-3 text-right">Chỉ số mới</th>
                  <th className="py-2.5 px-3 text-right">Chỉ số cũ</th>
                  <th className="py-2.5 px-3 text-right">Hệ số nhân</th>
                  <th className="py-2.5 px-3 text-right">ĐN tiêu thụ</th>
                  <th className="py-2.5 px-3 text-right">ĐN trực tiếp</th>
                  <th className="py-2.5 px-3 text-right">ĐN trừ phụ</th>
                  <th className="py-2.5 px-3 text-right">ĐN tính giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm font-mono tabular-nums">
                {displayedBill.meterReadings.length > 0 ? (
                  displayedBill.meterReadings.map((reading, idx) => (
                    <tr key={`meter-${idx}`} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {reading.registerType || 'KT'}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-900 font-semibold">
                        {formatNumber(reading.newReading)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">
                        {formatNumber(reading.oldReading)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">
                        {formatNumber(reading.multiplier)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-800">
                        {formatNumber(reading.consumedKwh)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {formatNumber(reading.directKwh)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {formatNumber(reading.deductedKwh)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-blue-700">
                        {formatNumber(reading.billedKwh)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-4 px-3 text-center text-slate-500 font-sans">
                      Không ghi nhận dòng chỉ số công tơ trên hóa đơn.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Tariff Tiers & Payment Totals */}
        <div className="px-6 py-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-500">Chi tiết tính tiền theo bậc thang & Thanh toán</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Bậc thang / Diễn giải</th>
                  <th className="py-2.5 px-3 text-right">ĐN tính giá (kWh)</th>
                  <th className="py-2.5 px-3 text-right">Đơn giá (đ/kWh)</th>
                  <th className="py-2.5 px-3 text-right">Thành tiền (VNĐ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {displayedBill.tariffBreakdown.map((tier, idx) => (
                  <tr key={`tier-${idx}`} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-medium text-slate-800">{tier.tierLabel}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800">
                      {formatNumber(tier.kwh)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatVND(tier.unitPrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatVND(tier.amount)}
                    </td>
                  </tr>
                ))}

                {/* Subtotal Row */}
                <tr className="bg-slate-50/80 font-semibold border-t border-slate-300">
                  <td className="py-3 px-3 text-slate-800">Cộng tiền điện (chưa thuế GTGT)</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900">
                    {formatNumber(displayedBill.summary.totalBilledKwh)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900">
                    {formatVND(displayedBill.summary.subtotalAmount)}
                  </td>
                </tr>

                {/* VAT Row */}
                <tr>
                  <td className="py-3 px-3 text-slate-700">
                    Thuế GTGT (Thuế suất {displayedBill.summary.vatRatePercent}%)
                  </td>
                  <td className="py-3 px-3" />
                  <td className="py-3 px-3" />
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-slate-900">
                    {formatVND(displayedBill.summary.vatAmount)}
                  </td>
                </tr>

                {/* Grand Total Row */}
                <tr className="bg-blue-50/70 border-t-2 border-blue-200">
                  <td className="py-3.5 px-3 text-base font-bold text-slate-900">
                    Tổng tiền thanh toán
                  </td>
                  <td className="py-3.5 px-3" />
                  <td className="py-3.5 px-3" />
                  <td className="py-3.5 px-3 text-right text-lg font-bold font-mono tabular-nums text-blue-700">
                    {formatVND(displayedBill.summary.totalPayable, true)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in words & Signer Footer */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <div>
              <span className="text-slate-500">Số tiền bằng chữ: </span>
              <span className="italic font-medium text-slate-900">
                {displayedBill.summary.amountInWords || '—'}
              </span>
            </div>
            {(displayedBill.invoiceMeta.issueDate || displayedBill.invoiceMeta.signer) && (
              <div className="text-xs text-slate-500 sm:text-right">
                {displayedBill.invoiceMeta.issueDate && (
                  <div>Ngày ký: <span className="font-mono tabular-nums text-slate-700">{displayedBill.invoiceMeta.issueDate}</span></div>
                )}
                {displayedBill.invoiceMeta.signer && (
                  <div className="text-slate-700 mt-0.5">{displayedBill.invoiceMeta.signer}</div>
                )}
              </div>
            )}
          </div>

          {displayedBill.notes && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <strong className="text-slate-800">Ghi chú trích xuất: </strong>
              {displayedBill.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
