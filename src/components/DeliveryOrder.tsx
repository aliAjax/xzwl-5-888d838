import { X, Printer, Music2 } from 'lucide-react';
import type { HandpanRecord } from '@/types/record';
import { getStatusLabel, getStatusColor } from '@/types/record';

interface DeliveryOrderProps {
  isOpen: boolean;
  onClose: () => void;
  record: HandpanRecord | null;
}

export function DeliveryOrder({ isOpen, onClose, record }: DeliveryOrderProps) {
  if (!isOpen || !record) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:bg-transparent print:backdrop-blur-none print:p-0"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="no-print absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-brass-500 hover:bg-brass-600 text-white px-4 py-2 rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            <Printer className="w-4 h-4" />
            <span>打印</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-white/90 hover:bg-white text-ink-400 hover:text-ink-500 rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="delivery-order-content bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-clay-500 to-brass-500 text-white p-8 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <Music2 className="w-8 h-8" />
              <h1 className="text-3xl font-bold tracking-wide">手碟调音交付单</h1>
            </div>
            <p className="text-white/80 text-sm">HANDPAN TUNING DELIVERY NOTE</p>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-clay-100">
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wider mb-1">交付单编号</p>
                <p className="text-2xl font-bold text-ink-500 font-mono">{record.serialNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-400 uppercase tracking-wider mb-1">交付日期</p>
                <p className="text-lg font-semibold text-ink-500">{formatDateShort(record.lastTuningDate)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-clay-50 rounded-xl p-5">
                <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">客户昵称</p>
                <p className="text-xl font-semibold text-ink-500">{record.customerNickname}</p>
              </div>
              <div className="bg-brass-50 rounded-xl p-5">
                <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">调式</p>
                <p className="text-xl font-semibold text-ink-500">{record.mode}</p>
              </div>
              <div className="bg-clay-50 rounded-xl p-5">
                <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">音位数量</p>
                <p className="text-xl font-semibold text-ink-500">{record.noteCount} 音</p>
              </div>
              <div className="bg-brass-50 rounded-xl p-5">
                <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">最近调音日期</p>
                <p className="text-xl font-semibold text-ink-500">{formatDate(record.lastTuningDate)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-ink-400 uppercase tracking-wider">交付状态</p>
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(record.deliveryStatus)}`}>
                {getStatusLabel(record.deliveryStatus)}
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-xs text-ink-400 uppercase tracking-wider">偏音说明</p>
              <div className="bg-ink-50 rounded-xl p-5 border border-ink-100">
                <p className="text-ink-500 leading-relaxed whitespace-pre-wrap">
                  {record.deviationNote || <span className="text-ink-300">无</span>}
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t-2 border-clay-100">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="border-b border-dashed border-ink-300 h-16 mb-2"></div>
                  <p className="text-xs text-ink-400">调音师签字</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-dashed border-ink-300 h-16 mb-2"></div>
                  <p className="text-xs text-ink-400">客户签收</p>
                </div>
              </div>
            </div>

            <div className="pt-4 text-center text-xs text-ink-300">
              <p>本交付单由手碟调音管理系统自动生成</p>
              <p className="mt-1">Generated on {formatDate(new Date().toISOString())}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
