import { Edit2, Trash2, Calendar, User, Hash, FileText } from 'lucide-react';
import type { HandpanRecord } from '@/types/record';
import { getStatusLabel, getStatusColor } from '@/types/record';

interface RecordCardProps {
  record: HandpanRecord;
  onEdit: (record: HandpanRecord) => void;
  onDelete: (id: string) => void;
  onGenerateDelivery: (record: HandpanRecord) => void;
  index: number;
  showDeliveryButton?: boolean;
}

export function RecordCard({ record, onEdit, onDelete, onGenerateDelivery, index, showDeliveryButton = true }: RecordCardProps) {
  const handleDelete = () => {
    if (confirm(`确定要删除记录 "${record.serialNumber}" 吗？`)) {
      onDelete(record.id);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div
      className="card-base p-5 animate-fade-in-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="bg-clay-100 text-clay-700 px-2.5 py-1 rounded-lg text-sm font-semibold font-mono">
            {record.serialNumber}
          </span>
          <span className={`badge ${getStatusColor(record.deliveryStatus)}`}>
            {getStatusLabel(record.deliveryStatus)}
          </span>
        </div>
        <span className="bg-brass-50 text-brass-600 px-2.5 py-1 rounded-lg text-sm font-semibold">
          {record.mode}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <Hash className="w-4 h-4" />
          <span>音位数量：</span>
          <span className="text-ink-500 font-medium">{record.noteCount} 音</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <Calendar className="w-4 h-4" />
          <span>最近调音：</span>
          <span className="text-ink-500 font-medium">{formatDate(record.lastTuningDate)}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <User className="w-4 h-4" />
          <span>客户：</span>
          <span className="text-ink-500 font-medium">{record.customerNickname}</span>
        </div>
      </div>

      {record.deviationNote && (
        <div className="bg-clay-50 rounded-xl p-3 mb-4 border border-clay-100">
          <p className="text-xs text-ink-400 mb-1">偏音说明</p>
          <p className="text-sm text-ink-500 leading-relaxed">
            {record.deviationNote}
          </p>
        </div>
      )}

      <div className={`flex items-center pt-3 border-t border-clay-100 ${showDeliveryButton ? 'justify-between' : 'justify-end'}`}>
        {showDeliveryButton && (
          <button
            onClick={() => onGenerateDelivery(record)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-brass-600 hover:text-brass-700 hover:bg-brass-50 transition-all"
            title="生成交付单"
          >
            <FileText className="w-4 h-4" />
            <span>交付单</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(record)}
            className="p-2 rounded-lg text-ink-400 hover:text-clay-500 hover:bg-clay-50 transition-all"
            title="编辑"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50 transition-all"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
