import React, { useRef, useState } from 'react';
import {
  FileImage,
  FileText,
  RotateCw,
  ScanLine,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

interface BillViewerPaneProps {
  imageUrl: string;
  mimeType: string;
  fileName: string;
  isReading: boolean;
  isSample: boolean;
  onFileSelected: (file: File) => void;
  onReadSample: () => void;
  onRescanCurrent: () => void;
}

export const BillViewerPane: React.FC<BillViewerPaneProps> = ({
  imageUrl,
  mimeType,
  fileName,
  isReading,
  isSample,
  onFileSelected,
  onReadSample,
  onRescanCurrent,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imgLoadError, setImgLoadError] = useState<boolean>(false);

  const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

  const handleZoomIn = () => setZoom((z) => Math.min(240, z + 20));
  const handleZoomOut = () => setZoom((z) => Math.max(60, z - 20));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleResetView = () => {
    setZoom(100);
    setRotation(0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setImgLoadError(false);
      onFileSelected(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImgLoadError(false);
      onFileSelected(file);
    }
    e.target.value = '';
  };

  return (
    <section
      aria-label="Tài liệu hóa đơn gốc"
      className="no-print flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden lg:sticky lg:top-6 lg:max-h-[calc(100vh-7rem)]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/70">
        <div className="min-w-0 flex items-center gap-2">
          {isPdf ? (
            <FileText className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
          ) : (
            <FileImage className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
          )}
          <span className="text-sm font-semibold text-slate-800 truncate max-w-[210px]" title={fileName}>
            {fileName}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isPdf && (
            <>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Thu nhỏ"
                aria-label="Thu nhỏ ảnh hóa đơn"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono tabular-nums text-slate-600 w-11 text-center select-none">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Phóng to"
                aria-label="Phóng to ảnh hóa đơn"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                title="Xoay 90°"
                aria-label="Xoay ảnh 90 độ"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              {(zoom !== 100 || rotation !== 0) && (
                <button
                  type="button"
                  onClick={handleResetView}
                  title="Đặt lại góc nhìn"
                  aria-label="Đặt lại tỷ lệ và góc xoay"
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Document Viewport */}
      <div
        className={`relative flex-1 min-h-[360px] lg:min-h-[460px] overflow-auto bg-slate-100/90 flex items-center justify-center p-4 transition-colors ${
          isDragging ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : ''
        }`}
      >
        {isDragging && (
          <div className="absolute inset-3 z-20 rounded-lg bg-white/95 border-2 border-dashed border-blue-600 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <Upload className="w-7 h-7 text-blue-600" />
            <p className="text-sm font-semibold text-slate-900">Thả ảnh hoặc file PDF hóa đơn vào đây</p>
          </div>
        )}

        {imageUrl ? (
          isPdf ? (
            <iframe
              src={imageUrl}
              title={fileName}
              className="w-full h-[520px] rounded-lg border border-slate-200 bg-white"
            />
          ) : !imgLoadError ? (
            <div className="w-full flex items-center justify-center overflow-auto">
              <img
                src={imageUrl}
                alt={`Ảnh hóa đơn tiền điện: ${fileName}`}
                referrerPolicy="no-referrer"
                onError={() => setImgLoadError(true)}
                style={{
                  width: `${zoom}%`,
                  maxWidth: 'none',
                  transform: `rotate(${rotation}deg)`,
                  transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className="rounded border border-slate-200 bg-white shadow-sm object-contain"
              />
            </div>
          ) : (
            <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center space-y-2">
              <FileImage className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-medium text-slate-800">{fileName}</p>
              <p className="text-xs text-slate-500">Không thể hiển thị xem trước ảnh.</p>
            </div>
          )
        ) : (
          <div className="text-center space-y-2 p-6">
            <FileImage className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm text-slate-600">Chưa có tài liệu hóa đơn</p>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-4 border-t border-slate-200 bg-white space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isReading}
            className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>Chọn ảnh / PDF khác</span>
          </button>

          <button
            type="button"
            onClick={onRescanCurrent}
            disabled={isReading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <ScanLine className="w-4 h-4 shrink-0" />
            <span>{isReading ? 'Đang đọc...' : 'Đọc lại'}</span>
          </button>

          {!isSample && (
            <button
              type="button"
              onClick={onReadSample}
              disabled={isReading}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Mở lại hóa đơn mẫu EVNHCMC đính kèm
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Hỗ trợ kéo thả file ảnh (PNG, JPG, WEBP), PDF hoặc dán trực tiếp từ clipboard (Ctrl+V).
        </p>
      </div>
    </section>
  );
};
