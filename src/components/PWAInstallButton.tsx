import React, { useState } from 'react';
import { MonitorDown, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#d6cec2] bg-[#201a13] border border-[#382e22] hover:border-[#8d6b38] hover:text-[#f0cf89] rounded-lg transition-colors whitespace-nowrap shrink-0 print:hidden"
        title="Pasang aplikasi agar bisa dibuka tanpa internet"
      >
        <MonitorDown className="w-3.5 h-3.5 text-[#dfb365]" />
        <span className="hidden sm:inline">Pasang Aplikasi</span>
        <span className="sm:hidden">Pasang</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#d6cec2] bg-[#201a13] border border-[#382e22] hover:border-[#8d6b38] hover:text-[#f0cf89] rounded-lg transition-colors whitespace-nowrap shrink-0 print:hidden"
        >
          <MonitorDown className="w-3.5 h-3.5 text-[#dfb365]" />
          <span>Pasang di iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 print:hidden">
            <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl border border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900">
                  Pasang di iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                  aria-label="Tutup panduan"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-600 list-decimal list-inside">
                <li>
                  Ketuk tombol{' '}
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                    <Share className="w-3.5 h-3.5 text-blue-600" /> Bagikan
                  </span>{' '}
                  di bilah Safari.
                </li>
                <li>
                  Gulir ke bawah lalu pilih{' '}
                  <strong className="text-slate-900">
                    Tambah ke Layar Utama
                  </strong>{' '}
                  (Add to Home Screen).
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-slate-900 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
