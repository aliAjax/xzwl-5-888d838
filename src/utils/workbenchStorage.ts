import type { WorkbenchTask, WorkbenchTaskStatus, HandpanRecord } from '@/types/record';
import { addTombstone } from './versionedBackup';

const WORKBENCH_STORAGE_KEY = 'handpan_workbench';

export const generateWorkbenchId = (): string => {
  return 'wb-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getWorkbenchTasks = (): WorkbenchTask[] => {
  try {
    const data = localStorage.getItem(WORKBENCH_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveWorkbenchTasks = (tasks: WorkbenchTask[]): void => {
  localStorage.setItem(WORKBENCH_STORAGE_KEY, JSON.stringify(tasks));
};

export const getTasksByDate = (date: string): WorkbenchTask[] => {
  const allTasks = getWorkbenchTasks();
  return allTasks
    .filter(task => task.taskDate === date)
    .sort((a, b) => a.sortOrder - b.sortOrder);
};

export const addTaskToWorkbench = (
  recordId: string,
  status: WorkbenchTaskStatus,
  taskDate: string
): WorkbenchTask | null => {
  const tasks = getWorkbenchTasks();
  
  const existingTask = tasks.find(t => t.recordId === recordId && t.taskDate === taskDate);
  if (existingTask) {
    return existingTask;
  }

  const tasksForDateAndStatus = tasks.filter(t => t.taskDate === taskDate && t.status === status);
  const maxSortOrder = tasksForDateAndStatus.length > 0 
    ? Math.max(...tasksForDateAndStatus.map(t => t.sortOrder)) 
    : -1;

  const now = new Date().toISOString();
  const newTask: WorkbenchTask = {
    id: generateWorkbenchId(),
    recordId,
    status,
    taskDate,
    sortOrder: maxSortOrder + 1,
    createdAt: now,
    updatedAt: now,
  };

  tasks.push(newTask);
  saveWorkbenchTasks(tasks);
  return newTask;
};

export const updateTaskStatus = (taskId: string, newStatus: WorkbenchTaskStatus): WorkbenchTask | null => {
  const tasks = getWorkbenchTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  if (index === -1) return null;

  const task = tasks[index];
  const tasksForDateAndStatus = tasks.filter(t => t.taskDate === task.taskDate && t.status === newStatus);
  const maxSortOrder = tasksForDateAndStatus.length > 0 
    ? Math.max(...tasksForDateAndStatus.map(t => t.sortOrder)) 
    : -1;

  tasks[index] = {
    ...task,
    status: newStatus,
    sortOrder: maxSortOrder + 1,
    updatedAt: new Date().toISOString(),
  };

  saveWorkbenchTasks(tasks);
  return tasks[index];
};

export const updateTaskSortOrder = (taskId: string, newSortOrder: number, newStatus?: WorkbenchTaskStatus): WorkbenchTask | null => {
  const tasks = getWorkbenchTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  if (index === -1) return null;

  const task = tasks[index];
  tasks[index] = {
    ...task,
    sortOrder: newSortOrder,
    status: newStatus || task.status,
    updatedAt: new Date().toISOString(),
  };

  saveWorkbenchTasks(tasks);
  return tasks[index];
};

export const reorderTasks = (
  taskDate: string,
  status: WorkbenchTaskStatus,
  orderedTaskIds: string[]
): void => {
  const tasks = getWorkbenchTasks();
  
  orderedTaskIds.forEach((taskId, index) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        sortOrder: index,
        status,
        taskDate,
        updatedAt: new Date().toISOString(),
      };
    }
  });

  saveWorkbenchTasks(tasks);
};

export const removeTaskFromWorkbench = (taskId: string): boolean => {
  const tasks = getWorkbenchTasks();
  const filtered = tasks.filter(t => t.id !== taskId);
  if (filtered.length === tasks.length) return false;
  saveWorkbenchTasks(filtered);
  addTombstone(taskId, 'workbenchTask');
  return true;
};

export const removeTasksByRecordId = (recordId: string): number => {
  const tasks = getWorkbenchTasks();
  const removedTasks = tasks.filter(t => t.recordId === recordId);
  const filtered = tasks.filter(t => t.recordId !== recordId);
  const removedCount = tasks.length - filtered.length;
  if (removedCount > 0) {
    saveWorkbenchTasks(filtered);
    removedTasks.forEach(t => addTombstone(t.id, 'workbenchTask'));
  }
  return removedCount;
};

export const cleanupInvalidTasks = (validRecordIds: string[], deliveredRecordIds: string[] = []): number => {
  const tasks = getWorkbenchTasks();
  const validIdSet = new Set(validRecordIds);
  const deliveredIdSet = new Set(deliveredRecordIds);
  const removedTasks = tasks.filter(t => !validIdSet.has(t.recordId) || deliveredIdSet.has(t.recordId));
  const filtered = tasks.filter(t => validIdSet.has(t.recordId) && !deliveredIdSet.has(t.recordId));
  const removedCount = tasks.length - filtered.length;
  if (removedCount > 0) {
    saveWorkbenchTasks(filtered);
    removedTasks.forEach(t => addTombstone(t.id, 'workbenchTask'));
  }
  return removedCount;
};

export const isRecordInWorkbenchForDate = (recordId: string, taskDate: string): boolean => {
  const tasks = getWorkbenchTasks();
  return tasks.some(t => t.recordId === recordId && t.taskDate === taskDate);
};

export const moveTaskToDate = (taskId: string, newDate: string): WorkbenchTask | null => {
  const tasks = getWorkbenchTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  if (index === -1) return null;

  const existingTask = tasks.find(t => t.recordId === tasks[index].recordId && t.taskDate === newDate && t.id !== taskId);
  if (existingTask) {
    return existingTask;
  }

  const task = tasks[index];
  const tasksForDateAndStatus = tasks.filter(t => t.taskDate === newDate && t.status === task.status);
  const maxSortOrder = tasksForDateAndStatus.length > 0 
    ? Math.max(...tasksForDateAndStatus.map(t => t.sortOrder)) 
    : -1;

  tasks[index] = {
    ...task,
    taskDate: newDate,
    sortOrder: maxSortOrder + 1,
    updatedAt: new Date().toISOString(),
  };

  saveWorkbenchTasks(tasks);
  return tasks[index];
};

export const getAvailableRecordsForWorkbench = (
  allRecords: HandpanRecord[],
  taskDate: string
): HandpanRecord[] => {
  const tasks = getWorkbenchTasks();
  const assignedRecordIds = new Set(
    tasks.filter(t => t.taskDate === taskDate).map(t => t.recordId)
  );
  
  return allRecords
    .filter(r => r.deliveryStatus !== 'delivered' && !assignedRecordIds.has(r.id))
    .sort((a, b) => {
      const statusOrder: Record<string, number> = { 'pending': 0, 'in-progress': 1, 'completed': 2, 'delivered': 3 };
      return statusOrder[a.deliveryStatus] - statusOrder[b.deliveryStatus];
    });
};

export const autoAddRecordsToWorkbench = (
  allRecords: HandpanRecord[],
  taskDate: string
): WorkbenchTask[] => {
  const addedTasks: WorkbenchTask[] = [];
  
  const eligibleRecords = allRecords.filter(r => r.deliveryStatus !== 'delivered');
  
  for (const record of eligibleRecords) {
    const statusMap: Record<string, WorkbenchTaskStatus> = {
      'pending': 'pending',
      'in-progress': 'in-progress',
      'completed': 'completed',
    };
    
    const workbenchStatus = statusMap[record.deliveryStatus];
    if (workbenchStatus) {
      const task = addTaskToWorkbench(record.id, workbenchStatus, taskDate);
      if (task) {
        addedTasks.push(task);
      }
    }
  }
  
  return addedTasks;
};
