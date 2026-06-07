import { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Plus, Calendar, Clock, CheckCircle2, AlertCircle, ListTodo, RefreshCw } from 'lucide-react';
import type { WorkbenchTask, WorkbenchTaskStatus, HandpanRecord } from '@/types/record';
import { WORKBENCH_STATUS_OPTIONS, getWorkbenchStatusLabel, getNextWorkbenchStatus } from '@/types/record';
import { WorkbenchTaskCard } from '@/components/WorkbenchTaskCard';
import {
  getTasksByDate,
  addTaskToWorkbench,
  updateTaskStatus,
  reorderTasks,
  removeTaskFromWorkbench,
  cleanupInvalidTasks,
  getAvailableRecordsForWorkbench,
  autoAddRecordsToWorkbench,
} from '@/utils/workbenchStorage';

interface TuningWorkbenchProps {
  isOpen: boolean;
  onClose: () => void;
  records: HandpanRecord[];
  onViewTuningHistory: (record: HandpanRecord) => void;
  onUpdateRecordStatus: (recordId: string, status: 'pending' | 'in-progress' | 'completed' | 'delivered') => void;
}

export function TuningWorkbench({
  isOpen,
  onClose,
  records,
  onViewTuningHistory,
  onUpdateRecordStatus,
}: TuningWorkbenchProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [tasks, setTasks] = useState<WorkbenchTask[]>([]);
  const [draggedTask, setDraggedTask] = useState<WorkbenchTask | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<WorkbenchTaskStatus | null>(null);
  const [showAddMenu, setShowAddMenu] = useState<WorkbenchTaskStatus | null>(null);
  const [cleanupCount, setCleanupCount] = useState(0);
  const [dropTarget, setDropTarget] = useState<{ taskId: string; position: 'before' | 'after' } | null>(null);

  const recordMap = useMemo(() => {
    const map = new Map<string, HandpanRecord>();
    records.forEach(r => map.set(r.id, r));
    return map;
  }, [records]);

  useEffect(() => {
    if (isOpen) {
      loadTasks();
      runCleanup();
    }
  }, [isOpen, selectedDate, records]);

  const loadTasks = () => {
    const dateTasks = getTasksByDate(selectedDate);
    setTasks(dateTasks);
  };

  const runCleanup = () => {
    const validRecordIds = records.map(r => r.id);
    const deliveredRecordIds = records.filter(r => r.deliveryStatus === 'delivered').map(r => r.id);
    const removed = cleanupInvalidTasks(validRecordIds, deliveredRecordIds);
    setCleanupCount(removed);
    if (removed > 0) {
      loadTasks();
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return '今天';
    } else if (dateStr === tomorrow.toISOString().split('T')[0]) {
      return '明天';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return '昨天';
    }

    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
    setShowAddMenu(null);
  };

  const tasksByStatus = useMemo(() => {
    const grouped: Record<WorkbenchTaskStatus, WorkbenchTask[]> = {
      'pending': [],
      'in-progress': [],
      'completed': [],
    };

    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, task: WorkbenchTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverStatus(null);
    setDropTarget(null);
  };

  const handleDragOverTask = (e: React.DragEvent, taskId: string, taskStatus: WorkbenchTaskStatus) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(taskStatus);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';

    if (!dropTarget || dropTarget.taskId !== taskId || dropTarget.position !== position) {
      setDropTarget({ taskId, position });
    }
  };

  const handleDragLeaveTask = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      if (dropTarget && dropTarget.taskId === taskId) {
        setDropTarget(null);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent, status: WorkbenchTaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: WorkbenchTaskStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverStatus(null);
    setDropTarget(null);

    if (!draggedTask) return;

    if (draggedTask.status === targetStatus && !dropTarget) {
      return;
    }

    const isSameColumn = draggedTask.status === targetStatus;

    if (isSameColumn && dropTarget && dropTarget.taskId !== draggedTask.id) {
      const currentTasks = tasksByStatus[targetStatus];
      const draggedIndex = currentTasks.findIndex(t => t.id === draggedTask.id);
      const targetIndex = currentTasks.findIndex(t => t.id === dropTarget.taskId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;

      const newTasks = [...currentTasks];
      const [removed] = newTasks.splice(draggedIndex, 1);
      
      let insertIndex = targetIndex;
      if (dropTarget.position === 'after') {
        insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
      } else {
        insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
      }
      
      newTasks.splice(insertIndex, 0, removed);

      const orderedIds = newTasks.map(t => t.id);
      reorderTasks(selectedDate, targetStatus, orderedIds);
      loadTasks();
    } else if (!isSameColumn) {
      let newSortOrder = 0;
      
      if (dropTarget) {
        const targetTasks = tasksByStatus[targetStatus];
        const targetIndex = targetTasks.findIndex(t => t.id === dropTarget.taskId);
        newSortOrder = dropTarget.position === 'after' ? targetIndex + 1 : targetIndex;
      } else {
        const targetTasks = tasksByStatus[targetStatus];
        newSortOrder = targetTasks.length;
      }

      const updatedTask = updateTaskStatus(draggedTask.id, targetStatus);
      if (updatedTask) {
        if (dropTarget) {
          const targetTasks = [...tasksByStatus[targetStatus]];
          targetTasks.splice(newSortOrder, 0, updatedTask);
          const orderedIds = targetTasks.map(t => t.id);
          reorderTasks(selectedDate, targetStatus, orderedIds);
        }

        const statusMap: Record<WorkbenchTaskStatus, 'pending' | 'in-progress' | 'completed'> = {
          'pending': 'pending',
          'in-progress': 'in-progress',
          'completed': 'completed',
        };
        onUpdateRecordStatus(draggedTask.recordId, statusMap[targetStatus]);
        loadTasks();
      }
    }

    setDraggedTask(null);
  };

  const handleAdvanceStatus = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const nextStatus = getNextWorkbenchStatus(task.status);
    if (!nextStatus) return;

    const updatedTask = updateTaskStatus(taskId, nextStatus);
    if (updatedTask) {
      const statusMap: Record<WorkbenchTaskStatus, 'pending' | 'in-progress' | 'completed'> = {
        'pending': 'pending',
        'in-progress': 'in-progress',
        'completed': 'completed',
      };
      onUpdateRecordStatus(task.recordId, statusMap[nextStatus]);
      loadTasks();
    }
  };

  const handleRemoveTask = (taskId: string) => {
    if (confirm('确定要从工作台移除这个任务吗？')) {
      removeTaskFromWorkbench(taskId);
      loadTasks();
    }
  };

  const handleAddTask = (recordId: string, status: WorkbenchTaskStatus) => {
    addTaskToWorkbench(recordId, status, selectedDate);
    loadTasks();
    setShowAddMenu(null);
  };

  const handleAutoAdd = () => {
    if (confirm('将自动添加所有未交付的记录到今天的工作台，按当前状态分配到对应队列。确定继续吗？')) {
      const added = autoAddRecordsToWorkbench(records, selectedDate);
      alert(`已添加 ${added.length} 个任务到工作台`);
      loadTasks();
    }
  };

  const availableRecords = useMemo(() => {
    return getAvailableRecordsForWorkbench(records, selectedDate);
  }, [records, selectedDate]);

  const isTaskInvalid = (task: WorkbenchTask): boolean => {
    return !recordMap.has(task.recordId);
  };

  const getStatusIcon = (status: WorkbenchTaskStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'in-progress':
        return <RefreshCw className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getStatusColumnStyle = (status: WorkbenchTaskStatus, isOver: boolean) => {
    const baseStyle = 'flex-1 min-w-0 rounded-xl p-4 transition-all duration-200';
    
    if (isOver) {
      return `${baseStyle} bg-brass-50 border-2 border-dashed border-brass-400`;
    }

    switch (status) {
      case 'pending':
        return `${baseStyle} bg-gray-50 border border-gray-200`;
      case 'in-progress':
        return `${baseStyle} bg-blue-50 border border-blue-200`;
      case 'completed':
        return `${baseStyle} bg-amber-50 border border-amber-200`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[1400px] h-[90vh] max-h-[800px] overflow-hidden animate-scale-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-clay-100 h-full flex flex-col paper-texture">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-clay-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brass-100 flex items-center justify-center">
                <ListTodo className="w-5 h-5 text-brass-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink-500">调音工作台</h2>
                <p className="text-sm text-ink-400">组织当天的调音任务队列</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cleanupCount > 0 && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  已清理 {cleanupCount} 个失效任务
                </span>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-ink-400 hover:text-ink-500 hover:bg-clay-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4 border-b border-clay-100 bg-clay-50/50 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeDate(-1)}
                  className="p-2 rounded-lg hover:bg-clay-100 transition-colors text-ink-500"
                  title="前一天"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-clay-200">
                  <Calendar className="w-4 h-4 text-clay-500" />
                  <span className="font-semibold text-ink-500">
                    {formatDateDisplay(selectedDate)}
                  </span>
                </div>

                <button
                  onClick={() => changeDate(1)}
                  className="p-2 rounded-lg hover:bg-clay-100 transition-colors text-ink-500"
                  title="后一天"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="ml-2 input-field w-auto text-sm py-2"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoAdd}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-clay-500 text-white text-sm font-medium hover:bg-clay-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>自动添加未交付任务</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-4 sm:p-6">
            <div className="flex gap-4 h-full overflow-x-auto">
              {WORKBENCH_STATUS_OPTIONS.map((statusOption) => {
                const status = statusOption.value;
                const statusTasks = tasksByStatus[status] || [];
                const isOver = dragOverStatus === status;

                return (
                  <div
                    key={status}
                    className={getStatusColumnStyle(status, isOver)}
                    onDragOver={(e) => handleDragOver(e, status)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, status)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${statusOption.color}`}>
                          {getStatusIcon(status)}
                        </div>
                        <h3 className="font-semibold text-ink-500">
                          {getWorkbenchStatusLabel(status)}
                        </h3>
                        <span className="bg-white px-2 py-0.5 rounded-full text-xs font-medium text-ink-400 border border-clay-200">
                          {statusTasks.length}
                        </span>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setShowAddMenu(showAddMenu === status ? null : status)}
                          className="p-1.5 rounded-lg hover:bg-white/80 transition-colors text-ink-400 hover:text-ink-500"
                          title="添加任务"
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        {showAddMenu === status && (
                          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-clay-200 py-2 z-20 max-h-80 overflow-y-auto">
                            <div className="px-4 py-2 border-b border-clay-100">
                              <p className="text-xs font-medium text-ink-400">选择要添加的记录</p>
                            </div>
                            {availableRecords.length === 0 ? (
                              <div className="px-4 py-6 text-center">
                                <p className="text-sm text-ink-400">暂无可添加的记录</p>
                                <p className="text-xs text-ink-300 mt-1">所有未交付记录都已在工作台中</p>
                              </div>
                            ) : (
                              availableRecords.map(record => (
                                <button
                                  key={record.id}
                                  onClick={() => handleAddTask(record.id, status)}
                                  className="w-full px-4 py-2 text-left hover:bg-clay-50 transition-colors border-b border-clay-50 last:border-0"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-mono font-medium text-ink-500">
                                      {record.serialNumber}
                                    </span>
                                    <span className="text-xs text-ink-400">
                                      {record.mode}
                                    </span>
                                  </div>
                                  <p className="text-xs text-ink-400 mt-0.5">
                                    {record.customerNickname} · {record.noteCount}音
                                  </p>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[calc(100%-3rem)] pr-1 scrollbar-hide">
                      {statusTasks.length === 0 ? (
                        <div className="text-center py-12">
                          <div className={`w-12 h-12 rounded-full ${statusOption.color} flex items-center justify-center mx-auto mb-3 opacity-50`}>
                            {getStatusIcon(status)}
                          </div>
                          <p className="text-sm text-ink-400">暂无任务</p>
                          <p className="text-xs text-ink-300 mt-1">
                            拖动记录到此处或点击 + 添加
                          </p>
                        </div>
                      ) : (
                        statusTasks.map((task) => (
                          <WorkbenchTaskCard
                            key={task.id}
                            task={task}
                            record={recordMap.get(task.recordId) || null}
                            onAdvanceStatus={handleAdvanceStatus}
                            onViewTuningHistory={onViewTuningHistory}
                            onRemoveTask={handleRemoveTask}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOverTask}
                            onDragLeave={handleDragLeaveTask}
                            isDragging={draggedTask?.id === task.id}
                            isInvalid={isTaskInvalid(task)}
                            dropPosition={
                              dropTarget && dropTarget.taskId === task.id
                                ? dropTarget.position
                                : null
                            }
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4 border-t border-clay-100 bg-clay-50/50 flex-shrink-0">
            <div className="flex items-center justify-between text-xs text-ink-400">
              <div className="flex items-center gap-4">
                <span>
                  总任务数：{tasks.length} 个
                </span>
                <span>
                  待调音：{tasksByStatus['pending']?.length || 0} · 
                  调音中：{tasksByStatus['in-progress']?.length || 0} · 
                  已完成：{tasksByStatus['completed']?.length || 0}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span>💡 提示：拖动卡片可以在队列间移动</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowAddMenu(null)}
        />
      )}
    </div>
  );
}
