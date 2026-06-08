import { useState } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Hash, FileJson, Clock, ArrowRight, GitMerge, Shield, Download } from 'lucide-react';
import type { ImportAnalysis } from '@/utils/storage';
import { RecordCard } from './RecordCard';
import type { RecordConflict, RecordConflictResolution } from '@/types/record';

interface ImportPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (conflicts: RecordConflict[]) => void;
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

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function ImportPreview({ isOpen, onClose, onConfirm, analysis, fileName }: ImportPreviewProps) {
  const [localConflicts, setLocalConflicts] = useState<RecordConflict[]>([]);
  const [activeTab, setActiveTab] = useState<'new' | 'conflicts'>('new');

  const handleEdit = () => {};
  const handleDelete = () => {};
  const handleGenerateDelivery = () => {};

  if (!isOpen || !analysis) return null;

  const hasConflicts = analysis.conflicts.length > 0;
  const totalToImport = analysis.valid.length + analysis.conflicts.filter(c => c.resolution !== 'keep-existing').length;

  const handleResolutionChange = (index: number, resolution: RecordConflictResolution) => {
    const updated = [...localConflicts];
    if (updated.length === 0) {
      updated.push(...analysis.conflicts);
    }
    updated[index] = { ...updated[index], resolution };
    setLocalConflicts(updated);
  };

  const handleSetAllResolution = (resolution: RecordConflictResolution) => {
    const updated = analysis.conflicts.map(c => ({ ...c, resolution }));
    setLocalConflicts(updated);
  };

  const getConflicts = () => localConflicts.length > 0 ? localConflicts : analysis.conflicts;

  const handleConfirm = () => {
    onConfirm(getConflicts());
  };

  const getResolutionLabel = (resolution: RecordConflictResolution) => {
    switch (resolution) {
      case 'keep-existing': return '保留现有';
      case 'use-imported': return '使用导入';
      case 'merge': return '智能合并';
    }
  };

  const getResolutionColor = (resolution: RecordConflictResolution) => {
    switch (resolution) {
      case 'keep-existing': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'use-imported': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'merge': return 'bg-brass-100 text-brass-700 border-brass-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-scale-in">
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
                <div className="text-sm text-green-600 mt-1">新增记录</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-amber-600">{analysis.conflicts.length}</div>
                <div className="text-sm text-amber-600 mt-1">冲突记录</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{analysis.missingFields.length}</div>
                <div className="text-sm text-red-600 mt-1">字段缺失</div>
              </div>
            </div>

            {hasConflicts && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-ink-500 mb-2">检测到 {analysis.conflicts.length} 条冲突记录</h3>
                    <p className="text-sm text-ink-500 mb-3">
                      以下编号的记录已存在。系统根据 updatedAt 时间戳自动建议处理方式，您可以调整每条记录的处理策略。
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-ink-400">版本对比：</span>
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        <Download className="w-3.5 h-3.5" />
                        导入更新 {analysis.newerCount} 条
                      </span>
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        <Shield className="w-3.5 h-3.5" />
                        现有更新 {analysis.olderCount} 条
                      </span>
                      {analysis.sameTimeCount > 0 && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                          <Clock className="w-3.5 h-3.5" />
                          时间相同 {analysis.sameTimeCount} 条
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-sm text-ink-400">批量设置：</span>
                      <button
                        onClick={() => handleSetAllResolution('keep-existing')}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        全部保留现有
                      </button>
                      <button
                        onClick={() => handleSetAllResolution('use-imported')}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                      >
                        全部使用导入
                      </button>
                      <button
                        onClick={() => handleSetAllResolution('merge')}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-brass-100 text-brass-700 hover:bg-brass-200 transition-colors"
                      >
                        全部智能合并
                      </button>
                    </div>
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

            {hasConflicts && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GitMerge className="w-5 h-5 text-brass-500" />
                    <h3 className="font-semibold text-ink-500">冲突记录处理</h3>
                  </div>
                  <div className="flex gap-1 border border-clay-200 rounded-lg p-1">
                    <button
                      onClick={() => setActiveTab('new')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'new' ? 'bg-white text-ink-500 shadow-sm' : 'text-ink-400 hover:text-ink-500'
                      }`}
                    >
                      新增记录 ({analysis.valid.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('conflicts')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'conflicts' ? 'bg-white text-ink-500 shadow-sm' : 'text-ink-400 hover:text-ink-500'
                      }`}
                    >
                      冲突处理 ({analysis.conflicts.length})
                    </button>
                  </div>
                </div>

                {activeTab === 'conflicts' && (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {getConflicts().map((conflict, index) => (
                      <div
                        key={conflict.serialNumber}
                        className={`rounded-xl p-4 border transition-all ${
                          conflict.resolution === 'keep-existing' ? 'bg-gray-50 border-gray-200' :
                          conflict.resolution === 'use-imported' ? 'bg-blue-50 border-blue-200' :
                          'bg-brass-50 border-brass-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              conflict.isImportedNewer ? 'bg-green-100' : 'bg-amber-100'
                            }`}>
                              <Hash className={`w-5 h-5 ${conflict.isImportedNewer ? 'text-green-600' : 'text-amber-600'}`} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-ink-500">{conflict.serialNumber}</h4>
                              <p className="text-sm text-ink-400">
                                {conflict.importedRecord.customerNickname} · {conflict.importedRecord.mode}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleResolutionChange(index, 'keep-existing')}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                conflict.resolution === 'keep-existing'
                                  ? 'bg-gray-600 text-white border-gray-600'
                                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              保留现有
                            </button>
                            <button
                              onClick={() => handleResolutionChange(index, 'use-imported')}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                conflict.resolution === 'use-imported'
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                              }`}
                            >
                              使用导入
                            </button>
                            <button
                              onClick={() => handleResolutionChange(index, 'merge')}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                conflict.resolution === 'merge'
                                  ? 'bg-brass-600 text-white border-brass-600'
                                  : 'bg-white text-brass-600 border-brass-200 hover:bg-brass-50'
                              }`}
                            >
                              智能合并
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                              <Shield className="w-3.5 h-3.5" />
                              <span>现有版本</span>
                              <span className={getResolutionColor(conflict.resolution === 'keep-existing' ? 'keep-existing' : 'keep-existing')}>
                                {conflict.resolution === 'keep-existing' ? '保留' : '忽略'}
                              </span>
                            </div>
                            <p className="text-ink-500 font-mono text-xs">
                              {formatDateTime(conflict.existingUpdatedAt)}
                            </p>
                            <p className="text-xs text-ink-400 mt-1">
                              调音 {conflict.existingRecord.tuningHistory.length} 次
                              {conflict.existingRecord.followUp?.history && conflict.existingRecord.followUp.history.length > 0 && (
                                <> · 回访 {conflict.existingRecord.followUp.history.length} 条</>
                              )}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-blue-200">
                            <div className="flex items-center gap-1.5 text-xs text-blue-600 mb-1">
                              <Download className="w-3.5 h-3.5" />
                              <span>导入版本</span>
                              {conflict.isImportedNewer ? (
                                <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">更新</span>
                              ) : (
                                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs font-medium">较旧</span>
                              )}
                              <span className={getResolutionColor(conflict.resolution === 'use-imported' || conflict.resolution === 'merge' ? 'use-imported' : 'keep-existing')}>
                                {conflict.resolution === 'keep-existing' ? '忽略' : getResolutionLabel(conflict.resolution)}
                              </span>
                            </div>
                            <p className="text-ink-500 font-mono text-xs">
                              {formatDateTime(conflict.importedUpdatedAt)}
                            </p>
                            <p className="text-xs text-ink-400 mt-1">
                              调音 {conflict.importedRecord.tuningHistory.length} 次
                              {conflict.importedRecord.followUp?.history && conflict.importedRecord.followUp.history.length > 0 && (
                                <> · 回访 {conflict.importedRecord.followUp.history.length} 条</>
                              )}
                            </p>
                          </div>
                        </div>

                        {conflict.resolution === 'merge' && (
                          <div className="mt-3 bg-white rounded-lg p-3 border border-brass-200">
                            <div className="flex items-center gap-1.5 text-xs text-brass-600 mb-2">
                              <GitMerge className="w-3.5 h-3.5" />
                              <span className="font-medium">智能合并策略</span>
                            </div>
                            <ul className="text-xs text-ink-500 space-y-1">
                              <li className="flex items-center gap-1.5">
                                <ArrowRight className="w-3 h-3 text-brass-500" />
                                调音历史：合并两边记录，按日期排序，去重
                              </li>
                              <li className="flex items-center gap-1.5">
                                <ArrowRight className="w-3 h-3 text-brass-500" />
                                回访记录：合并两边记录，按日期排序，去重
                              </li>
                              <li className="flex items-center gap-1.5">
                                <ArrowRight className="w-3 h-3 text-brass-500" />
                                基本信息：优先使用导入版本的非空值
                              </li>
                              <li className="flex items-center gap-1.5">
                                <ArrowRight className="w-3 h-3 text-brass-500" />
                                交付状态：一旦已交付则保持不变
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'new' && analysis.valid.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <h3 className="font-semibold text-ink-500">即将导入的新记录（共 {analysis.valid.length} 条）</h3>
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
                          readOnly={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!hasConflicts && analysis.valid.length > 0 && (
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
                      readOnly={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {totalToImport === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-clay-100 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-clay-400" />
                </div>
                <p className="text-ink-500 font-medium">没有可导入的记录</p>
                <p className="text-sm text-ink-400 mt-1">所有记录都选择了"保留现有"或数据无效</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-6 border-t border-clay-100 bg-clay-50/50">
            <div className="text-sm text-ink-500">
              {totalToImport > 0 && (
                <span>
                  本次将处理 <span className="font-semibold text-brass-600">{totalToImport}</span> 条记录
                  {hasConflicts && (
                    <>
                      （新增 {analysis.valid.length} 条，
                      {getConflicts().filter(c => c.resolution === 'use-imported').length} 条使用导入版本，
                      {getConflicts().filter(c => c.resolution === 'merge').length} 条智能合并，
                      {getConflicts().filter(c => c.resolution === 'keep-existing').length} 条保留现有）
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="btn-primary inline-flex items-center gap-2"
                disabled={totalToImport === 0}
              >
                <Upload className="w-4 h-4" />
                <span>确认导入 {totalToImport > 0 ? `(${totalToImport} 条)` : ''}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
