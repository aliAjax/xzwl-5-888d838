import { GripVertical, ArrowRight, Clock, X, User, Hash, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import type { WorkbenchTask, HandpanRecord, WorkbenchTaskStatus } from '@/types/record';
import { getWorkbenchStatusLabel, getWorkbenchStatusColor, getNextWorkbenchStatus, getLatestDeviationNote, getLatestTuningDate } from '@/types/record';

interface WorkbenchTaskCardProps {
  task: WorkbenchTask;
  record: HandpanRecord | null;
  onAdvanceStatus: (taskId: string) => void;
  onViewTuningHistory: (record: HandpanRecord) => void;
  onRemoveTask: (taskId: string) => void;
  onDragStart: (e: React.DragEvent, task: WorkbenchTask) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, taskId: string, status: WorkbenchTaskStatus) => void;
  onDragLeave?: (e: React.DragEvent, taskId: string) => void;
  isDragging: boolean;
  isInvalid: boolean;
  dropPosition: 'before' | 'after' | null;
}

export function WorkbenchTaskCard({
  task,
  record,
  onAdvanceStatus,
  onViewTuningHistory,
  onRemoveTask,
  onDragStart,
  onDragEnd,
  onDragOver,
  isDragging,
  isInvalid,
  dropPosition,
}: WorkbenchTaskCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const nextStatus = getNextWorkbenchStatus(task.status);
  const nextStatusLabel = nextStatus ? getWorkbenchStatusLabel(nextStatus) : null;

  if (isInvalid || !record) {
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(e, task)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, task.id, task.status)}
        className={`relative bg-red-50 border border-red-200 rounded-xl p-4 mb-3 ${
          isDragging ? 'opacity-50' : ''
        } ${dropPosition ? 'ring-2 ring-brass-400' : ''}`}
      >
        {dropPosition === 'before' && (
          <div className="absolute -top-2 left-2 right-2 h-1 bg-brass-500 rounded-full z-10" />
        )}
        {dropPosition === 'after' && (
          <div className="absolute -bottom-2 left-2 right-2 h-1 bg-brass-500 rounded-full z-10" />
        )}
        <div className="flex items-start gap-3">
          <div className="p-1 text-red-400 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">记录已失效</span>
            </div>
            <p className="text-xs text-red-500 mb-3">
              该记录可能已被删除或导入覆盖
            </p>
            <button
              onClick={() => onRemoveTask(task.id)}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              移除任务
            </button>
          </div>
        </div>
      </div>
    );
  }

  const latestDeviationNote = getLatestDeviationNote(record);
  const latestTuningDate = getLatestTuningDate(record);

  const handleAdvanceClick = () => {
    onAdvanceStatus(task.id);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, task.id, task.status)}
      className={`relative bg-white rounded-xl p-4 mb-3 border border-clay-100 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${
        isDragging ? 'opacity-50 scale-[0.98]' : ''
      } ${dropPosition ? 'ring-2 ring-brass-400' : ''}`}
    >
      {dropPosition === 'before' && (
        <div className="absolute -top-2 left-2 right-2 h-1 bg-brass-500 rounded-full z-10" />
      )}
      {dropPosition === 'after' && (
        <div className="absolute -bottom-2 left-2 right-2 h-1 bg-brass-500 rounded-full z-10" />
      )}
      <div className="flex items-start gap-2">
        <div className="p-1 text-clay-300 group-hover:text-clay-500 transition-colors flex-shrink-0 mt-1">
          <GripVertical className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="bg-clay-100 text-clay-700 px-2 py-0.5 rounded-lg text-xs font-semibold font-mono">
              {record.serialNumber}
            </span>
            <span className="bg-brass-50 text-brass-600 px-2 py-0.5 rounded-lg text-xs font-semibold">
              {record.mode}
            </span>
            <span className={`badge ${getWorkbenchStatusColor(task.status)}`}>
              {getWorkbenchStatusLabel(task.status)}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-ink-400 mb-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              <span>{record.noteCount} 音</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{record.customerNickname}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDate(latestTuningDate)}</span>
            </div>
          </div>

          {latestDeviationNote && (
            <p className="text-xs text-ink-500 bg-clay-50 rounded-lg p-2 mb-3 line-clamp-2 border border-clay-100">
              {latestDeviationNote}
            </p>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-clay-50">
            {nextStatus && (
              <button
                onClick={handleAdvanceClick}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brass-500 text-white text-xs font-medium hover:bg-brass-600 transition-colors"
                title={`推进到${nextStatusLabel}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>推进到 {nextStatusLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onViewTuningHistory(record)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-ink-500 text-xs font-medium hover:bg-clay-50 hover:text-ink-600 transition-colors"
              title="查看调音历史"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>调音记录</span>
            </button>
            <button
              onClick={() => onRemoveTask(task.id)}
              className="ml-auto p-1.5 rounded-lg text-ink-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="从工作台移除"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
