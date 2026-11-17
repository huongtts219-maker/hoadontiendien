import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { BillViewerPane } from './components/BillViewerPane';
import { ActiveTab, BillDisplayPane } from './components/BillDisplayPane';
import type { ElectricityBill, SavedBillRecord } from './types/bill';

const SAMPLE_IMAGE_URL = '/assets/aistudio/image_20a4dd18.png';
const SAMPLE_FILE_NAME = 'hoa-don-evnhcmc-mau.png';
const STORAGE_KEY = 'soat_hoa_don_dien_history_v1';

const NAV_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: 'overview', label: 'Tổng quan hóa đơn' },
  { id: 'breakdown', label: 'Chỉ số & Bậc thang' },
  { id: 'history', label: 'Lịch sử đã đọc' },
  { id: 'export', label: 'Xuất dữ liệu' },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Không thể đọc file từ thiết bị.'));
    reader.readAsDataURL(file);
  });
}

function loadHistory(): SavedBillRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(records: SavedBillRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 12)));
  } catch {
    // If localStorage quota is exceeded due to large base64 images, keep only the latest 3
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 3)));
    } catch {
      // Ignore storage failure cleanly
    }
  }
}

export default function App() {
  const headerFileInputRef = useRef<HTMLInputElement>(null);
  const initialMountTriggeredRef = useRef(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [history, setHistory] = useState<SavedBillRecord[]>(() => loadHistory());
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);

  const [currentImageUrl, setCurrentImageUrl] = useState<string>(SAMPLE_IMAGE_URL);
  const [currentMimeType, setCurrentMimeType] = useState<string>('image/png');
  const [currentFileName, setCurrentFileName] = useState<string>(SAMPLE_FILE_NAME);
  const [isSample, setIsSample] = useState<boolean>(true);

  const [bill, setBill] = useState<ElectricityBill | null>(null);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const persistNewRecord = useCallback(
    (
      parsedBill: ElectricityBill,
      opts: { imageUrl: string; mimeType: string; fileName: string; isSample: boolean }
    ) => {
      const record: SavedBillRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fileName: opts.fileName,
        scannedAt: new Date().toISOString(),
        imageUrl: opts.imageUrl,
        mimeType: opts.mimeType,
        isSample: opts.isSample,
        bill: parsedBill,
      };
      setActiveRecordId(record.id);
      setHistory((prev) => {
        const filtered = opts.isSample ? prev.filter((item) => !item.isSample) : prev;
        const next = [record, ...filtered].slice(0, 12);
        saveHistory(next);
        return next;
      });
    },
    []
  );

  const readSampleBill = useCallback(async () => {
    setIsSample(true);
    setCurrentImageUrl(SAMPLE_IMAGE_URL);
    setCurrentMimeType('image/png');
    setCurrentFileName(SAMPLE_FILE_NAME);
    setError(null);
    setIsReading(true);

    try {
      const response = await fetch('/api/read-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useSample: true }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Lỗi không xác định khi đọc hóa đơn.');
      }

      setBill(data.bill);
      persistNewRecord(data.bill, {
        imageUrl: SAMPLE_IMAGE_URL,
        mimeType: 'image/png',
        fileName: SAMPLE_FILE_NAME,
        isSample: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể kết nối máy chủ đọc hóa đơn.');
    } finally {
      setIsReading(false);
    }
  }, [persistNewRecord]);

  const readUploadedFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsReading(true);
      setActiveTab('overview');

      try {
        const dataUrl = await readFileAsDataUrl(file);
        const mimeType = file.type || 'image/jpeg';

        setIsSample(false);
        setCurrentImageUrl(dataUrl);
        setCurrentMimeType(mimeType);
        setCurrentFileName(file.name);

        const response = await fetch('/api/read-bill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: dataUrl,
            mimeType,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Lỗi không xác định khi đọc hóa đơn.');
        }

        setBill(data.bill);
        persistNewRecord(data.bill, {
          imageUrl: dataUrl,
          mimeType,
          fileName: file.name,
          isSample: false,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể đọc file hóa đơn.');
      } finally {
        setIsReading(false);
      }
    },
    [persistNewRecord]
  );

  const handleRescanCurrent = useCallback(async () => {
    if (isSample) {
      await readSampleBill();
      return;
    }
    if (!currentImageUrl) return;
    setError(null);
    setIsReading(true);
    try {
      const response = await fetch('/api/read-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: currentImageUrl,
          mimeType: currentMimeType,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Lỗi không xác định khi đọc lại hóa đơn.');
      }
      setBill(data.bill);
      persistNewRecord(data.bill, {
        imageUrl: currentImageUrl,
        mimeType: currentMimeType,
        fileName: currentFileName,
        isSample: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đọc lại hóa đơn.');
    } finally {
      setIsReading(false);
    }
  }, [currentFileName, currentImageUrl, currentMimeType, isSample, persistNewRecord, readSampleBill]);

  // On initial mount: load cached sample or read the attached sample bill automatically
  useEffect(() => {
    if (initialMountTriggeredRef.current) return;
    initialMountTriggeredRef.current = true;

    const existingSample = history.find((item) => item.isSample);
    if (existingSample) {
      setBill(existingSample.bill);
      setActiveRecordId(existingSample.id);
      setCurrentImageUrl(existingSample.imageUrl);
      setCurrentMimeType(existingSample.mimeType);
      setCurrentFileName(existingSample.fileName);
      setIsSample(true);
    } else {
      void readSampleBill();
    }
  }, [history, readSampleBill]);

  // Global Ctrl+V paste handler for screenshots
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/') || item.type === 'application/pdf') {
          const pastedFile = item.getAsFile();
          if (pastedFile) {
            void readUploadedFile(pastedFile);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [readUploadedFile]);

  const handleUpdateBill = (updated: ElectricityBill) => {
    setBill(updated);
    if (activeRecordId) {
      setHistory((prev) => {
        const next = prev.map((r) => (r.id === activeRecordId ? { ...r, bill: updated } : r));
        saveHistory(next);
        return next;
      });
    }
  };

  const handleSelectHistory = (record: SavedBillRecord) => {
    setBill(record.bill);
    setActiveRecordId(record.id);
    setCurrentImageUrl(record.imageUrl);
    setCurrentMimeType(record.mimeType);
    setCurrentFileName(record.fileName);
    setIsSample(Boolean(record.isSample));
    setError(null);
    setActiveTab('overview');
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveHistory(next);
      return next;
    });
    if (activeRecordId === id) {
      setActiveRecordId(null);
    }
  };

  const handleHeaderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void readUploadedFile(file);
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar (3-zone contract: wordmark — 4 concise nav links — 1 primary CTA) */}
      <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('overview');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Soát Hóa Đơn Điện
          </a>

          <nav aria-label="Điều hướng chính" className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                    isActive
                      ? 'border-blue-700 text-blue-700 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="shrink-0">
            <input
              ref={headerFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
              onChange={handleHeaderUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => headerFileInputRef.current?.click()}
              disabled={isReading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>Tải hóa đơn lên</span>
            </button>
          </div>
        </div>

        {/* Mobile Secondary Tab Bar */}
        <div className="md:hidden border-t border-slate-200 px-4 overflow-x-auto flex items-center gap-4">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={`mobile-${item.id}`}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-2.5 text-xs font-medium border-b-2 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'border-blue-700 text-blue-700 font-semibold'
                    : 'border-transparent text-slate-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Split Workspace */}
      <main id="top" className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Document Viewer (5 cols on desktop) */}
          <div className="lg:col-span-5">
            <BillViewerPane
              imageUrl={currentImageUrl}
              mimeType={currentMimeType}
              fileName={currentFileName}
              isReading={isReading}
              isSample={isSample}
              onFileSelected={(file) => void readUploadedFile(file)}
              onReadSample={() => void readSampleBill()}
              onRescanCurrent={() => void handleRescanCurrent()}
            />
          </div>

          {/* Right Column: Extracted Bill Display (7 cols on desktop) */}
          <div className="lg:col-span-7">
            <BillDisplayPane
              activeTab={activeTab}
              bill={bill}
              isReading={isReading}
              error={error}
              history={history}
              activeRecordId={activeRecordId}
              onRetryRead={() => void handleRescanCurrent()}
              onUpdateBill={handleUpdateBill}
              onSelectHistory={handleSelectHistory}
              onDeleteHistory={handleDeleteHistory}
              onUploadClick={() => headerFileInputRef.current?.click()}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
