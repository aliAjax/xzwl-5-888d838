import { X, Upload, AlertCircle, CheckCircle, Hash, FileJson } from 'lucide-react';
import type { ImportAnalysis } from '@/utils/storage';
import { RecordCard } from './RecordCard';

interface ImportPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  analysis: ImportAnalysis | null;
  fileName: string;
}

const FIELD_LABELS: Record<string, string> = {
  serialNumber: '编号',
  mode: '调式',
  noteCount: '音位数量',
  lastTuningDate: '最近调音日期',
  customerNickname: '客户昵称',
  deliveryStatus: '交付状态',
};

export function ImportPreview({ isOpen, onClose, onConfirm, analysis, fileName }: ImportPreviewProps) {
  if (!isOpen || !analysis) return null;

  const handleEdit = () => {};
  const handleDelete = () => {};
  const handleGenerateDelivery = () => {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-clay-100 paper-texture">
          <div className="flex items-center justify-between p-6 border-b border-clay-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brass-100 flex items-center justify-center">
                <Upload className="w-5 h-5 text-brass-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-ink-500">导入数据预览</h2>
                <p className="text-sm text-ink-400 flex items-center gap-1">
                  <FileJson className="w-3.5 h-3.5" />
                  {fileName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-ink-400 hover:text-ink-500 hover:bg-clay-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-clay-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-ink-500">{analysis.total}</div>
                <div className="text-sm text-ink-400 mt-1">总记录数</div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{analysis.valid.length}</div>
                <div className="text-sm text-green-600 mt-1">有效记录</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-amber-600">{analysis.duplicateSerialNumbers.length}</div>
                <div className="text-sm text-amber-600 mt-1">编号重复</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{analysis.missingFields.length}</div>
                <div className="text-sm text-red-600 mt-1">字段缺失</div>
              </div>
            </div>

            {analysis.duplicateSerialNumbers.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-ink-500">编号重复的记录（将被跳过）</h3>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex flex-wrap gap-2">
                    {analysis.duplicateSerialNumbers.map((record, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg text-sm border border-amber-200"
                      >
                        <Hash className="w-3.5 h-3.5 text-amber-500" />
                        {record.serialNumber}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {analysis.missingFields.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h3 className="font-semibold text-ink-500">字段缺失的记录（将被跳过）</h3>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {analysis.missingFields.map((item, index) => (
                    <div 
                      key={index}
                      className="bg-red-50 border border-red-200 rounded-xl p-3"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-ink-500">
                          记录 {index + 1}
                          {item.record.serialNumber && ` (${item.record.serialNumber})`}
                        </span>
                        <span className="text-red-600">
                          缺失：{item.missingFields.map(f => FIELD_LABELS[f] || f).join('、')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.valid.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-ink-500">即将导入的记录（共 {analysis.valid.length} 条）</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
                  {analysis.valid.map((record, index) => (
                    <RecordCard
                      key={record.id || `import-${index}`}
                      record={record}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onGenerateDelivery={handleGenerateDelivery}
                      onViewDetail={() => {}}
                      index={index}
                      showDeliveryButton={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {analysis.valid.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-clay-100 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-clay-400" />
                </div>
                <p className="text-ink-500 font-medium">没有可导入的有效记录</p>
                <p className="text-sm text-ink-400 mt-1">请检查文件格式或数据内容</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-clay-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="btn-primary inline-flex items-center gap-2"
              disabled={analysis.valid.length === 0}
            >
              <Upload className="w-4 h-4" />
              <span>确认导入 {analysis.valid.length > 0 ? `(${analysis.valid.length} 条)` : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
