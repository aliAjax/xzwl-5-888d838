import { useState, useEffect } from 'react';
import { X, Printer, Music2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { HandpanRecord, DeliveryChecklist } from '@/types/record';
import { getStatusLabel, getStatusColor, getLatestTuningDate, getLatestDeviationNote, getLatestTuning } from '@/types/record';

interface DeliveryOrderProps {
  isOpen: boolean;
  onClose: () => void;
  record: HandpanRecord | null;
  onSaveChecklist?: (recordId: string, checklist: DeliveryChecklist) => void;
  onConfirmDelivery?: (recordId: string) => void;
}

const createEmptyChecklist = (): DeliveryChecklist => ({
  pitchReview: false,
  appearanceCheck: false,
  accessoriesConfirm: false,
  customerInstructions: false,
  remark: '',
});

export function DeliveryOrder({ isOpen, onClose, record, onSaveChecklist, onConfirmDelivery }: DeliveryOrderProps) {
  const [checklist, setChecklist] = useState<DeliveryChecklist>(createEmptyChecklist());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (isOpen && record) {
      setChecklist(record.deliveryChecklist || createEmptyChecklist());
      setShowConfirmDialog(false);
    }
  }, [isOpen, record]);

  if (!isOpen || !record) return null;

  const latestTuningDate = getLatestTuningDate(record);
  const latestDeviationNote = getLatestDeviationNote(record);
  const latestTuning = getLatestTuning(record);

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

  const handleChecklistChange = (field: keyof DeliveryChecklist, value: boolean | string) => {
    const newChecklist = { ...checklist, [field]: value };
    setChecklist(newChecklist);
    if (onSaveChecklist && record) {
      onSaveChecklist(record.id, newChecklist);
    }
  };

  const uncheckedItems = [
    !checklist.pitchReview && '音准复查',
    !checklist.appearanceCheck && '外观检查',
    !checklist.accessoriesConfirm && '配件确认',
    !checklist.customerInstructions && '客户说明',
  ].filter(Boolean) as string[];

  const handleConfirmDeliveryClick = () => {
    if (record.deliveryStatus === 'delivered') {
      return;
    }
    if (uncheckedItems.length > 0) {
      setShowConfirmDialog(true);
    } else {
      handleConfirmDelivery();
    }
  };

  const handleConfirmDelivery = () => {
    if (onConfirmDelivery && record) {
      onConfirmDelivery(record.id);
    }
    setShowConfirmDialog(false);
  };

  const checklistItems = [
    { key: 'pitchReview' as const, label: '音准复查', icon: '🎵' },
    { key: 'appearanceCheck' as const, label: '外观检查', icon: '👁️' },
    { key: 'accessoriesConfirm' as const, label: '配件确认', icon: '📦' },
    { key: 'customerInstructions' as const, label: '客户说明', icon: '💬' },
  ];

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
                <p className="text-lg font-semibold text-ink-500">{formatDateShort(latestTuningDate)}</p>
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
                <p className="text-xl font-semibold text-ink-500">{formatDate(latestTuningDate)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-ink-400 uppercase tracking-wider">交付状态</p>
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(record.deliveryStatus)}`}>
                {getStatusLabel(record.deliveryStatus)}
              </span>
            </div>

            {latestTuning?.beforeStatus && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-ink-400 uppercase tracking-wider">调音前状态</p>
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                  <p className="text-amber-800 leading-relaxed whitespace-pre-wrap">
                    {latestTuning.beforeStatus}
                  </p>
                </div>
              </div>
            )}

            {latestTuning?.afterStatus && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-ink-400 uppercase tracking-wider">调音后状态</p>
                <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                  <p className="text-green-800 leading-relaxed whitespace-pre-wrap">
                    {latestTuning.afterStatus}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <p className="text-xs text-ink-400 uppercase tracking-wider">偏音说明</p>
              <div className="bg-ink-50 rounded-xl p-5 border border-ink-100">
                <p className="text-ink-500 leading-relaxed whitespace-pre-wrap">
                  {latestDeviationNote || <span className="text-ink-300">无</span>}
                </p>
              </div>
            </div>

            <div className="no-print space-y-4 pt-4 border-t-2 border-clay-100">
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wider mb-3">交付前检查清单</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {checklistItems.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
                      style={{
                        borderColor: checklist[item.key] ? '#d97706' : '#e5e7eb',
                        backgroundColor: checklist[item.key] ? '#fef3c7' : '#f9fafb',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checklist[item.key]}
                        onChange={(e) => handleChecklistChange(item.key, e.target.checked)}
                        className="w-5 h-5 rounded border-clay-300 text-brass-600 focus:ring-brass-500"
                      />
                      <span className="text-2xl">{item.icon}</span>
                      <span className={`font-medium ${checklist[item.key] ? 'text-brass-700' : 'text-ink-600'}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-ink-400 uppercase tracking-wider mb-2">备注</label>
                <textarea
                  value={checklist.remark}
                  onChange={(e) => handleChecklistChange('remark', e.target.value)}
                  placeholder="记录检查过程中的特殊说明、客户要求等..."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>

              {record.deliveryStatus !== 'delivered' && (
                <div className="pt-2">
                  <button
                    onClick={handleConfirmDeliveryClick}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-clay-500 to-brass-500 hover:from-clay-600 hover:to-brass-600 text-white py-3 px-6 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>确认交付</span>
                  </button>
                  {uncheckedItems.length > 0 && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      还有 {uncheckedItems.length} 项未完成检查
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="print-only space-y-4 pt-4 border-t-2 border-clay-100">
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wider mb-3">交付前检查清单</p>
                <div className="grid grid-cols-2 gap-3">
                  {checklistItems.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 p-3 rounded-xl border border-ink-200">
                      <span className={`w-5 h-5 flex items-center justify-center rounded border ${checklist[item.key] ? 'bg-green-500 border-green-500 text-white' : 'border-ink-300'}`}>
                        {checklist[item.key] && <CheckCircle2 className="w-4 h-4" />}
                      </span>
                      <span className="text-2xl">{item.icon}</span>
                      <span className="font-medium text-ink-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {checklist.remark && (
                <div>
                  <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">备注</p>
                  <div className="bg-ink-50 rounded-xl p-4 border border-ink-100">
                    <p className="text-ink-600 leading-relaxed whitespace-pre-wrap">{checklist.remark}</p>
                  </div>
                </div>
              )}
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

      {showConfirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
            <div className="bg-amber-50 p-6 border-b border-amber-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink-500">检查清单未完成</h3>
                  <p className="text-sm text-ink-400">以下项目尚未检查确认</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <ul className="space-y-2 mb-6">
                {uncheckedItems.map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-ink-600">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-ink-500 mb-6">
                确定要跳过这些检查并标记为已交付吗？此操作可以继续，但建议完成所有检查项。
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="btn-secondary"
                >
                  返回检查
                </button>
                <button
                  onClick={handleConfirmDelivery}
                  className="btn-primary bg-amber-500 hover:bg-amber-600"
                >
                  确认交付
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
