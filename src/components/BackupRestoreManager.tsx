import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Camera,
  Clock,
  Database,
  ListTodo,
  Music2,
  Trash2,
  Download,
  Upload,
  GitCompare,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Info,
  Shield,
  RefreshCw,
} from 'lucide-react';
import type {
  SnapshotSummary,
  ComparisonResult,
  EntityComparison,
  RestoreOptions,
  RestorePreview,
  RestoreResult,
} from '@/types/record';
import {
  getSnapshotSummaries,
  createSnapshot,
  deleteSnapshot,
  compareWithSnapshot,
  createRestorePreview,
  restoreFromSnapshot,
  downloadSnapshot,
  parseSnapshotFile,
  importSnapshot,
  getSnapshotById,
} from '@/utils/snapshotStorage';
import { getRecords } from '@/utils/storage';

interface BackupRestoreManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreComplete?: () => void;
}

type ViewMode = 'list' | 'compare' | 'restore-preview';

const ENTITY_LABELS: Record<EntityComparison['entityType'], { label: string; icon: React.ReactNode }> = {
  records: { label: '调音记录', icon: <Database className="w-4 h-4" /> },
  workbench: { label: '工作台任务', icon: <ListTodo className="w-4 h-4" /> },
  modes: { label: '调式管理', icon: <Music2 className="w-4 h-4" /> },
};

const CHANGE_TYPE_STYLES = {
  added: { label: '新增', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  modified: { label: '修改', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  deleted: { label: '删除', color: 'text-rose-700 bg-rose-50 border-rose-200' },
};

export function BackupRestoreManager({ isOpen, onClose, onRestoreComplete }: BackupRestoreManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [newSnapshotDesc, setNewSnapshotDesc] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [restoreOptions, setRestoreOptions] = useState<RestoreOptions>({
    restoreRecords: true,
    restoreWorkbench: true,
    restoreModes: true,
  });
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSnapshots = useCallback(() => {
    const summaries = getSnapshotSummaries();
    setSnapshots(summaries);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSnapshots();
      resetState();
    }
  }, [isOpen, loadSnapshots]);

  const resetState = () => {
    setViewMode('list');
    setShowCreateForm(false);
    setNewSnapshotName('');
    setNewSnapshotDesc('');
    setSelectedSnapshotId(null);
    setComparisonResult(null);
    setRestorePreview(null);
    setRestoreResult(null);
    setError('');
    setRestoreOptions({
      restoreRecords: true,
      restoreWorkbench: true,
      restoreModes: true,
    });
    setExpandedEntities(new Set());
  };

  const handleCreateSnapshot = () => {
    const trimmedName = newSnapshotName.trim();
    if (!trimmedName) {
      setError('请输入快照名称');
      return;
    }

    setIsCreating(true);
    try {
      createSnapshot(trimmedName, newSnapshotDesc);
      loadSnapshots();
      setShowCreateForm(false);
      setNewSnapshotName('');
      setNewSnapshotDesc('');
      setError('');
    } catch (e) {
      setError('创建快照失败，请重试');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个快照吗？此操作不可撤销。')) {
      return;
    }

    if (deleteSnapshot(id)) {
      loadSnapshots();
      if (selectedSnapshotId === id) {
        setSelectedSnapshotId(null);
        setComparisonResult(null);
        setRestorePreview(null);
      }
    }
  };

  const handleCompare = (snapshotId: string) => {
    setSelectedSnapshotId(snapshotId);
    const result = compareWithSnapshot(snapshotId);
    setComparisonResult(result);
    setExpandedEntities(new Set(['records', 'workbench', 'modes']));
    setViewMode('compare');
  };

  const handlePrepareRestore = (snapshotId: string) => {
    const currentRecords = getRecords();
    const currentCount = currentRecords.length;
    const snapshot = getSnapshotById(snapshotId);

    if (snapshot && snapshot.recordCount < currentCount) {
      if (!confirm(`警告：当前有 ${currentCount} 条记录，但快照中只有 ${snapshot.recordCount} 条记录。恢复将删除 ${currentCount - snapshot.recordCount} 条记录。确定继续吗？`)) {
        return;
      }
    }

    setSelectedSnapshotId(snapshotId);
    const preview = createRestorePreview(snapshotId, restoreOptions);
    setRestorePreview(preview);
    setViewMode('restore-preview');
  };

  const handleRestoreOptionChange = (key: keyof RestoreOptions) => {
    const newOptions = { ...restoreOptions, [key]: !restoreOptions[key] };
    setRestoreOptions(newOptions);
    if (selectedSnapshotId) {
      const preview = createRestorePreview(selectedSnapshotId, newOptions);
      setRestorePreview(preview);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedSnapshotId) return;
    if (!restoreOptions.restoreRecords && !restoreOptions.restoreWorkbench && !restoreOptions.restoreModes) {
      setError('请至少选择一项要恢复的数据');
      return;
    }

    const hasAnythingToRestore =
      (restoreOptions.restoreRecords && restorePreview && (restorePreview.willChangeRecords > 0 || restorePreview.willDeleteRecords > 0)) ||
      (restoreOptions.restoreWorkbench && restorePreview && (restorePreview.willChangeWorkbench > 0 || restorePreview.willDeleteWorkbenchTasks > 0)) ||
      (restoreOptions.restoreModes && restorePreview && (restorePreview.willChangeModes > 0 || restorePreview.willDeleteModes > 0));

    if (!hasAnythingToRestore) {
      if (!confirm('当前选择的数据与快照完全一致，无需恢复。是否仍要执行恢复操作？')) {
        return;
      }
    }

    const confirmMsg = restorePreview && restorePreview.warnings.length > 0
      ? `恢复操作将执行以下变更：\n\n` +
        (restoreOptions.restoreRecords ? `• 恢复 ${restorePreview.willChangeRecords} 条记录，删除 ${restorePreview.willDeleteRecords} 条记录\n` : '') +
        (restoreOptions.restoreWorkbench ? `• 恢复 ${restorePreview.willChangeWorkbench} 个工作台任务\n` : '') +
        (restoreOptions.restoreModes ? `• 恢复 ${restorePreview.willChangeModes} 个调式\n` : '') +
        `\n警告：\n${restorePreview.warnings.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n\n确定要恢复吗？`
      : `恢复操作将执行以下变更：\n\n` +
        (restoreOptions.restoreRecords ? `• 恢复 ${restorePreview?.willChangeRecords || 0} 条记录，删除 ${restorePreview?.willDeleteRecords || 0} 条记录\n` : '') +
        (restoreOptions.restoreWorkbench ? `• 恢复 ${restorePreview?.willChangeWorkbench || 0} 个工作台任务\n` : '') +
        (restoreOptions.restoreModes ? `• 恢复 ${restorePreview?.willChangeModes || 0} 个调式\n` : '') +
        `\n确定要恢复吗？此操作将覆盖当前数据，且不可撤销。`;

    if (!confirm(confirmMsg)) {
      return;
    }

    setIsRestoring(true);
    try {
      const result = restoreFromSnapshot(selectedSnapshotId, restoreOptions);
      if (result) {
        setRestoreResult(result);
        if (onRestoreComplete) {
          setTimeout(() => {
            onRestoreComplete();
          }, 500);
        }
      }
    } catch (e) {
      setError('恢复失败，请重试');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDownloadSnapshot = (snapshot: SnapshotSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    const fullSnapshot = getSnapshotById(snapshot.id);
    if (fullSnapshot) {
      downloadSnapshot(fullSnapshot);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseSnapshotFile(content);
        const imported = importSnapshot(parsed);
        loadSnapshots();
        alert(`成功导入快照：${imported.name}`);
      } catch (error) {
        alert(error instanceof Error ? error.message : '导入失败，请检查文件格式');
      }
    };
    reader.onerror = () => {
      alert('文件读取失败');
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleEntityExpand = (entityType: string) => {
    const newExpanded = new Set(expandedEntities);
    if (newExpanded.has(entityType)) {
      newExpanded.delete(entityType);
    } else {
      newExpanded.add(entityType);
    }
    setExpandedEntities(newExpanded);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const selectedSnapshot = snapshots.find(s => s.id === selectedSnapshotId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-clay-400 to-clay-600 flex items-center justify-center shadow-lg">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink-500">备份与恢复</h2>
              <p className="text-sm text-ink-400">创建快照、对比差异、恢复历史数据</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {viewMode !== 'list' && (
          <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100">
            <button
              onClick={() => {
                setViewMode('list');
                setComparisonResult(null);
                setRestorePreview(null);
                setRestoreResult(null);
              }}
              className="text-sm text-clay-600 hover:text-clay-700 flex items-center gap-1"
            >
              ← 返回快照列表
            </button>
            {selectedSnapshot && (
              <span className="text-sm text-gray-500">
                {selectedSnapshot.name}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {viewMode === 'list' && (
            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-clay-50 flex items-center justify-center">
                    <Database className="w-5 h-5 text-clay-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink-500">快照管理</h3>
                    <p className="text-sm text-ink-400">
                      共 {snapshots.length} 个快照，最多保存 50 个
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleImportClick}
                    className="btn-secondary inline-flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>导入快照</span>
                  </button>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>创建快照</span>
                  </button>
                </div>
              </div>

              {showCreateForm && (
                <div className="bg-clay-50 rounded-xl p-4 border border-clay-100">
                  <h4 className="font-medium text-ink-500 mb-3">创建新快照</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-ink-400 mb-1">
                        快照名称
                      </label>
                      <input
                        type="text"
                        value={newSnapshotName}
                        onChange={(e) => setNewSnapshotName(e.target.value)}
                        placeholder={`快照 ${new Date().toLocaleString('zh-CN')}`}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-clay-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink-400 mb-1">
                        描述（可选）
                      </label>
                      <textarea
                        value={newSnapshotDesc}
                        onChange={(e) => setNewSnapshotDesc(e.target.value)}
                        placeholder="记录创建快照的原因或重要信息..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-clay-400 focus:border-transparent resize-none"
                      />
                    </div>
                    {error && (
                      <div className="flex items-center gap-2 text-rose-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCreateSnapshot}
                        disabled={isCreating}
                        className="btn-primary inline-flex items-center gap-2"
                      >
                        {isCreating ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                        <span>{isCreating ? '创建中...' : '创建快照'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateForm(false);
                          setError('');
                        }}
                        className="btn-secondary"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {snapshots.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-ink-500 mb-2">
                    暂无快照
                  </h3>
                  <p className="text-ink-400 max-w-md mx-auto">
                    创建快照可以保存当前所有数据的状态，包括记录、工作台和调式信息，方便以后恢复。
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {snapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:border-clay-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-ink-500 truncate">
                              {snapshot.name}
                            </h4>
                            <span className="text-xs px-2 py-0.5 bg-clay-50 text-clay-600 rounded-full">
                              v{snapshot.formatVersion}
                            </span>
                          </div>
                          {snapshot.description && (
                            <p className="text-sm text-ink-400 mb-2 line-clamp-2">
                              {snapshot.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-xs text-ink-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(snapshot.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Database className="w-3 h-3" />
                              {snapshot.recordCount} 条记录
                            </span>
                            <span className="flex items-center gap-1">
                              <ListTodo className="w-3 h-3" />
                              {snapshot.workbenchTaskCount} 个任务
                            </span>
                            <span className="flex items-center gap-1">
                              <Music2 className="w-3 h-3" />
                              {snapshot.modeCount} 个调式
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDownloadSnapshot(snapshot, e)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="下载快照"
                          >
                            <Download className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleCompare(snapshot.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="对比差异"
                          >
                            <GitCompare className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handlePrepareRestore(snapshot.id)}
                            className="p-2 hover:bg-clay-50 rounded-lg transition-colors"
                            title="恢复到此版本"
                          >
                            <RotateCcw className="w-4 h-4 text-clay-600" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteSnapshot(snapshot.id, e)}
                            className="p-2 hover:bg-rose-50 rounded-lg transition-colors"
                            title="删除快照"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'compare' && comparisonResult && (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ink-500 flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-clay-600" />
                    与快照「{comparisonResult.snapshotName}」对比
                  </h3>
                  <p className="text-sm text-ink-400 mt-1">
                    对比时间：{formatDate(comparisonResult.comparedAt)}
                  </p>
                </div>
                <button
                  onClick={() => handlePrepareRestore(selectedSnapshotId!)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>恢复到此版本</span>
                </button>
              </div>

              {comparisonResult.orphanedWorkbenchTasks.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">检测到孤立任务</h4>
                    <p className="text-sm text-amber-700">
                      快照中有 {comparisonResult.orphanedWorkbenchTasks.length} 个工作台任务引用了不存在的记录。
                      恢复时这些任务将被自动清理。
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {comparisonResult.entities.map((entity) => {
                  const labelInfo = ENTITY_LABELS[entity.entityType];
                  const hasChanges = entity.added > 0 || entity.modified > 0 || entity.deleted > 0;
                  const isExpanded = expandedEntities.has(entity.entityType);

                  return (
                    <div
                      key={entity.entityType}
                      className={`border rounded-xl overflow-hidden ${
                        hasChanges ? 'border-gray-200' : 'border-gray-100 bg-gray-50'
                      }`}
                    >
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleEntityExpand(entity.entityType)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                            {labelInfo.icon}
                          </div>
                          <div>
                            <h4 className="font-medium text-ink-500">
                              {labelInfo.label}
                            </h4>
                            <p className="text-xs text-ink-400">
                              当前 {entity.currentCount} 条 · 快照 {entity.snapshotCount} 条
                              {entity.diff !== 0 && (
                                <span className={entity.diff > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                  {' '}· {entity.diff > 0 ? '+' : ''}{entity.diff}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {entity.added > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                              +{entity.added} 新增
                            </span>
                          )}
                          {entity.modified > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                              {entity.modified} 修改
                            </span>
                          )}
                          {entity.deleted > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-rose-50 text-rose-700">
                              -{entity.deleted} 删除
                            </span>
                          )}
                          {!hasChanges && (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                              无变化
                            </span>
                          )}
                        </div>
                      </div>

                      {isExpanded && entity.changes.length > 0 && (
                        <div className="border-t border-gray-100 p-4 space-y-2 bg-gray-50">
                          {entity.changes.map((change, idx) => (
                            <div
                              key={`${change.id}-${idx}`}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full border ${
                                    CHANGE_TYPE_STYLES[change.type].color
                                  }`}
                                >
                                  {CHANGE_TYPE_STYLES[change.type].label}
                                </span>
                                <span className="text-sm text-ink-500 truncate">
                                  {change.label}
                                </span>
                              </div>
                              {change.fieldChanges && change.fieldChanges.length > 0 && (
                                <div className="flex items-center gap-1 text-xs text-ink-400">
                                  <Info className="w-3 h-3" />
                                  <span>{change.fieldChanges.length} 个字段变更</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'restore-preview' && restorePreview && !restoreResult && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-ink-500 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-clay-600" />
                  恢复到「{restorePreview.snapshotName}」
                </h3>
                <p className="text-sm text-ink-400 mt-1">
                  请选择要恢复的数据类型，系统会自动处理数据完整性
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                <h4 className="font-medium text-ink-500">选择恢复内容</h4>

                <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreOptions.restoreRecords}
                    onChange={() => handleRestoreOptionChange('restoreRecords')}
                    className="mt-1 w-4 h-4 text-clay-600 rounded focus:ring-clay-400"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink-500 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        调音记录
                      </span>
                      <span className="text-sm text-ink-400">
                        {restorePreview.willChangeRecords > 0 || restorePreview.willDeleteRecords > 0 ? (
                          <>
                            <span className="text-emerald-600">恢复 {restorePreview.willChangeRecords} 条</span>
                            {restorePreview.willDeleteRecords > 0 && (
                              <span className="text-rose-600 ml-2">
                                · 删除 {restorePreview.willDeleteRecords} 条
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-500">无变化</span>
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-ink-400 mt-1">
                      恢复所有手碟调音记录数据
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreOptions.restoreWorkbench}
                    onChange={() => handleRestoreOptionChange('restoreWorkbench')}
                    className="mt-1 w-4 h-4 text-clay-600 rounded focus:ring-clay-400"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink-500 flex items-center gap-2">
                        <ListTodo className="w-4 h-4" />
                        工作台任务
                      </span>
                      <span className="text-sm text-ink-400">
                        {restoreOptions.restoreWorkbench ? (
                          restorePreview.willChangeWorkbench > 0 || restorePreview.willDeleteWorkbenchTasks > 0 ? (
                            <>
                              <span className="text-emerald-600">恢复 {restorePreview.willChangeWorkbench} 条</span>
                              {restorePreview.willDeleteWorkbenchTasks > 0 && (
                                <span className="text-rose-600 ml-2">
                                  · 清理 {restorePreview.willDeleteWorkbenchTasks} 条
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-500">无变化</span>
                          )
                        ) : restorePreview.willDeleteWorkbenchTasks > 0 ? (
                          <span className="text-rose-600">
                            需清理 {restorePreview.willDeleteWorkbenchTasks} 条（引用已删除记录）
                          </span>
                        ) : (
                          <span className="text-gray-500">无变化</span>
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-ink-400 mt-1">
                      {restoreOptions.restoreWorkbench
                        ? '恢复工作台的任务列表和状态'
                        : restorePreview.willDeleteWorkbenchTasks > 0
                        ? '不恢复工作台，但将自动清理引用已删除记录的任务'
                        : '不恢复工作台任务'
                      }
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreOptions.restoreModes}
                    onChange={() => handleRestoreOptionChange('restoreModes')}
                    className="mt-1 w-4 h-4 text-clay-600 rounded focus:ring-clay-400"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink-500 flex items-center gap-2">
                        <Music2 className="w-4 h-4" />
                        调式管理
                      </span>
                      <span className="text-sm text-ink-400">
                        {restorePreview.willChangeModes > 0 || restorePreview.willDeleteModes > 0 ? (
                          <>
                            <span className="text-emerald-600">恢复 {restorePreview.willChangeModes} 条</span>
                            {restorePreview.willDeleteModes > 0 && (
                              <span className="text-rose-600 ml-2">
                                · 删除 {restorePreview.willDeleteModes} 条
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-500">无变化</span>
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-ink-400 mt-1">
                      恢复调式选项和排序设置
                    </p>
                  </div>
                </label>
              </div>

              {restorePreview.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-medium">
                    <AlertTriangle className="w-5 h-5" />
                    <span>重要提示</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
                    {restorePreview.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {restorePreview.orphanedTasksAfterRestore.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                    <Shield className="w-5 h-5" />
                    <span>数据完整性保护</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    恢复后将自动清理 {restorePreview.orphanedTasksAfterRestore.length} 个引用不存在记录的工作台任务，
                    确保数据一致性。
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setViewMode('list')}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmRestore}
                  disabled={isRestoring || (!restoreOptions.restoreRecords && !restoreOptions.restoreWorkbench && !restoreOptions.restoreModes)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  {isRestoring ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  <span>{isRestoring ? '恢复中...' : '确认恢复'}</span>
                </button>
              </div>
            </div>
          )}

          {restoreResult && (
            <div className="p-6 space-y-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-ink-500 mb-2">
                  恢复成功
                </h3>
                <p className="text-ink-400">
                  数据已成功恢复到「{selectedSnapshot?.name}」版本
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-ink-500">恢复详情</h4>
                <div className="grid grid-cols-3 gap-4">
                  {restoreResult.restoredRecords > 0 && (
                    <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                      <Database className="w-5 h-5 text-clay-600 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-ink-500">
                        {restoreResult.restoredRecords}
                      </div>
                      <div className="text-xs text-ink-400">调音记录</div>
                    </div>
                  )}
                  {restoreResult.restoredWorkbenchTasks > 0 && (
                    <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                      <ListTodo className="w-5 h-5 text-clay-600 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-ink-500">
                        {restoreResult.restoredWorkbenchTasks}
                      </div>
                      <div className="text-xs text-ink-400">工作台任务</div>
                    </div>
                  )}
                  {restoreResult.restoredModes > 0 && (
                    <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                      <Music2 className="w-5 h-5 text-clay-600 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-ink-500">
                        {restoreResult.restoredModes}
                      </div>
                      <div className="text-xs text-ink-400">调式</div>
                    </div>
                  )}
                </div>

                {restoreResult.cleanedOrphanedTasks > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
                    <Shield className="w-4 h-4" />
                    <span>已自动清理 {restoreResult.cleanedOrphanedTasks} 个无效的工作台任务</span>
                  </div>
                )}

                {restoreResult.warnings.length > 0 && (
                  <div className="space-y-1">
                    {restoreResult.warnings.map((warning, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-amber-700">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={onClose}
                  className="btn-primary"
                >
                  完成
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportFile}
        className="hidden"
      />
    </div>
  );
}
