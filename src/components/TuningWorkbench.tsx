import { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Plus, Calendar, Clock, CheckCircle2, AlertCircle, ListTodo, RefreshCw } from 'lucide-react';
import type { WorkbenchTask, WorkbenchTaskStatus, HandpanRecord } from '@/types/record';
import { WORKBENCH_STATUS_OPTIONS, getWorkbenchStatusLabel, getNextWorkbenchStatus } from '@/types/record';
import { WorkbenchTaskCard } from '@/components/WorkbenchTaskCard';
import {
  addTaskToWorkbench,
  reorderTasks,
  removeTaskFromWorkbench,
  cleanupInvalidTasks,
  autoAddRecordsToWorkbench,
  getWeekDates,
  getTasksForWeek,
  moveTaskToDateAndStatus,
  getAvailableRecordsForWeek,
} from '@/utils/workbenchStorage';

interface TuningWorkbenchProps {
  isOpen: boolean;
  onClose: () => void;
  records: HandpanRecord[];
  onViewTuningHistory: (record: HandpanRecord) => void;
  onUpdateRecordStatus: (recordId: string, status: 'pending' | 'in-progress' | 'completed' | 'delivered') => void;
}

interface DragTarget {
  date: string;
  status: WorkbenchTaskStatus;
  taskId?: string;
  position?: 'before' | 'after';
}

export function TuningWorkbench({
  isOpen,
  onClose,
  records,
  onViewTuningHistory,
  onUpdateRecordStatus,
}: TuningWorkbenchProps) {
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff)).toISOString().split('T')[0];
  });
  const [weekTasks, setWeekTasks] = useState<Map<string, WorkbenchTask[]>>(new Map());
  const [draggedTask, setDraggedTask] = useState<WorkbenchTask | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const [showAddMenu, setShowAddMenu] = useState<{ date: string; status: WorkbenchTaskStatus } | null>(null);
  const [cleanupCount, setCleanupCount] = useState(0);

  const weekDates = useMemo(() => getWeekDates(selectedWeekStart), [selectedWeekStart]);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const recordMap = useMemo(() => {
    const map = new Map<string, HandpanRecord>();
    records.forEach(r => map.set(r.id, r));
    return map;
  }, [records]);

  useEffect(() => {
    if (isOpen) {
      loadWeekTasks();
      runCleanup();
    }
  }, [isOpen, selectedWeekStart, records]);

  const loadWeekTasks = () => {
    const tasks = getTasksForWeek(selectedWeekStart);
    setWeekTasks(tasks);
  };

  const runCleanup = () => {
    const validRecordIds = records.map(r => r.id);
    const deliveredRecordIds = records.filter(r => r.deliveryStatus === 'delivered').map(r => r.id);
    const removed = cleanupInvalidTasks(validRecordIds, deliveredRecordIds);
    setCleanupCount(removed);
    if (removed > 0) {
      loadWeekTasks();
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

  const formatWeekRange = () => {
    const startDate = new Date(weekDates[0]);
    const endDate = new Date(weekDates[6]);
    return `${startDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}`;
  };

  const changeWeek = (weeks: number) => {
    const date = new Date(selectedWeekStart);
    date.setDate(date.getDate() + weeks * 7);
    setSelectedWeekStart(date.toISOString().split('T')[0]);
    setShowAddMenu(null);
  };

  const goToThisWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setSelectedWeekStart(new Date(today.setDate(diff)).toISOString().split('T')[0]);
    setShowAddMenu(null);
  };

  const getTasksForDateAndStatus = (date: string, status: WorkbenchTaskStatus): WorkbenchTask[] => {
    const dateTasks = weekTasks.get(date) || [];
    return dateTasks.filter(t => t.status === status);
  };

  const weeklyTasksByStatus = useMemo(() => {
    const result: Record<WorkbenchTaskStatus, number> = {
      'pending': 0,
      'in-progress': 0,
      'completed': 0,
    };
    
    weekDates.forEach(date => {
      const tasks = weekTasks.get(date) || [];
      tasks.forEach(task => {
        result[task.status]++;
      });
    });
    
    return result;
  }, [weekTasks, weekDates]);

  const getTotalWeekTasks = useMemo(() => {
    let total = 0;
    weekDates.forEach(date => {
      total += (weekTasks.get(date) || []).length;
    });
    return total;
  }, [weekTasks, weekDates]);

  const handleDragStart = (e: React.DragEvent, task: WorkbenchTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragTarget(null);
  };

  const handleDragOverTask = (e: React.DragEvent, date: string, status: WorkbenchTaskStatus, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';

    if (!dragTarget || dragTarget.date !== date || dragTarget.status !== status || 
        dragTarget.taskId !== taskId || dragTarget.position !== position) {
      setDragTarget({ date, status, taskId, position });
    }
  };

  const handleDragOverColumn = (e: React.DragEvent, date: string, status: WorkbenchTaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragTarget || dragTarget.date !== date || dragTarget.status !== status) {
      setDragTarget({ date, status });
    }
  };

  const handleDragLeave = () => {
    setDragTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetDate: string, targetStatus: WorkbenchTaskStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget(null);

    if (!draggedTask) return;

    const isSameDate = draggedTask.taskDate === targetDate;
    const isSameStatus = draggedTask.status === targetStatus;

    if (isSameDate && isSameStatus && !dragTarget?.taskId) {
      setDraggedTask(null);
      return;
    }

    const isSameColumn = isSameDate && isSameStatus;

    if (isSameColumn && dragTarget?.taskId && dragTarget.taskId !== draggedTask.id) {
      const currentTasks = getTasksForDateAndStatus(targetDate, targetStatus);
      const draggedIndex = currentTasks.findIndex(t => t.id === draggedTask.id);
      const targetIndex = currentTasks.findIndex(t => t.id === dragTarget.taskId);
      
      if (draggedIndex === -1 || targetIndex === -1) {
        setDraggedTask(null);
        return;
      }

      const newTasks = [...currentTasks];
      const [removed] = newTasks.splice(draggedIndex, 1);
      
      let insertIndex = targetIndex;
      if (dragTarget.position === 'after') {
        insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
      } else {
        insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
      }
      
      newTasks.splice(insertIndex, 0, removed);

      const orderedIds = newTasks.map(t => t.id);
      reorderTasks(targetDate, targetStatus, orderedIds);
      loadWeekTasks();
    } else if (!isSameDate || !isSameStatus) {
      const dropTarget = dragTarget?.taskId && dragTarget.position
        ? { taskId: dragTarget.taskId, position: dragTarget.position }
        : undefined;

      const updatedTask = moveTaskToDateAndStatus(draggedTask.id, targetDate, targetStatus, dropTarget);
      if (updatedTask) {
        if (!isSameStatus) {
          const statusMap: Record<WorkbenchTaskStatus, 'pending' | 'in-progress' | 'completed'> = {
            'pending': 'pending',
            'in-progress': 'in-progress',
            'completed': 'completed',
          };
          onUpdateRecordStatus(draggedTask.recordId, statusMap[targetStatus]);
        }
        loadWeekTasks();
      }
    }

    setDraggedTask(null);
  };

  const handleAdvanceStatus = (taskId: string, taskDate: string) => {
    const dateTasks = weekTasks.get(taskDate) || [];
    const task = dateTasks.find(t => t.id === taskId);
    if (!task) return;

    const nextStatus = getNextWorkbenchStatus(task.status);
    if (!nextStatus) return;

    const updatedTask = moveTaskToDateAndStatus(taskId, taskDate, nextStatus);
    if (updatedTask) {
      const statusMap: Record<WorkbenchTaskStatus, 'pending' | 'in-progress' | 'completed'> = {
        'pending': 'pending',
        'in-progress': 'in-progress',
        'completed': 'completed',
      };
      onUpdateRecordStatus(task.recordId, statusMap[nextStatus]);
      loadWeekTasks();
    }
  };

  const handleRemoveTask = (taskId: string) => {
    if (confirm('确定要从工作台移除这个任务吗？')) {
      removeTaskFromWorkbench(taskId);
      loadWeekTasks();
    }
  };

  const handleAddTask = (recordId: string, date: string, status: WorkbenchTaskStatus) => {
    addTaskToWorkbench(recordId, status, date);
    loadWeekTasks();
    setShowAddMenu(null);
  };

  const handleAutoAdd = (targetDate: string) => {
    if (confirm(`将自动添加所有未交付的记录到${formatDateDisplay(targetDate)}的工作台，按当前状态分配到对应队列。确定继续吗？`)) {
      const added = autoAddRecordsToWorkbench(records, targetDate);
      alert(`已添加 ${added.length} 个任务到工作台`);
      loadWeekTasks();
    }
  };

  const availableRecords = useMemo(() => {
    return getAvailableRecordsForWeek(records, selectedWeekStart);
  }, [records, selectedWeekStart]);

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
    const baseStyle = 'flex-1 min-w-0 rounded-lg p-2 transition-all duration-200';
    
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

  const getDayColumnStyle = (date: string) => {
    const isToday = date === todayStr;
    const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
    
    let style = 'flex flex-col min-w-[280px] w-[280px] flex-shrink-0';
    if (isToday) {
      style += ' ring-2 ring-brass-400 rounded-xl';
    }
    if (isWeekend) {
      style += ' bg-clay-50/30';
    }
    return style;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-full h-[95vh] max-h-[900px] overflow-hidden animate-scale-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-clay-100 h-full flex flex-col paper-texture">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-clay-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brass-100 flex items-center justify-center">
                <ListTodo className="w-5 h-5 text-brass-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink-500">调音工作台 - 周视图</h2>
                <p className="text-sm text-ink-400">查看并管理一周内的调音任务队列</p>
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
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => changeWeek(-1)}
                  className="p-2 rounded-lg hover:bg-clay-100 transition-colors text-ink-500"
                  title="上一周"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-clay-200">
                  <Calendar className="w-4 h-4 text-clay-500" />
                  <span className="font-semibold text-ink-500">
                    {formatWeekRange()}
                  </span>
                </div>

                <button
                  onClick={() => changeWeek(1)}
                  className="p-2 rounded-lg hover:bg-clay-100 transition-colors text-ink-500"
                  title="下一周"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <button
                  onClick={goToThisWeek}
                  className="px-3 py-2 rounded-lg bg-brass-100 text-brass-700 text-sm font-medium hover:bg-brass-200 transition-colors"
                >
                  回到本周
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleAutoAdd(todayStr)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-clay-500 text-white text-sm font-medium hover:bg-clay-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>自动添加到今天</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-2 sm:p-4">
            <div className="flex gap-2 h-full overflow-x-auto pb-2">
              {weekDates.map((date) => {
                const isToday = date === todayStr;
                const dayTasks = weekTasks.get(date) || [];
                
                return (
                  <div key={date} className={getDayColumnStyle(date)}>
                    <div className={`p-3 rounded-t-xl border-b-2 flex-shrink-0 ${
                      isToday 
                        ? 'bg-brass-100 border-brass-400' 
                        : 'bg-clay-50 border-clay-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold ${isToday ? 'text-brass-700' : 'text-ink-500'}`}>
                          {formatDateDisplay(date)}
                        </span>
                        <span className="text-xs font-medium text-ink-400 bg-white px-2 py-0.5 rounded-full">
                          {dayTasks.length} 个任务
                        </span>
                      </div>
                      <div className="flex gap-1 text-xs">
                        {WORKBENCH_STATUS_OPTIONS.map(statusOpt => {
                          const count = dayTasks.filter(t => t.status === statusOpt.value).length;
                          return (
                            <span key={statusOpt.value} className="text-ink-400">
                              {statusOpt.label.charAt(0)}: {count}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-2 p-2 overflow-y-auto">
                      {WORKBENCH_STATUS_OPTIONS.map((statusOption) => {
                        const status = statusOption.value;
                        const statusTasks = getTasksForDateAndStatus(date, status);
                        const isOver = dragTarget?.date === date && dragTarget?.status === status;

                        return (
                          <div
                            key={status}
                            className={getStatusColumnStyle(status, isOver)}
                            onDragOver={(e) => handleDragOverColumn(e, date, status)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, date, status)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <div className={`p-1 rounded ${statusOption.color}`}>
                                  {getStatusIcon(status)}
                                </div>
                                <h4 className="text-xs font-semibold text-ink-500">
                                  {getWorkbenchStatusLabel(status)}
                                </h4>
                                <span className="bg-white px-1.5 py-0.5 rounded text-xs font-medium text-ink-400 border border-clay-100">
                                  {statusTasks.length}
                                </span>
                              </div>
                              <div className="relative">
                                <button
                                  onClick={() => setShowAddMenu(
                                    showAddMenu?.date === date && showAddMenu?.status === status 
                                      ? null 
                                      : { date, status }
                                  )}
                                  className="p-1 rounded hover:bg-white/80 transition-colors text-ink-400 hover:text-ink-500"
                                  title="添加任务"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>

                                {showAddMenu?.date === date && showAddMenu?.status === status && (
                                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-clay-200 py-2 z-30 max-h-72 overflow-y-auto">
                                    <div className="px-4 py-2 border-b border-clay-100">
                                      <p className="text-xs font-medium text-ink-400">选择要添加的记录</p>
                                    </div>
                                    {availableRecords.length === 0 ? (
                                      <div className="px-4 py-6 text-center">
                                        <p className="text-sm text-ink-400">暂无可添加的记录</p>
                                        <p className="text-xs text-ink-300 mt-1">所有未交付记录都已在本周工作台中</p>
                                      </div>
                                    ) : (
                                      availableRecords.map(record => (
                                        <button
                                          key={record.id}
                                          onClick={() => handleAddTask(record.id, date, status)}
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

                            <div className="space-y-1 overflow-y-auto max-h-[calc(100%-2rem)]">
                              {statusTasks.length === 0 ? (
                                <div className="text-center py-4">
                                  <p className="text-xs text-ink-300">暂无任务</p>
                                </div>
                              ) : (
                                statusTasks.map((task) => (
                                  <WorkbenchTaskCard
                                    key={task.id}
                                    task={task}
                                    record={recordMap.get(task.recordId) || null}
                                    onAdvanceStatus={(id) => handleAdvanceStatus(id, date)}
                                    onViewTuningHistory={onViewTuningHistory}
                                    onRemoveTask={handleRemoveTask}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e, taskId, taskStatus) => handleDragOverTask(e, date, taskStatus, taskId)}
                                    isDragging={draggedTask?.id === task.id}
                                    isInvalid={isTaskInvalid(task)}
                                    dropPosition={
                                      dragTarget?.date === date && 
                                      dragTarget?.status === task.status && 
                                      dragTarget?.taskId === task.id
                                        ? (dragTarget.position ?? null)
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
                );
              })}
            </div>
          </div>

          <div className="px-4 sm:px-6 py-3 border-t border-clay-100 bg-clay-50/50 flex-shrink-0">
            <div className="flex items-center justify-between text-xs text-ink-400">
              <div className="flex items-center gap-4 flex-wrap">
                <span>
                  本周总任务：{getTotalWeekTasks} 个
                </span>
                <span>
                  待调音：{weeklyTasksByStatus['pending'] || 0} · 
                  调音中：{weeklyTasksByStatus['in-progress'] || 0} · 
                  已完成：{weeklyTasksByStatus['completed'] || 0}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span>💡 提示：拖动卡片可以在不同日期和队列间移动</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddMenu && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowAddMenu(null)}
        />
      )}
    </div>
  );
}
