import { useState, useMemo, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Laptop,
  Download,
  FileJson,
  User,
  Hash,
  ArrowRight,
  RefreshCw,
  Filter,
  Database,
  Music2,
  ListTodo,
  Skull,
  Settings,
  Eye,
  Check,
} from 'lucide-react';
import type {
  DiffItem,
  ConflictResolution,
  HandpanRecord,
  ImportModuleType,
  ModuleStats,
  ImportModuleOptions,
  ImportPreviewResult,
} from '@/types/record';
import { IMPORT_MODULE_LABELS } from '@/types/record';
import { getDeviceId, filterDiffsByModuleOptions } from '@/utils/versionedBackup';
import { RecordCard } from './RecordCard';

interface MergeConflictResolverProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (diffs: DiffItem[], moduleOptions: ImportModuleOptions) => void;
  importPreview: ImportPreviewResult | null;
  fileName: string;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  record: '记录',
  mode: '调式',
  workbenchTask: '工作台任务',
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  new: '新增',
  modified: '修改',
  deleted: '删除',
  conflict: '冲突',
  unchanged: '无变化',
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  new: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  modified: 'bg-blue-50 border-blue-200 text-blue-700',
  deleted: 'bg-red-50 border-red-200 text-red-700',
  conflict: 'bg-amber-50 border-amber-200 text-amber-700',
  unchanged: 'bg-gray-50 border-gray-200 text-gray-500',
};

const CHANGE_TYPE_ICONS: Record<string, any> = {
  new: Plus,
  modified: Edit3,
  deleted: Trash2,
  conflict: AlertTriangle,
  unchanged: CheckCircle,
};

const MODULE_ICONS: Record<ImportModuleType, any> = {
  records: Database,
  modes: Music2,
  workbenchTasks: ListTodo,
  tombstones: Skull,
};

const RESOLUTION_LABELS: Record<string, string> = {
  'keep-local': '保留本机',
  'keep-imported': '保留导入',
  'manual': '手动合并',
  'pending': '待处理',
};

const FIELD_LABELS: Record<string, string> = {
  serialNumber: '编号',
  mode: '调式',
  noteCount: '音位数量',
  lastTuningDate: '最近调音日期',
  deviationNote: '偏差说明',
  customerNickname: '客户昵称',
  deliveryStatus: '交付状态',
  remark: '备注',
  deleted: '删除状态',
  name: '名称',
  active: '启用状态',
  sortOrder: '排序',
  status: '状态',
  taskDate: '任务日期',
  tuningHistory: '调音历史',
  phonemeDeviations: '音位偏差',
  phonemeNames: '音位名称',
  beforeStatus: '调整前状态',
  afterStatus: '调整后状态',
  date: '日期',
  tombstone: '墓碑记录',
};

const formatValue = (value: any): string => {
  if (value === undefined || value === null) return '-';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

const getEntityTitle = (diff: DiffItem): string => {
  if (diff.fieldConflicts?.includes('tombstone')) {
    const entity = diff.imported;
    if (entity) {
      const typeLabel = ENTITY_TYPE_LABELS[diff.entityType] || '未知';
      return `${typeLabel}删除记录 - ${diff.id.slice(0, 12)}`;
    }
  }

  const entity = diff.local || diff.imported;
  if (!entity) return `ID: ${diff.id}`;

  if (diff.entityType === 'record') {
    const record = entity as HandpanRecord;
    return `${record.serialNumber || '未知编号'} - ${record.customerNickname || '未知客户'}`;
  }
  if (diff.entityType === 'mode') {
    return entity.name || `调式 ${diff.id}`;
  }
  if (diff.entityType === 'workbenchTask') {
    return `任务 ${diff.id.slice(0, 12)}`;
  }
  return diff.id;
};

const getModuleFromEntityType = (entityType: DiffItem['entityType']): ImportModuleType => {
  switch (entityType) {
    case 'record': return 'records';
    case 'mode': return 'modes';
    case 'workbenchTask': return 'workbenchTasks';
  }
};

export function MergeConflictResolver({
  isOpen,
  onClose,
  onConfirm,
  importPreview,
  fileName,
}: MergeConflictResolverProps) {
  const [diffs, setDiffs] = useState<DiffItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [manualMergeDiff, setManualMergeDiff] = useState<DiffItem | null>(null);
  const [manualMergeData, setManualMergeData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'modules' | 'details'>('modules');
  const [moduleOptions, setModuleOptions] = useState<ImportModuleOptions>({
    records: true,
    modes: true,
    workbenchTasks: true,
    tombstones: true,
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const deviceId = useMemo(() => getDeviceId(), []);

  useEffect(() => {
    if (importPreview) {
      setDiffs(importPreview.diffs);
      setModuleOptions({
        records: true,
        modes: true,
        workbenchTasks: true,
        tombstones: true,
      });
      setViewMode('modules');
      setShowConfirmDialog(false);
      setFilter('all');
      setExpandedId(null);
    }
  }, [importPreview]);

  const filteredDiffs = useMemo(() => {
    const moduleFiltered = filterDiffsByModuleOptions(diffs, moduleOptions);
    
    if (filter === 'all') return moduleFiltered;
    if (filter === 'pending') return moduleFiltered.filter(d => d.resolution === 'pending');
    return moduleFiltered.filter(d => d.changeType === filter);
  }, [diffs, filter, moduleOptions]);

  const stats = useMemo(() => {
    return {
      total: filteredDiffs.length,
      new: filteredDiffs.filter(d => d.changeType === 'new').length,
      modified: filteredDiffs.filter(d => d.changeType === 'modified').length,
      deleted: filteredDiffs.filter(d => d.changeType === 'deleted').length,
      conflict: filteredDiffs.filter(d => d.changeType === 'conflict').length,
      unchanged: filteredDiffs.filter(d => d.changeType === 'unchanged').length,
      pending: filteredDiffs.filter(d => d.resolution === 'pending').length,
    };
  }, [filteredDiffs]);

  const selectedModuleStats = useMemo(() => {
    if (!importPreview) return [];
    return importPreview.moduleStats.map(s => ({
      ...s,
      hasChanges: s.added > 0 || s.modified > 0 || s.deleted > 0 || s.conflict > 0,
      isSelected: moduleOptions[s.moduleType],
    }));
  }, [importPreview, moduleOptions]);

  const selectedModulePendingCount = useMemo(() => {
    return filteredDiffs.filter(d => d.resolution === 'pending').length;
  }, [filteredDiffs]);

  if (!isOpen || !importPreview) return null;

  const handleModuleOptionChange = (moduleType: ImportModuleType) => {
    setModuleOptions(prev => ({
      ...prev,
      [moduleType]: !prev[moduleType],
    }));
  };

  const handleSelectAllModules = () => {
    setModuleOptions({
      records: true,
      modes: true,
      workbenchTasks: true,
      tombstones: true,
    });
  };

  const handleDeselectAllModules = () => {
    setModuleOptions({
      records: false,
      modes: false,
      workbenchTasks: false,
      tombstones: false,
    });
  };

  const handleResolutionChange = (id: string, resolution: ConflictResolution) => {
    setDiffs((prev: DiffItem[]) =>
      prev.map(d => (d.id === id ? { ...d, resolution } : d))
    );
  };

  const handleBulkResolution = (resolution: ConflictResolution, changeType?: string) => {
    setDiffs(prev =>
      prev.map(d => {
        const moduleType = getModuleFromEntityType(d.entityType);
        if (!moduleOptions[moduleType]) return d;
        if (changeType && d.changeType !== changeType) return d;
        if (d.changeType === 'unchanged') return d;
        return { ...d, resolution };
      })
    );
  };

  const openManualMerge = (diff: DiffItem) => {
    setManualMergeDiff(diff);
    setManualMergeData(JSON.parse(JSON.stringify(diff.local || diff.imported || {})));
  };

  const saveManualMerge = () => {
    if (!manualMergeDiff) return;

    setDiffs(prev =>
      prev.map(d =>
        d.id === manualMergeDiff.id
          ? { ...d, resolution: 'manual' as ConflictResolution, merged: manualMergeData }
          : d
      )
    );
    setManualMergeDiff(null);
    setManualMergeData(null);
  };

  const handleManualFieldChange = (field: string, value: any) => {
    setManualMergeData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleProceedToDetails = () => {
    const hasSelectedChanges = selectedModuleStats.some(
      s => s.isSelected && s.hasChanges
    );
    if (!hasSelectedChanges) {
      alert('请至少选择一个包含变更的模块');
      return;
    }
    setViewMode('details');
  };

  const handleBackToModules = () => {
    setViewMode('modules');
  };

  const handleRequestConfirm = () => {
    const pendingCount = selectedModulePendingCount;
    if (pendingCount > 0) {
      alert(`还有 ${pendingCount} 条冲突待处理，请先选择解决方案`);
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    const diffsToApply = filterDiffsByModuleOptions(diffs, moduleOptions);
    onConfirm(diffsToApply, moduleOptions);
    setShowConfirmDialog(false);
  };

  const handleCancel = () => {
    onClose();
  };

  const getFilterButtonClass = (f: string) => {
    const isActive = filter === f;
    return `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brass-100 text-brass-700 border border-brass-300'
        : 'bg-clay-50 text-ink-400 border border-transparent hover:bg-clay-100'
    }`;
  };

  const getModuleStatsForDiff = (diff: DiffItem): ModuleStats | undefined => {
    if (diff.fieldConflicts?.includes('tombstone') ||
        diff.changeType === 'deleted' ||
        (diff.changeType === 'conflict' && diff.fieldConflicts?.includes('deleted'))) {
      return importPreview.moduleStats.find(s => s.moduleType === 'tombstones');
    }
    const moduleType = getModuleFromEntityType(diff.entityType);
    return importPreview.moduleStats.find(s => s.moduleType === moduleType);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={handleCancel}
      />
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden animate-scale-in flex flex-col">
        <div className="bg-white rounded-2xl shadow-2xl border border-clay-100 paper-texture flex flex-col max-h-full">
          <div className="flex items-center justify-between p-6 border-b border-clay-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-ink-500">
                  {viewMode === 'modules' ? '导入备份 - 选择模块' : '导入备份 - 详细对比'}
                </h2>
                <p className="text-sm text-ink-400 flex items-center gap-1">
                  <FileJson className="w-3.5 h-3.5" />
                  {fileName}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg text-ink-400 hover:text-ink-500 hover:bg-clay-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {importPreview.importedBackup && (
            <div className="px-6 py-4 bg-clay-50 border-b border-clay-100 flex-shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-ink-400" />
                  <span className="text-ink-400">导出设备：</span>
                  <span className="font-mono text-ink-600">
                    {importPreview.importedBackup.metadata.deviceId.slice(0, 12)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-ink-400" />
                  <span className="text-ink-400">本机设备：</span>
                  <span className="font-mono text-ink-600">{deviceId.slice(0, 12)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-ink-400" />
                  <span className="text-ink-400">导出时间：</span>
                  <span className="text-ink-600">
                    {new Date(importPreview.importedBackup.metadata.exportedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-ink-400" />
                  <span className="text-ink-400">数据版本：</span>
                  <span className="text-ink-600">v{importPreview.importedBackup.metadata.version}</span>
                </div>
              </div>
            </div>
          )}

          {importPreview.warnings.length > 0 && (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex-shrink-0">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <ul className="text-sm text-amber-700 space-y-1">
                    {importPreview.warnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'modules' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-ink-500 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-clay-600" />
                    选择要导入的模块
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAllModules}
                      className="text-sm text-clay-600 hover:text-clay-700 font-medium"
                    >
                      全选
                    </button>
                    <span className="text-ink-300">|</span>
                    <button
                      onClick={handleDeselectAllModules}
                      className="text-sm text-ink-400 hover:text-ink-500 font-medium"
                    >
                      全不选
                    </button>
                  </div>
                </div>
                <p className="text-sm text-ink-400 mb-4">
                  选择您想要导入的数据类型。只有勾选的模块才会参与数据合并。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {selectedModuleStats.map((stats) => {
                  const ModuleIcon = MODULE_ICONS[stats.moduleType];
                  const label = IMPORT_MODULE_LABELS[stats.moduleType];
                  const isDisabled = !stats.hasChanges;

                  return (
                    <label
                      key={stats.moduleType}
                      className={`relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        stats.isSelected
                          ? 'border-clay-400 bg-clay-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      } ${isDisabled ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={stats.isSelected}
                        onChange={() => handleModuleOptionChange(stats.moduleType)}
                        disabled={isDisabled}
                        className="mt-1 w-5 h-5 text-clay-600 rounded focus:ring-clay-400"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            stats.isSelected ? 'bg-clay-200 text-clay-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <ModuleIcon className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-ink-500">{label}</span>
                          {!stats.hasChanges && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              无变化
                            </span>
                          )}
                        </div>

                        {stats.hasChanges && (
                          <div className="grid grid-cols-4 gap-2">
                            {stats.added > 0 && (
                              <div className="bg-emerald-50 rounded-lg p-2 text-center">
                                <div className="text-lg font-bold text-emerald-600">{stats.added}</div>
                                <div className="text-xs text-emerald-600">新增</div>
                              </div>
                            )}
                            {stats.modified > 0 && (
                              <div className="bg-blue-50 rounded-lg p-2 text-center">
                                <div className="text-lg font-bold text-blue-600">{stats.modified}</div>
                                <div className="text-xs text-blue-600">修改</div>
                              </div>
                            )}
                            {stats.deleted > 0 && (
                              <div className="bg-red-50 rounded-lg p-2 text-center">
                                <div className="text-lg font-bold text-red-600">{stats.deleted}</div>
                                <div className="text-xs text-red-600">删除</div>
                              </div>
                            )}
                            {stats.conflict > 0 && (
                              <div className="bg-amber-50 rounded-lg p-2 text-center">
                                <div className="text-lg font-bold text-amber-600">{stats.conflict}</div>
                                <div className="text-xs text-amber-600">冲突</div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-2 text-xs text-ink-400">
                          导入文件 {stats.total} 条 · 本地 {
                            stats.moduleType === 'records' ? importPreview.localData.records.length :
                            stats.moduleType === 'modes' ? importPreview.localData.modes.length :
                            stats.moduleType === 'workbenchTasks' ? importPreview.localData.workbenchTasks.length :
                            importPreview.localData.tombstones.length
                          } 条
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {importPreview.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800 mb-1">重要提示</h4>
                      <ul className="text-sm text-amber-700 space-y-1">
                        {importPreview.warnings.map((warning, idx) => (
                          <li key={idx}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800 mb-1">预览说明</h4>
                    <p className="text-sm text-blue-700">
                      点击"下一步"进入详细对比页面，您可以查看每条数据的具体变更内容，
                      并为冲突数据选择保留策略。所有变更在确认前不会写入您的本地数据。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'details' && (
            <>
              <div className="px-6 py-4 border-b border-clay-100 flex-shrink-0">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                  <div className="bg-clay-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-ink-500">{stats.total}</div>
                    <div className="text-xs text-ink-400 mt-1">总变更</div>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-600">{stats.new}</div>
                    <div className="text-xs text-emerald-600 mt-1">新增</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.modified}</div>
                    <div className="text-xs text-blue-600 mt-1">修改</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.deleted}</div>
                    <div className="text-xs text-red-600 mt-1">删除</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-amber-600">
                      {stats.pending > 0 ? stats.pending : stats.conflict}
                    </div>
                    <div className="text-xs text-amber-600 mt-1">
                      {stats.pending > 0 ? '待处理' : '冲突'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="w-4 h-4 text-ink-400" />
                    <button className={getFilterButtonClass('all')} onClick={() => setFilter('all')}>
                      全部 ({filteredDiffs.length})
                    </button>
                    {selectedModulePendingCount > 0 && (
                      <button className={getFilterButtonClass('pending')} onClick={() => setFilter('pending')}>
                        待处理 ({selectedModulePendingCount})
                      </button>
                    )}
                    <button className={getFilterButtonClass('conflict')} onClick={() => setFilter('conflict')}>
                      冲突 ({filteredDiffs.filter(d => d.changeType === 'conflict').length})
                    </button>
                    <button className={getFilterButtonClass('new')} onClick={() => setFilter('new')}>
                      新增 ({filteredDiffs.filter(d => d.changeType === 'new').length})
                    </button>
                    <button className={getFilterButtonClass('deleted')} onClick={() => setFilter('deleted')}>
                      删除 ({filteredDiffs.filter(d => d.changeType === 'deleted').length})
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBulkResolution('keep-local')}
                      className="px-3 py-1.5 text-sm rounded-lg bg-clay-50 text-ink-500 hover:bg-clay-100 transition-colors"
                    >
                      全部保留本机
                    </button>
                    <button
                      onClick={() => handleBulkResolution('keep-imported')}
                      className="px-3 py-1.5 text-sm rounded-lg bg-clay-50 text-ink-500 hover:bg-clay-100 transition-colors"
                    >
                      全部保留导入
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {filteredDiffs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-clay-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-clay-400" />
                    </div>
                    <p className="text-ink-500 font-medium">没有符合筛选条件的变更</p>
                    <p className="text-sm text-ink-400 mt-1">请尝试其他筛选条件或返回选择其他模块</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredDiffs.map(diff => {
                      const isExpanded = expandedId === diff.id;
                      const Icon = CHANGE_TYPE_ICONS[diff.changeType];
                      const hasConflict = diff.changeType === 'conflict' || diff.resolution === 'pending';
                      const moduleStats = getModuleStatsForDiff(diff);
                      const moduleLabel = moduleStats ? IMPORT_MODULE_LABELS[moduleStats.moduleType] : '';

                      return (
                        <div
                          key={diff.id}
                          className={`rounded-xl border transition-all ${
                            hasConflict ? 'border-amber-300 bg-amber-50/30' : 'border-clay-200 bg-white'
                          }`}
                        >
                          <div
                            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-clay-50/50 rounded-xl"
                            onClick={() => setExpandedId(isExpanded ? null : diff.id)}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${CHANGE_TYPE_COLORS[diff.changeType]}`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-ink-700 truncate">
                                  {getEntityTitle(diff)}
                                </span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full border ${CHANGE_TYPE_COLORS[diff.changeType]}`}
                                >
                                  {CHANGE_TYPE_LABELS[diff.changeType]}
                                </span>
                                <span className="text-xs text-ink-400">
                                  {moduleLabel}
                                </span>
                              </div>
                              {diff.fieldConflicts && diff.fieldConflicts.length > 0 && (
                                <div className="text-xs text-ink-400 mt-1 flex items-center gap-1 flex-wrap">
                                  <span>变更字段：</span>
                                  {diff.fieldConflicts.map(f => (
                                    <span key={f} className="bg-white px-1.5 py-0.5 rounded border border-clay-200">
                                      {FIELD_LABELS[f] || f}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className={`text-xs px-2 py-1 rounded-lg font-medium ${
                                  diff.resolution === 'keep-local'
                                    ? 'bg-blue-100 text-blue-700'
                                    : diff.resolution === 'keep-imported'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : diff.resolution === 'manual'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {RESOLUTION_LABELS[diff.resolution]}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-ink-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-ink-400" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-clay-200 p-4">
                              {diff.changeType === 'new' && diff.fieldConflicts?.includes('tombstone') && (
                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                                  <h4 className="text-sm font-medium text-purple-700 mb-3 flex items-center gap-2">
                                    <Skull className="w-4 h-4" />
                                    删除墓碑（新增）
                                  </h4>
                                  <div className="text-sm text-purple-600 space-y-2">
                                    <p>
                                      <span className="font-medium">实体类型：</span>
                                      {ENTITY_TYPE_LABELS[diff.entityType] || '未知'}
                                    </p>
                                    <p>
                                      <span className="font-medium">实体ID：</span>
                                      {diff.imported?.id || diff.id}
                                    </p>
                                    <p>
                                      <span className="font-medium">删除时间：</span>
                                      {diff.imported?.deletedAt 
                                        ? new Date(diff.imported.deletedAt).toLocaleString()
                                        : '未知'}
                                    </p>
                                    <p>
                                      <span className="font-medium">删除设备：</span>
                                      {diff.imported?.deletedBy 
                                        ? diff.imported.deletedBy.slice(0, 12)
                                        : '未知'}
                                    </p>
                                  </div>
                                  <p className="text-xs text-purple-500 mt-3">
                                    此墓碑记录表示该实体在导入设备上已被删除。同步此墓碑可以防止已删除的实体被重新导入。
                                  </p>
                                </div>
                              )}

                              {diff.changeType === 'new' && !diff.fieldConflicts?.includes('tombstone') && (
                                <div>
                                  <h4 className="text-sm font-medium text-ink-500 mb-3 flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-emerald-500" />
                                    导入的新记录
                                  </h4>
                                  {diff.entityType === 'record' && diff.imported && (
                                    <RecordCard
                                      record={diff.imported}
                                      onEdit={() => {}}
                                      onDelete={() => {}}
                                      onGenerateDelivery={() => {}}
                                      onViewDetail={() => {}}
                                      index={0}
                                      showDeliveryButton={false}
                                      readOnly={true}
                                    />
                                  )}
                                </div>
                              )}

                              {diff.changeType === 'deleted' && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                  <div className="flex items-center gap-2 text-red-700">
                                    <Trash2 className="w-5 h-5" />
                                    <span className="font-medium">该记录在导入文件中已被删除</span>
                                  </div>
                                  <p className="text-sm text-red-600 mt-2">
                                    导入设备于 {importPreview.importedBackup?.metadata.exportedAt
                                      ? new Date(importPreview.importedBackup.metadata.exportedAt).toLocaleString()
                                      : '未知时间'} 删除了此记录
                                  </p>
                                </div>
                              )}

                              {(diff.changeType === 'conflict' || diff.changeType === 'modified') &&
                                diff.local &&
                                diff.imported && (
                                  <div>
                                    <h4 className="text-sm font-medium text-ink-500 mb-3">字段对比</h4>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-200">
                                          <Laptop className="w-4 h-4 text-blue-600" />
                                          <span className="font-medium text-blue-700">本机数据</span>
                                          {diff.local.updatedAt && (
                                            <span className="text-xs text-blue-500 ml-auto">
                                              更新于 {new Date(diff.local.updatedAt).toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                        <div className="space-y-2">
                                          {diff.fieldConflicts?.map(field => (
                                            <div key={field} className="text-sm">
                                              <span className="text-blue-500 font-medium">
                                                {FIELD_LABELS[field] || field}：
                                              </span>
                                              <span className="text-ink-700 ml-1 whitespace-pre-wrap">
                                                {formatValue(diff.local[field])}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-200">
                                          <Download className="w-4 h-4 text-emerald-600" />
                                          <span className="font-medium text-emerald-700">导入数据</span>
                                          {diff.imported.updatedAt && (
                                            <span className="text-xs text-emerald-500 ml-auto">
                                              更新于 {new Date(diff.imported.updatedAt).toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                        <div className="space-y-2">
                                          {diff.fieldConflicts?.map(field => (
                                            <div key={field} className="text-sm">
                                              <span className="text-emerald-500 font-medium">
                                                {FIELD_LABELS[field] || field}：
                                              </span>
                                              <span className="text-ink-700 ml-1 whitespace-pre-wrap">
                                                {formatValue(diff.imported[field])}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                              {diff.changeType === 'conflict' &&
                                ((!diff.local && diff.imported) || (diff.local && !diff.imported)) && (
                                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                                    <div className="flex items-center gap-2 text-amber-700">
                                      <AlertTriangle className="w-5 h-5" />
                                      <span className="font-medium">删除冲突</span>
                                    </div>
                                    <p className="text-sm text-amber-600 mt-2">
                                      {diff.local && !diff.imported
                                        ? '本机存在此记录，但导入文件中已删除。'
                                        : '导入文件包含此记录，但本机已删除。'}
                                    </p>
                                  </div>
                                )}

                              {diff.changeType !== 'unchanged' && (
                                <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-clay-100">
                                  <span className="text-sm text-ink-400 mr-2">解决方案：</span>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleResolutionChange(diff.id, 'keep-local');
                                    }}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                      diff.resolution === 'keep-local'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-clay-50 text-ink-500 hover:bg-blue-50'
                                    }`}
                                  >
                                    保留本机
                                  </button>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleResolutionChange(diff.id, 'keep-imported');
                                    }}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                      diff.resolution === 'keep-imported'
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-clay-50 text-ink-500 hover:bg-emerald-50'
                                    }`}
                                  >
                                    保留导入
                                  </button>
                                  {diff.changeType === 'conflict' && diff.local && diff.imported && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        openManualMerge(diff);
                                      }}
                                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                        diff.resolution === 'manual'
                                          ? 'bg-purple-500 text-white'
                                          : 'bg-clay-50 text-ink-500 hover:bg-purple-50'
                                      }`}
                                    >
                                      手动合并
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex items-center justify-between p-6 border-t border-clay-100 flex-shrink-0 bg-gray-50">
            <div className="text-sm text-ink-500">
              {viewMode === 'modules' ? (
                <span>
                  已选择 <span className="font-semibold text-clay-600">
                    {selectedModuleStats.filter(s => s.isSelected && s.hasChanges).length}
                  </span> 个模块
                  {selectedModuleStats.some(s => s.isSelected && s.hasChanges) && (
                    <>
                      ，共 <span className="font-semibold text-clay-600">
                        {selectedModuleStats.filter(s => s.isSelected).reduce((sum, s) => sum + s.added + s.modified + s.deleted + s.conflict, 0)}
                      </span> 条变更待处理
                    </>
                  )}
                </span>
              ) : (
                <span>
                  {selectedModulePendingCount > 0 ? (
                    <span className="text-amber-600">
                      还有 <span className="font-semibold">{selectedModulePendingCount}</span> 条冲突待处理
                    </span>
                  ) : (
                    <span className="text-emerald-600">
                      所有冲突已处理完成
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {viewMode === 'modules' ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToDetails}
                    className="btn-primary inline-flex items-center gap-2"
                    disabled={!selectedModuleStats.some(s => s.isSelected && s.hasChanges)}
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>下一步</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleBackToModules}
                    className="btn-secondary"
                  >
                    返回选择模块
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestConfirm}
                    className="btn-primary inline-flex items-center gap-2"
                    disabled={selectedModulePendingCount > 0}
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      确认导入
                      {selectedModulePendingCount > 0 && ` (${selectedModulePendingCount} 条待处理)`}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/70 backdrop-blur-sm"
            onClick={() => setShowConfirmDialog(false)}
          />
          <div className="relative w-full max-w-lg animate-scale-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-clay-100 paper-texture">
              <div className="p-6 border-b border-clay-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-ink-500">确认导入</h3>
                    <p className="text-sm text-ink-400">此操作将修改您的本地数据</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="text-ink-500 mb-4">
                  您确定要将以下变更写入本地数据吗？此操作不可撤销。
                </p>

                <div className="bg-clay-50 rounded-xl p-4 mb-4">
                  <h4 className="font-medium text-ink-500 mb-3">导入概要</h4>
                  <div className="space-y-2 text-sm">
                    {selectedModuleStats.filter(s => s.isSelected && s.hasChanges).map(stats => (
                      <div key={stats.moduleType} className="flex items-center justify-between">
                        <span className="text-ink-400">
                          {IMPORT_MODULE_LABELS[stats.moduleType]}
                        </span>
                        <span className="text-ink-600">
                          {stats.added > 0 && <span className="text-emerald-600">+{stats.added} 新增 </span>}
                          {stats.modified > 0 && <span className="text-blue-600">~{stats.modified} 修改 </span>}
                          {stats.deleted > 0 && <span className="text-red-600">-{stats.deleted} 删除 </span>}
                          {stats.conflict > 0 && <span className="text-amber-600">!{stats.conflict} 冲突 </span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {importPreview.warnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <ul className="text-sm text-amber-700 space-y-1">
                        {importPreview.warnings.map((warning, idx) => (
                          <li key={idx}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">
                      提示：点击"确认导入"后，数据将立即写入本地存储。
                      如需取消，请点击"取消"按钮，您的本地数据不会有任何改变。
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-clay-100 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>确认导入</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {manualMergeDiff && manualMergeData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/70 backdrop-blur-sm"
            onClick={() => {
              setManualMergeDiff(null);
              setManualMergeData(null);
            }}
          />
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto animate-scale-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-clay-100 paper-texture">
              <div className="flex items-center justify-between p-6 border-b border-clay-100">
                <div>
                  <h3 className="text-xl font-bold text-ink-500">手动合并</h3>
                  <p className="text-sm text-ink-400">点击字段值选择使用哪一边的数据，或直接编辑</p>
                </div>
                <button
                  onClick={() => {
                    setManualMergeDiff(null);
                    setManualMergeData(null);
                  }}
                  className="p-2 rounded-lg text-ink-400 hover:text-ink-500 hover:bg-clay-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {manualMergeDiff.fieldConflicts?.map(field => (
                  <div key={field} className="space-y-2">
                    <label className="block text-sm font-medium text-ink-500">
                      {FIELD_LABELS[field] || field}
                    </label>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <button
                          onClick={() => handleManualFieldChange(field, manualMergeDiff.local?.[field])}
                          className={`w-full text-left p-3 rounded-xl border transition-colors ${
                            manualMergeData[field] === manualMergeDiff.local?.[field] ||
                            JSON.stringify(manualMergeData[field]) === JSON.stringify(manualMergeDiff.local?.[field])
                              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200'
                              : 'bg-clay-50 border-clay-200 hover:bg-blue-50'
                          }`}
                        >
                          <div className="text-xs text-blue-500 mb-1">本机值</div>
                          <div className="text-ink-700 whitespace-pre-wrap">
                            {formatValue(manualMergeDiff.local?.[field])}
                          </div>
                        </button>
                      </div>
                      <ArrowRight className="w-5 h-5 text-ink-300 flex-shrink-0" />
                      <div className="flex-1">
                        <button
                          onClick={() => handleManualFieldChange(field, manualMergeDiff.imported?.[field])}
                          className={`w-full text-left p-3 rounded-xl border transition-colors ${
                            manualMergeData[field] === manualMergeDiff.imported?.[field] ||
                            JSON.stringify(manualMergeData[field]) === JSON.stringify(manualMergeDiff.imported?.[field])
                              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200'
                              : 'bg-clay-50 border-clay-200 hover:bg-emerald-50'
                          }`}
                        >
                          <div className="text-xs text-emerald-500 mb-1">导入值</div>
                          <div className="text-ink-700 whitespace-pre-wrap">
                            {formatValue(manualMergeDiff.imported?.[field])}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-clay-100">
                <button
                  type="button"
                  onClick={() => {
                    setManualMergeDiff(null);
                    setManualMergeData(null);
                  }}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={saveManualMerge}
                  className="btn-primary"
                >
                  保存合并结果
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
