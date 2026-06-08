import { useMemo, useState } from 'react';
import {
  X,
  BarChart3,
  TrendingUp,
  Music,
  AlertTriangle,
  Calendar,
  Minus,
  Plus,
  TrendingDown,
  Info,
  BarChart,
} from 'lucide-react';
import type { HandpanRecord, PhonemeDeviation, TuningRecord } from '@/types/record';
import { getLatestTuning, getPhonemeNames } from '@/types/record';

interface TuningQualityDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  records: HandpanRecord[];
}

interface ModeDeviationData {
  mode: string;
  avgBeforeDeviation: number | null;
  avgAfterDeviation: number | null;
  recordCount: number;
  validDeviationCount: number;
}

interface PhonemeFrequency {
  name: string;
  count: number;
  avgDeviation: number;
}

interface ImprovementData {
  recordId: string;
  serialNumber: string;
  mode: string;
  avgBefore: number;
  avgAfter: number;
  improvement: number;
  tuningDate: string;
}

interface DailyCompletion {
  date: string;
  count: number;
}

interface AnomalyRecord {
  recordId: string;
  serialNumber: string;
  mode: string;
  maxDeviation: number;
  phonemeName: string;
  tuningDate: string;
}

export function TuningQualityDashboard({ isOpen, onClose, records }: TuningQualityDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');

  const allDeviations = useMemo(() => {
    const result: {
      record: HandpanRecord;
      tuning: TuningRecord;
      deviation: PhonemeDeviation;
      phonemeIndex: number;
    }[] = [];

    records.forEach((record) => {
      record.tuningHistory.forEach((tuning) => {
        if (tuning.phonemeDeviations && tuning.phonemeDeviations.length > 0) {
          tuning.phonemeDeviations.forEach((deviation, index) => {
            result.push({ record, tuning, deviation, phonemeIndex: index });
          });
        }
      });
    });

    return result;
  }, [records]);

  const modeDeviations = useMemo((): ModeDeviationData[] => {
    const modeMap = new Map<string, { beforeSum: number; beforeCount: number; afterSum: number; afterCount: number; total: number }>();

    records.forEach((record) => {
      const latest = getLatestTuning(record);
      const deviations = latest?.phonemeDeviations || record.phonemeDeviations;

      if (!modeMap.has(record.mode)) {
        modeMap.set(record.mode, { beforeSum: 0, beforeCount: 0, afterSum: 0, afterCount: 0, total: 0 });
      }

      const modeData = modeMap.get(record.mode)!;
      modeData.total++;

      if (deviations && deviations.length > 0) {
        deviations.forEach((d) => {
          if (d.beforeDeviation !== null) {
            modeData.beforeSum += Math.abs(d.beforeDeviation);
            modeData.beforeCount++;
          }
          if (d.afterDeviation !== null) {
            modeData.afterSum += Math.abs(d.afterDeviation);
            modeData.afterCount++;
          }
        });
      }
    });

    return Array.from(modeMap.entries())
      .map(([mode, data]) => ({
        mode,
        avgBeforeDeviation: data.beforeCount > 0 ? data.beforeSum / data.beforeCount : null,
        avgAfterDeviation: data.afterCount > 0 ? data.afterSum / data.afterCount : null,
        recordCount: data.total,
        validDeviationCount: Math.max(data.beforeCount, data.afterCount),
      }))
      .sort((a, b) => (b.avgAfterDeviation ?? 0) - (a.avgAfterDeviation ?? 0));
  }, [records]);

  const frequentPhonemes = useMemo((): PhonemeFrequency[] => {
    const phonemeMap = new Map<string, { count: number; deviationSum: number }>();

    allDeviations.forEach(({ deviation, phonemeIndex, record }) => {
      let name = deviation.name;
      if (!name || name.trim() === '') {
        const names = getPhonemeNames(record, record.noteCount);
        name = names[phonemeIndex] || `音位 ${phonemeIndex}`;
      }

      if (!phonemeMap.has(name)) {
        phonemeMap.set(name, { count: 0, deviationSum: 0 });
      }

      const data = phonemeMap.get(name)!;
      const devValue = deviation.afterDeviation ?? deviation.beforeDeviation;
      if (devValue !== null && Math.abs(devValue) > 5) {
        data.count++;
        data.deviationSum += Math.abs(devValue);
      }
    });

    return Array.from(phonemeMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgDeviation: data.count > 0 ? data.deviationSum / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [allDeviations]);

  const improvements = useMemo((): ImprovementData[] => {
    const result: ImprovementData[] = [];

    records.forEach((record) => {
      record.tuningHistory.forEach((tuning) => {
        if (tuning.phonemeDeviations && tuning.phonemeDeviations.length > 0) {
          const validDevs = tuning.phonemeDeviations.filter(
            (d) => d.beforeDeviation !== null && d.afterDeviation !== null
          );

          if (validDevs.length > 0) {
            const avgBefore = validDevs.reduce((sum, d) => sum + Math.abs(d.beforeDeviation!), 0) / validDevs.length;
            const avgAfter = validDevs.reduce((sum, d) => sum + Math.abs(d.afterDeviation!), 0) / validDevs.length;
            const improvement = avgBefore - avgAfter;

            if (improvement !== 0) {
              result.push({
                recordId: record.id,
                serialNumber: record.serialNumber,
                mode: record.mode,
                avgBefore,
                avgAfter,
                improvement,
                tuningDate: tuning.date,
              });
            }
          }
        }
      });
    });

    return result.sort((a, b) => b.improvement - a.improvement).slice(0, 10);
  }, [records]);

  const dailyCompletions = useMemo((): DailyCompletion[] => {
    const today = new Date();
    const last30Days: DailyCompletion[] = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last30Days.push({
        date: date.toISOString().split('T')[0],
        count: 0,
      });
    }

    const dateMap = new Map(last30Days.map((d) => [d.date, d]));

    records.forEach((record) => {
      record.tuningHistory.forEach((tuning) => {
        const tuningDate = tuning.date.split('T')[0];
        if (dateMap.has(tuningDate)) {
          dateMap.get(tuningDate)!.count++;
        }
      });
    });

    return last30Days;
  }, [records]);

  const anomalyRecords = useMemo((): AnomalyRecord[] => {
    const result: AnomalyRecord[] = [];

    allDeviations.forEach(({ record, tuning, deviation, phonemeIndex }) => {
      const devValue = deviation.afterDeviation ?? deviation.beforeDeviation;
      if (devValue !== null && Math.abs(devValue) >= 15) {
        let phonemeName = deviation.name;
        if (!phonemeName || phonemeName.trim() === '') {
          const names = getPhonemeNames(record, record.noteCount);
          phonemeName = names[phonemeIndex] || `音位 ${phonemeIndex}`;
        }

        result.push({
          recordId: record.id,
          serialNumber: record.serialNumber,
          mode: record.mode,
          maxDeviation: Math.abs(devValue),
          phonemeName,
          tuningDate: tuning.date,
        });
      }
    });

    return result.sort((a, b) => b.maxDeviation - a.maxDeviation).slice(0, 10);
  }, [allDeviations]);

  const stats = useMemo(() => {
    const totalRecords = records.length;
    const totalTunings = records.reduce((sum, r) => sum + r.tuningHistory.length, 0);
    const recordsWithDeviations = records.filter(
      (r) =>
        r.phonemeDeviations?.length ||
        r.tuningHistory.some((t) => t.phonemeDeviations?.length)
    ).length;
    const avgImprovement = improvements.length > 0
      ? improvements.reduce((sum, i) => sum + i.improvement, 0) / improvements.length
      : 0;
    const last30DaysTotal = dailyCompletions.reduce((sum, d) => sum + d.count, 0);

    return {
      totalRecords,
      totalTunings,
      recordsWithDeviations,
      avgImprovement,
      last30DaysTotal,
      anomalyCount: anomalyRecords.length,
    };
  }, [records, improvements, dailyCompletions, anomalyRecords]);

  const getDeviationColor = (value: number | null) => {
    if (value === null) return 'text-ink-400';
    const abs = Math.abs(value);
    if (abs <= 5) return 'text-green-600';
    if (abs <= 15) return 'text-amber-600';
    return 'text-red-600';
  };

  const getDeviationBgColor = (value: number | null) => {
    if (value === null) return 'bg-gray-100';
    const abs = Math.abs(value);
    if (abs <= 5) return 'bg-green-500';
    if (abs <= 15) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getBarWidth = (value: number, max: number) => {
    if (max === 0) return '0%';
    return `${Math.min((value / max) * 100, 100)}%`;
  };

  const maxModeDeviation = Math.max(
    ...modeDeviations.map((m) => Math.max(m.avgBeforeDeviation ?? 0, m.avgAfterDeviation ?? 0)),
    1
  );
  const maxPhonemeCount = Math.max(...frequentPhonemes.map((p) => p.count), 1);
  const maxDailyCount = Math.max(...dailyCompletions.map((d) => d.count), 1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[1400px] h-[90vh] max-h-[850px] overflow-hidden animate-scale-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-clay-100 h-full flex flex-col paper-texture">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-clay-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brass-400 to-brass-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink-500">调音质量分析看板</h2>
                <p className="text-sm text-ink-400">基于历史调音记录的质量统计分析</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-clay-50 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-white text-ink-500 shadow-sm'
                      : 'text-ink-400 hover:text-ink-500'
                  }`}
                >
                  总览
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'details'
                      ? 'bg-white text-ink-500 shadow-sm'
                      : 'text-ink-400 hover:text-ink-500'
                  }`}
                >
                  详细数据
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-ink-400 hover:text-ink-500 hover:bg-clay-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4 border-b border-clay-100 bg-clay-50/50 flex-shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white rounded-xl p-3 border border-clay-100">
                <div className="flex items-center gap-2 mb-1">
                  <Music className="w-4 h-4 text-ink-400" />
                  <span className="text-xs text-ink-400">手碟总数</span>
                </div>
                <p className="text-2xl font-bold text-ink-500">{stats.totalRecords}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-clay-100">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart className="w-4 h-4 text-ink-400" />
                  <span className="text-xs text-ink-400">调音次数</span>
                </div>
                <p className="text-2xl font-bold text-ink-500">{stats.totalTunings}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-clay-100">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-ink-400" />
                  <span className="text-xs text-ink-400">含偏差数据</span>
                </div>
                <p className="text-2xl font-bold text-brass-600">{stats.recordsWithDeviations}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-clay-100">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-ink-400" />
                  <span className="text-xs text-ink-400">平均改善</span>
                </div>
                <p className={`text-2xl font-bold ${stats.avgImprovement > 0 ? 'text-green-600' : 'text-ink-400'}`}>
                  {stats.avgImprovement > 0 ? `+${stats.avgImprovement.toFixed(1)}` : '-'}
                  <span className="text-sm font-normal ml-1">音分</span>
                </p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-clay-100">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-ink-400" />
                  <span className="text-xs text-ink-400">近30天</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{stats.last30DaysTotal}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-clay-100">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-ink-400" />
                  <span className="text-xs text-ink-400">异常记录</span>
                </div>
                <p className={`text-2xl font-bold ${stats.anomalyCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.anomalyCount}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {activeTab === 'overview' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-clay-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-ink-500 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-brass-500" />
                      不同调式的平均偏差
                    </h3>
                    <span className="text-xs text-ink-400">单位：音分</span>
                  </div>
                  {modeDeviations.length === 0 ? (
                    <div className="text-center py-8 text-ink-400">
                      <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂无调式偏差数据</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {modeDeviations.map((mode) => (
                        <div key={mode.mode} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-ink-600">
                              {mode.mode}
                              <span className="text-ink-400 text-xs ml-2">({mode.recordCount}条记录)</span>
                            </span>
                            <span className="text-xs text-ink-400">
                              {mode.avgBeforeDeviation !== null ? (
                                <span className={getDeviationColor(mode.avgBeforeDeviation)}>
                                  前: {mode.avgBeforeDeviation.toFixed(1)}
                                </span>
                              ) : (
                                <span>前: -</span>
                              )}
                              <span className="mx-2">→</span>
                              {mode.avgAfterDeviation !== null ? (
                                <span className={getDeviationColor(mode.avgAfterDeviation)}>
                                  后: {mode.avgAfterDeviation.toFixed(1)}
                                </span>
                              ) : (
                                <span>后: -</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 h-6">
                            <div className="flex-1 h-4 bg-clay-50 rounded-full overflow-hidden flex">
                              <div
                                className={`h-full ${getDeviationBgColor(mode.avgBeforeDeviation)} transition-all duration-500`}
                                style={{ width: getBarWidth(mode.avgBeforeDeviation ?? 0, maxModeDeviation * 2) }}
                              />
                              <div className="flex-1 h-full bg-clay-100" />
                            </div>
                            <div className="flex-1 h-4 bg-clay-50 rounded-full overflow-hidden flex">
                              <div
                                className={`h-full ${getDeviationBgColor(mode.avgAfterDeviation)} transition-all duration-500`}
                                style={{ width: getBarWidth(mode.avgAfterDeviation ?? 0, maxModeDeviation * 2) }}
                              />
                              <div className="flex-1 h-full bg-clay-100" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-ink-400">
                            <span className="inline-block w-3 h-3 rounded bg-amber-300" /> 调音前
                            <span className="inline-block w-3 h-3 rounded bg-green-300 ml-2" /> 调音后
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-clay-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-ink-500 flex items-center gap-2">
                      <Music className="w-4 h-4 text-brass-500" />
                      复调次数最多的音位
                    </h3>
                    <span className="text-xs text-ink-400">偏差＞5音分</span>
                  </div>
                  {frequentPhonemes.length === 0 || frequentPhonemes[0].count === 0 ? (
                    <div className="text-center py-8 text-ink-400">
                      <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂无音位偏差统计</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {frequentPhonemes.map((phoneme, index) => (
                        <div key={phoneme.name} className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index < 3 ? 'bg-brass-100 text-brass-700' : 'bg-clay-100 text-ink-500'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium text-ink-600">{phoneme.name}</span>
                              <span className="text-xs text-ink-400">
                                {phoneme.count}次 · 平均{phoneme.avgDeviation.toFixed(1)}音分
                              </span>
                            </div>
                            <div className="h-3 bg-clay-50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-brass-400 to-brass-500 rounded-full transition-all duration-500"
                                style={{ width: getBarWidth(phoneme.count, maxPhonemeCount) }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-clay-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-ink-500 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-brass-500" />
                      近30天调音完成量
                    </h3>
                    <span className="text-xs text-ink-400">共{stats.last30DaysTotal}次</span>
                  </div>
                  <div className="flex items-end gap-1 h-40">
                    {dailyCompletions.map((day, index) => (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-gradient-to-t from-blue-400 to-blue-500 rounded-t transition-all duration-300 hover:from-blue-500 hover:to-blue-600"
                          style={{
                            height: maxDailyCount > 0 ? `${Math.max((day.count / maxDailyCount) * 100, 5)}%` : '5%',
                            minHeight: '4px',
                          }}
                          title={`${day.date}: ${day.count}次`}
                        />
                        {index % 5 === 0 && (
                          <span className="text-[10px] text-ink-400 transform -rotate-45 origin-top-left">
                            {new Date(day.date).getDate()}日
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-clay-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-ink-500 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-brass-500" />
                      异常记录排行（≥15音分）
                    </h3>
                    <span className="text-xs text-ink-400">Top 10</span>
                  </div>
                  {anomalyRecords.length === 0 ? (
                    <div className="text-center py-8 text-ink-400">
                      <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂无异常偏差记录</p>
                      <p className="text-xs mt-1">当音位偏差≥15音分时会显示在这里</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto">
                      {anomalyRecords.map((anomaly, index) => (
                        <div
                          key={`${anomaly.recordId}-${anomaly.phonemeName}-${index}`}
                          className="flex items-center gap-3 p-2 rounded-lg bg-red-50 border border-red-100"
                        >
                          <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium text-ink-600">
                                {anomaly.serialNumber}
                              </span>
                              <span className="text-xs text-ink-400">{anomaly.mode}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-ink-500">{anomaly.phonemeName}</span>
                              <span className="text-red-600 font-mono font-bold">
                                {anomaly.maxDeviation.toFixed(1)}音分
                              </span>
                              <span className="text-ink-400">{anomaly.tuningDate}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-clay-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-ink-500 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-brass-500" />
                      调音前后改善幅度排行
                    </h3>
                    <span className="text-xs text-ink-400">按改善音分数排序</span>
                  </div>
                  {improvements.length === 0 ? (
                    <div className="text-center py-8 text-ink-400">
                      <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂无调音改善数据</p>
                      <p className="text-xs mt-1">需要同时记录调音前和调音后的偏差数据</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-clay-200">
                            <th className="text-left py-2 px-3 font-medium text-ink-500 bg-clay-50">排名</th>
                            <th className="text-left py-2 px-3 font-medium text-ink-500 bg-clay-50">编号</th>
                            <th className="text-left py-2 px-3 font-medium text-ink-500 bg-clay-50">调式</th>
                            <th className="text-center py-2 px-3 font-medium text-ink-500 bg-clay-50">调音前</th>
                            <th className="text-center py-2 px-3 font-medium text-ink-500 bg-clay-50">调音后</th>
                            <th className="text-center py-2 px-3 font-medium text-ink-500 bg-clay-50">改善幅度</th>
                            <th className="text-left py-2 px-3 font-medium text-ink-500 bg-clay-50">调音日期</th>
                          </tr>
                        </thead>
                        <tbody>
                          {improvements.map((item, index) => (
                            <tr key={`${item.recordId}-${item.tuningDate}`} className="border-b border-clay-100 hover:bg-clay-50/50">
                              <td className="py-2 px-3">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                  index < 3 ? 'bg-green-100 text-green-700' : 'bg-clay-100 text-ink-500'
                                }`}>
                                  {index + 1}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-ink-600">{item.serialNumber}</td>
                              <td className="py-2 px-3 text-ink-600">{item.mode}</td>
                              <td className={`py-2 px-3 text-center font-mono ${getDeviationColor(item.avgBefore)}`}>
                                {item.avgBefore.toFixed(1)}
                              </td>
                              <td className={`py-2 px-3 text-center font-mono ${getDeviationColor(item.avgAfter)}`}>
                                {item.avgAfter.toFixed(1)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="inline-flex items-center gap-1 text-green-600 font-mono font-bold">
                                  {item.improvement > 0 ? (
                                    <>
                                      <Minus className="w-3 h-3" />
                                      {item.improvement.toFixed(1)}
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3" />
                                      {Math.abs(item.improvement).toFixed(1)}
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-ink-400">{item.tuningDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-clay-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-ink-500 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-brass-500" />
                      调式平均偏差详情
                    </h3>
                    <span className="text-xs text-ink-400">基于最新调音记录</span>
                  </div>
                  {modeDeviations.length === 0 ? (
                    <div className="text-center py-8 text-ink-400">
                      <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂无调式偏差数据</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-clay-200">
                            <th className="text-left py-2 px-3 font-medium text-ink-500 bg-clay-50">调式</th>
                            <th className="text-center py-2 px-3 font-medium text-ink-500 bg-clay-50">记录数</th>
                            <th className="text-center py-2 px-3 font-medium text-ink-500 bg-clay-50">有效偏差数</th>
                            <th className="text-center py-2 px-3 font-medium text-ink-500 bg-clay-50">平均调音前偏差</th>
                            <th className="text-center py-2 px-3 font-medium text-ink-500 bg-clay-50">平均调音后偏差</th>
                            <th className="text-center py-2 px-3 font-medium text-ink-500 bg-clay-50">平均改善</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modeDeviations.map((mode) => {
                            const before = mode.avgBeforeDeviation;
                            const after = mode.avgAfterDeviation;
                            const improvement = before !== null && after !== null ? before - after : null;
                            return (
                              <tr key={mode.mode} className="border-b border-clay-100 hover:bg-clay-50/50">
                                <td className="py-2 px-3 font-medium text-ink-600">{mode.mode}</td>
                                <td className="py-2 px-3 text-center text-ink-500">{mode.recordCount}</td>
                                <td className="py-2 px-3 text-center text-ink-500">{mode.validDeviationCount}</td>
                                <td className={`py-2 px-3 text-center font-mono ${getDeviationColor(before)}`}>
                                  {before !== null ? before.toFixed(1) : '-'}
                                </td>
                                <td className={`py-2 px-3 text-center font-mono ${getDeviationColor(after)}`}>
                                  {after !== null ? after.toFixed(1) : '-'}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {improvement !== null ? (
                                    <span className={`inline-flex items-center gap-1 font-mono font-bold ${
                                      improvement > 0 ? 'text-green-600' : improvement < 0 ? 'text-red-600' : 'text-ink-400'
                                    }`}>
                                      {improvement > 0 ? (
                                        <>
                                          <TrendingDown className="w-3 h-3" />
                                          {improvement.toFixed(1)}
                                        </>
                                      ) : improvement < 0 ? (
                                        <>
                                          <TrendingUp className="w-3 h-3" />
                                          +{Math.abs(improvement).toFixed(1)}
                                        </>
                                      ) : (
                                        '0'
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-ink-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-clay-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-ink-400" />
                    <h4 className="text-sm font-medium text-ink-500">数据说明</h4>
                  </div>
                  <ul className="text-xs text-ink-400 space-y-1">
                    <li>• 偏差单位为音分（cent），正值表示偏高，负值表示偏低</li>
                    <li>• 偏差绝对值≤5音分为优秀，6-15音分为良好，＞15音分为需注意</li>
                    <li>• 改善幅度为调音前平均偏差减去调音后平均偏差，正值表示变好</li>
                    <li>• 部分历史记录可能缺少音位偏差数据，已自动跳过统计</li>
                    <li>• 缺少音位名称时，使用"音位 N"作为默认名称</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="px-4 sm:px-6 py-3 border-t border-clay-100 bg-clay-50/50 flex-shrink-0">
            <div className="flex items-center justify-between text-xs text-ink-400">
              <div className="flex items-center gap-4">
                <span>
                  统计时间：{new Date().toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-500"></span>
                  <span>≤5音分</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-amber-500"></span>
                  <span>6-15音分</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-500"></span>
                  <span>＞15音分</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
