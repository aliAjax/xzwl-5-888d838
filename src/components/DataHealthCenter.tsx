import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  History,
  Power,
  FileX,
  Music,
  Database,
  ListTodo,
  Wrench,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Play,
  Eye,
  Check,
  X as XIcon,
  AlertCircle,
  Download,
  Zap,
  Shield,
} from 'lucide-react';
import type { Issue, IssueGroup, ScanResult, FixPreview, RepairSummary, IssueSeverity } from '@/utils/dataHealthCheck';
import {
  scanDataHealth,
  generateFixPreviews,
  performAutoFix,
  performBatchAutoFix,
} from '@/utils/dataHealthCheck';
import { migrateRecords } from '@/utils/storage';
import type { HandpanRecord } from '@/types/record';

interface DataHealthCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRepaired?: (records: HandpanRecord[]) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  copy: <Copy className="w-4 h-4" />,
  history: <History className="w-4 h-4" />,
  'alert-triangle': <AlertTriangle className="w-4 h-4" />,
  'power-off': <Power className="w-4 h-4" />,
  clock: <Clock className="w-4 h-4" />,
  'file-x': <FileX className="w-4 h-4" />,
  music: <Music className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
  'list-todo': <ListTodo className="w-4 h-4" />,
  wrench: <Wrench className="w-4 h-4" />,
  search: <Search className="w-4 h-4" />,
  'refresh-cw': <RefreshCw className="w-4 h-4" />,
  'help-circle': <AlertCircle className="w-4 h-4" />,
};

const SEVERITY_CONFIG: Record<IssueSeverity, { label: string; color: string; bgColor: string }> = {
  high: { label: '严重', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
  medium: { label: '中等', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  low: { label: '轻微', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
};

export function DataHealthCenter({ isOpen, onClose, onDataRepaired }: DataHealthCenterProps) {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [fixPreviews, setFixPreviews] = useState<FixPreview[]>([]);
  const [isFixing, setIsFixing] = useState(false);
  const [repairSummary, setRepairSummary] = useState<RepairSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'auto' | 'manual'>('all');

  const performScan = useCallback(() => {
    setIsScanning(true);
    setSelectedIssues(new Set());
    setRepairSummary(null);

    setTimeout(() => {
      try {
        const result = scanDataHealth();
        setScanResult(result);
        setExpandedGroups(new Set(result.issueGroups.map(g => g.type)));

        const allAutoFixable = result.issueGroups.flatMap(g => g.issues.filter(i => i.autoFixable));
        setSelectedIssues(new Set(allAutoFixable.map(i => i.id)));
      } catch (error) {
        console.error('Scan failed:', error);
      } finally {
        setIsScanning(false);
      }
    }, 500);
  }, []);

  useEffect(() => {
    if (isOpen) {
      performScan();
    } else {
      setScanResult(null);
      setRepairSummary(null);
      setShowPreview(false);
    }
  }, [isOpen, performScan]);

  const toggleGroup = (groupType: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupType)) {
      newExpanded.delete(groupType);
    } else {
      newExpanded.add(groupType);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleIssueSelection = (issueId: string, autoFixable: boolean) => {
    if (!autoFixable) return;

    const newSelected = new Set(selectedIssues);
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
    } else {
      newSelected.add(issueId);
    }
    setSelectedIssues(newSelected);
  };

  const selectAllAutoFixable = () => {
    if (!scanResult) return;
    const allAutoFixable = scanResult.issueGroups.flatMap(g => g.issues.filter(i => i.autoFixable));
    setSelectedIssues(new Set(allAutoFixable.map(i => i.id)));
  };

  const clearSelection = () => {
    setSelectedIssues(new Set());
  };

  const handleShowPreview = () => {
    if (!scanResult || selectedIssues.size === 0) return;

    const allIssues = scanResult.issueGroups.flatMap(g => g.issues);
    const selectedIssueObjects = allIssues.filter(i => selectedIssues.has(i.id));
    const previews = generateFixPreviews(selectedIssueObjects);
    setFixPreviews(previews);
    setShowPreview(true);
  };

  const handleConfirmFix = async () => {
    if (!scanResult || selectedIssues.size === 0) return;

    setIsFixing(true);

    setTimeout(() => {
      try {
        const allIssues = scanResult.issueGroups.flatMap(g => g.issues);
        const selectedIssueObjects = allIssues.filter(i => selectedIssues.has(i.id));
        const summary = performBatchAutoFix(selectedIssueObjects);

        setRepairSummary(summary);
        setShowPreview(false);
        setIsFixing(false);

        try {
          const recordsRaw = JSON.parse(localStorage.getItem('handpan_records') || '[]');
          const migrated = migrateRecords(recordsRaw);
          onDataRepaired?.(migrated);
        } catch (e) {
          console.error('Failed to refresh records:', e);
        }

        setTimeout(() => {
          performScan();
        }, 500);
      } catch (error) {
        console.error('Fix failed:', error);
        setIsFixing(false);
      }
    }, 800);
  };

  const handleSingleFix = async (issue: Issue) => {
    if (!issue.autoFixable) return;

    const result = performAutoFix(issue);
    if (result.success && result.updatedRecords) {
      onDataRepaired?.(result.updatedRecords);
      setTimeout(() => performScan(), 300);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showPreview) {
        setShowPreview(false);
      } else if (!repairSummary) {
        onClose();
      }
    }
  };

  const filteredGroups = scanResult?.issueGroups.filter(group => {
    if (activeTab === 'auto') return group.autoFixableCount > 0;
    if (activeTab === 'manual') return group.manualFixCount > 0;
    return true;
  }) || [];

  const selectedIssuesCount = selectedIssues.size;
  const totalAutoFixable = scanResult?.autoFixableCount || 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onKeyDown={handleKeyDown}>
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={() => !showPreview && !repairSummary && onClose()}
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scale-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-clay-100 paper-texture flex flex-col h-[90vh]">
          <div className="flex items-center justify-between p-6 border-b border-clay-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink-500">数据体检与修复中心</h2>
                <p className="text-xs text-ink-400">扫描并修复手碟记录中的数据问题</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={performScan}
                disabled={isScanning}
                className="btn-secondary inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                <span>重新扫描</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-ink-400 hover:text-ink-500 hover:bg-clay-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {scanResult && (
            <div className="px-6 py-4 bg-clay-50 border-b border-clay-100 flex-shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-3 border border-clay-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-ink-400" />
                    <span className="text-xs text-ink-400">记录总数</span>
                  </div>
                  <p className="text-2xl font-bold text-ink-500">{scanResult.totalRecords}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-clay-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-ink-400" />
                    <span className="text-xs text-ink-400">问题总数</span>
                  </div>
                  <p className={`text-2xl font-bold ${scanResult.totalIssues > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {scanResult.totalIssues}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-clay-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-ink-400" />
                    <span className="text-xs text-ink-400">可自动修复</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">{scanResult.autoFixableCount}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-clay-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Wrench className="w-4 h-4 text-ink-400" />
                    <span className="text-xs text-ink-400">需手动处理</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{scanResult.manualFixCount}</p>
                </div>
              </div>
              <p className="text-xs text-ink-400 mt-3">
                扫描时间：{new Date(scanResult.scanTime).toLocaleString('zh-CN')}
              </p>
            </div>
          )}

          <div className="px-6 py-3 border-b border-clay-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-1 bg-clay-50 rounded-lg p-1">
              {[
                { key: 'all', label: '全部' },
                { key: 'auto', label: '自动修复' },
                { key: 'manual', label: '手动处理' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-white text-ink-500 shadow-sm'
                      : 'text-ink-400 hover:text-ink-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={selectAllAutoFixable}
                className="text-xs text-ink-500 hover:text-clay-600 transition-colors"
              >
                全选可自动修复
              </button>
              <span className="text-ink-200">|</span>
              <button
                onClick={clearSelection}
                className="text-xs text-ink-500 hover:text-clay-600 transition-colors"
              >
                清除选择
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isScanning ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Activity className="w-12 h-12 text-emerald-500 animate-pulse mb-4" />
                <p className="text-ink-500 font-medium">正在扫描数据...</p>
                <p className="text-sm text-ink-400 mt-1">检查记录完整性和一致性</p>
              </div>
            ) : scanResult && scanResult.totalIssues === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
                <p className="text-xl font-bold text-ink-500">数据状态良好</p>
                <p className="text-sm text-ink-400 mt-1">未发现任何数据问题</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGroups.map(group => (
                  <div
                    key={group.type}
                    className={`border rounded-xl overflow-hidden ${SEVERITY_CONFIG[Math.min(...group.issues.map(i => i.severity === 'high' ? 'high' : i.severity === 'medium' ? 'medium' : 'low')) as IssueSeverity].bgColor}`}
                  >
                    <button
                      onClick={() => toggleGroup(group.type)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedGroups.has(group.type) ? (
                          <ChevronDown className="w-4 h-4 text-ink-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-ink-400" />
                        )}
                        {ICON_MAP[group.icon] || ICON_MAP['help-circle']}
                        <span className="font-medium text-ink-500">{group.title}</span>
                        <span className="px-2 py-0.5 bg-white/80 rounded-full text-xs text-ink-500">
                          {group.issues.length} 个问题
                        </span>
                        {group.autoFixableCount > 0 && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                            {group.autoFixableCount} 可自动修复
                          </span>
                        )}
                        {group.manualFixCount > 0 && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {group.manualFixCount} 需手动
                          </span>
                        )}
                      </div>
                    </button>

                    {expandedGroups.has(group.type) && (
                      <div className="border-t border-clay-100 bg-white">
                        {group.issues.map(issue => (
                          <div
                            key={issue.id}
                            className={`p-4 border-b border-clay-50 last:border-b-0 ${
                              issue.autoFixable ? 'hover:bg-clay-50 cursor-pointer' : 'bg-gray-50'
                            }`}
                            onClick={() => toggleIssueSelection(issue.id, issue.autoFixable)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="pt-0.5">
                                {issue.autoFixable ? (
                                  <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                      selectedIssues.has(issue.id)
                                        ? 'bg-clay-500 border-clay-500 text-white'
                                        : 'border-ink-300'
                                    }`}
                                  >
                                    {selectedIssues.has(issue.id) && <Check className="w-3 h-3" />}
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-blue-400 bg-blue-50 flex items-center justify-center">
                                    <Wrench className="w-3 h-3 text-blue-500" />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-ink-500">{issue.title}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      SEVERITY_CONFIG[issue.severity].bgColor
                                    } ${SEVERITY_CONFIG[issue.severity].color}`}
                                  >
                                    {SEVERITY_CONFIG[issue.severity].label}
                                  </span>
                                  {issue.autoFixable ? (
                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">
                                      可自动修复
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                      需手动处理
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-ink-400 mt-1">{issue.description}</p>

                                {issue.serialNumber && (
                                  <p className="text-xs text-ink-300 mt-1">
                                    编号：{issue.serialNumber}
                                  </p>
                                )}

                                {issue.autoFixable && issue.suggestedFix && (
                                  <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <p className="text-xs text-emerald-700">
                                      <span className="font-medium">建议修复：</span>
                                      {issue.suggestedFix.description}
                                    </p>
                                  </div>
                                )}

                                {!issue.autoFixable && (
                                  <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                                    <p className="text-xs text-blue-700">
                                      <span className="font-medium">处理建议：</span>
                                      请在记录详情页面手动修正该问题
                                    </p>
                                  </div>
                                )}
                              </div>

                              {issue.autoFixable && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSingleFix(issue);
                                  }}
                                  className="btn-primary text-xs py-1.5 px-3 flex-shrink-0"
                                >
                                  修复
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {scanResult && scanResult.totalIssues > 0 && (
            <div className="px-6 py-4 border-t border-clay-100 bg-clay-50 flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-ink-400">
                已选择 <span className="font-medium text-ink-500">{selectedIssuesCount}</span> /{' '}
                <span className="font-medium text-ink-500">{totalAutoFixable}</span> 个可自动修复的问题
              </div>
              <button
                onClick={handleShowPreview}
                disabled={selectedIssuesCount === 0 || isFixing}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye className="w-4 h-4" />
                <span>预览并修复</span>
              </button>
            </div>
          )}
        </div>

        {showPreview && (
          <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-clay-100 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-clay-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-ink-500">修复预览</h3>
                    <p className="text-xs text-ink-400">请确认以下修复操作</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 rounded-lg text-ink-400 hover:text-ink-500 hover:bg-clay-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-3">
                  {fixPreviews.map(preview => (
                    <div key={preview.issueId} className="border border-clay-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="font-medium text-ink-500">{preview.title}</span>
                      </div>
                      <p className="text-sm text-ink-400 mb-3">{preview.description}</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                          <p className="text-xs text-red-500 font-medium mb-1">当前值</p>
                          <pre className="text-xs text-red-700 whitespace-pre-wrap break-all">
                            {JSON.stringify(preview.currentValue, null, 2)}
                          </pre>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                          <p className="text-xs text-emerald-500 font-medium mb-1">修复后</p>
                          <pre className="text-xs text-emerald-700 whitespace-pre-wrap break-all">
                            {JSON.stringify(preview.newValue, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-clay-100 bg-clay-50 flex items-center justify-between">
                <p className="text-sm text-ink-400">
                  即将修复 <span className="font-medium text-ink-500">{fixPreviews.length}</span> 个问题
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmFix}
                    disabled={isFixing}
                    className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {isFixing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>修复中...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>确认修复</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {repairSummary && (
          <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-clay-100 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-clay-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    repairSummary.failedCount === 0
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                      : 'bg-gradient-to-br from-amber-400 to-amber-600'
                  }`}>
                    {repairSummary.failedCount === 0 ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-ink-500">修复完成</h3>
                    <p className="text-xs text-ink-400">
                      {repairSummary.failedCount === 0 ? '所有问题已成功修复' : '部分问题修复失败'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRepairSummary(null)}
                  className="p-2 rounded-lg text-ink-400 hover:text-ink-500 hover:bg-clay-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                    <p className="text-3xl font-bold text-emerald-600">{repairSummary.successCount}</p>
                    <p className="text-xs text-emerald-700 mt-1">修复成功</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
                    <p className="text-3xl font-bold text-red-600">{repairSummary.failedCount}</p>
                    <p className="text-xs text-red-700 mt-1">修复失败</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
                    <p className="text-3xl font-bold text-gray-600">{repairSummary.skippedCount}</p>
                    <p className="text-xs text-gray-700 mt-1">跳过</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-ink-500 mb-3">详细结果</h4>
                  {repairSummary.results.map(result => (
                    <div
                      key={result.issueId}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        result.status === 'success'
                          ? 'bg-emerald-50 border-emerald-100'
                          : result.status === 'failed'
                          ? 'bg-red-50 border-red-100'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {result.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      ) : result.status === 'failed' ? (
                        <XIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-500 truncate">{result.title}</p>
                        <p className={`text-xs ${
                          result.status === 'success' ? 'text-emerald-600' :
                          result.status === 'failed' ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {result.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-clay-50 rounded-xl border border-clay-100">
                  <p className="text-xs text-ink-400">
                    修复时间：{new Date(repairSummary.repairTime).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-clay-100 bg-clay-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    const dataStr = JSON.stringify(repairSummary, null, 2);
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `repair-summary-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                  className="btn-secondary inline-flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>导出报告</span>
                </button>
                <button
                  onClick={() => setRepairSummary(null)}
                  className="btn-primary"
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
