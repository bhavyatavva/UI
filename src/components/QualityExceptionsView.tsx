import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  Filter,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ExceptionBreak, SourceFeed, StakeholderRole, ValidationRule } from '../types/basel';
import { formatINRCr, formatNumberIN } from '../utils/baselCalculations';

interface QualityExceptionsViewProps {
  rules: ValidationRule[];
  exceptions: ExceptionBreak[];
  feeds: SourceFeed[];
  currentRole: StakeholderRole;
  simpleGuide: boolean;
  onResolveException: (
    exceptionId: string,
    action: 'Resolved' | 'Overridden',
    reasonCode: string,
    note: string
  ) => void;
  onCreateException: (ex: {
    title: string;
    sourceSystem: string;
    severity: 'Critical' | 'Warning';
    impactCr: number;
    plainWhy: string;
    plainFix: string;
  }) => void;
  onToggleRule: (ruleId: string) => void;
}

const REASON_CODES = [
  { code: 'RC-VAL-01', label: 'RC-VAL-01 · Verified CERSAI Fallback 75% Risk Weight' },
  { code: 'RC-RAT-02', label: 'RC-RAT-02 · Unrated 100% Conservative Weight Applied' },
  { code: 'RC-SLA-03', label: 'RC-SLA-03 · Late Feed Verified 100% Complete' },
  { code: 'RC-GL-04', label: 'RC-GL-04 · Timing Difference Documented for EOD' },
];

export const QualityExceptionsView: React.FC<QualityExceptionsViewProps> = ({
  rules,
  exceptions,
  feeds,
  currentRole,
  simpleGuide,
  onResolveException,
  onCreateException,
  onToggleRule,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closed'>('All');
  const [systemFilter, setSystemFilter] = useState<string>('All');
  const [lastScanTime, setLastScanTime] = useState<string>('08:15:00 IST');
  const [selectedBreak, setSelectedBreak] = useState<ExceptionBreak | null>(null);
  const [reasonCode, setReasonCode] = useState<string>(REASON_CODES[0].code);
  const [note, setNote] = useState<string>('');
  const [actionType, setActionType] = useState<'Resolved' | 'Overridden'>('Resolved');
  const [formError, setFormError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newExTitle, setNewExTitle] = useState('');
  const [newExSystem, setNewExSystem] = useState(feeds[0]?.systemName || 'Finacle Core Banking (CBS)');
  const [newExSeverity, setNewExSeverity] = useState<'Critical' | 'Warning'>('Warning');
  const [newExImpact, setNewExImpact] = useState('15.5');
  const [newExWhy, setNewExWhy] = useState('');
  const [newExFix, setNewExFix] = useState('Verify record fields with source system owner and re-run validation.');

  const openBreaks = exceptions.filter((e) => e.status === 'Open');
  const openCriticalCount = openBreaks.filter((e) => e.severity === 'Critical').length;

  // Live Data Quality Metrics calculated from rules, feeds, and exceptions
  const totalChecked = rules.reduce((a, r) => a + r.checkedRecords, 0);
  const totalFailed = openBreaks.length === 0 ? 0 : rules.reduce((a, r) => a + r.failedRecords, 0);
  const avgCompleteness =
    feeds.reduce((a, f) => a + f.completenessPct, 0) / Math.max(feeds.length, 1);
  const accuracyPct =
    totalChecked > 0 ? Math.max(95, ((totalChecked - totalFailed) / totalChecked) * 100) : 100;
  const timelinessPct =
    (feeds.filter((f) => f.status === 'Loaded').length / Math.max(feeds.length, 1)) * 100;
  const validationPassPct =
    (rules.filter((r) => r.failedRecords === 0 || openBreaks.length === 0).length /
      Math.max(rules.length, 1)) *
    100;

  const filteredExceptions = exceptions.filter((ex) => {
    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Open'
        ? ex.status === 'Open'
        : ex.status !== 'Open';
    const matchesSystem = systemFilter === 'All' || ex.sourceSystem === systemFilter;
    return matchesStatus && matchesSystem;
  });

  const handleRunRealTimeScan = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    setLastScanTime(`${hh}:${mm}:${ss} IST`);
  };

  const handleConfirmResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBreak) return;
    if (!note.trim() || note.trim().length < 6) {
      setFormError('Please enter a short explanation (at least 6 characters) for the audit log.');
      return;
    }
    onResolveException(selectedBreak.id, actionType, reasonCode, note.trim());
    setSelectedBreak(null);
    setNote('');
    setFormError(null);
  };

  const qualityGauges = [
    {
      label: 'No Missing Data',
      value: avgCompleteness,
      detail: 'Mandatory loan fields present',
      color: '#15803D',
    },
    {
      label: 'Accurate Numbers',
      value: accuracyPct,
      detail: `${totalFailed} flagged of ${formatNumberIN(totalChecked)}`,
      color: accuracyPct >= 99.9 ? '#15803D' : '#1D4ED8',
    },
    {
      label: 'On-Time Files (SLA)',
      value: timelinessPct,
      detail: `${feeds.filter((f) => f.status === 'Loaded').length}/${feeds.length} feeds on time`,
      color: timelinessPct === 100 ? '#15803D' : '#B45309',
    },
    {
      label: 'Rules Passed',
      value: validationPassPct,
      detail: `${openBreaks.length} open issues`,
      color: openCriticalCount > 0 ? '#B91C1C' : '#15803D',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Real-Time Data Quality Visual Gauges (HTML5 + SVG) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-700" />
              <span>Real-Time Data Quality &amp; Exception Dashboard</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Last automated scan: <span className="font-mono font-semibold">{lastScanTime}</span> ·
              Click any source system bar to drill down into exceptions.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunRealTimeScan}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Run Live Quality Scan</span>
          </button>
        </div>

        {/* 4 SVG Radial Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {qualityGauges.map((g) => {
            const radius = 26;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (Math.min(100, g.value) / 100) * circumference;
            return (
              <div
                key={g.label}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-4"
              >
                <svg className="h-16 w-16 shrink-0 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="6"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    fill="none"
                    stroke={g.color}
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-600">{g.label}</div>
                  <div className="font-mono text-xl font-bold tabular-nums text-slate-900">
                    {g.value.toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-500 leading-snug mt-0.5">{g.detail}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Source System Quality Bar Chart (Drill-Down Filter) */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-slate-800">
              Source System Completeness &amp; Open Break Drill-Down
            </div>
            {systemFilter !== 'All' && (
              <button
                type="button"
                onClick={() => setSystemFilter('All')}
                className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Clear System Filter ({systemFilter})
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {feeds.map((feed) => {
              const feedBreaks = openBreaks.filter((b) => b.sourceSystem === feed.systemName).length;
              const isSelected = systemFilter === feed.systemName;
              return (
                <button
                  key={feed.id}
                  type="button"
                  onClick={() =>
                    setSystemFilter((prev) =>
                      prev === feed.systemName ? 'All' : feed.systemName
                    )
                  }
                  className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-900 truncate">{feed.systemName}</span>
                    <span
                      className={`font-mono font-semibold shrink-0 ${
                        feedBreaks > 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {feedBreaks > 0 ? `${feedBreaks} Open` : 'Clean'}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        feedBreaks > 0
                          ? 'bg-amber-500'
                          : feed.status === 'Delayed'
                          ? 'bg-blue-600'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${feed.completenessPct}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Completeness: {feed.completenessPct}%</span>
                    <span>Status: {feed.status}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Critical Gate Alert */}
      {openCriticalCount > 0 ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertOctagon className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-red-900">
                RBI Publication Locked: {openCriticalCount} Critical Validation Break Open
              </div>
              <p className="text-xs text-red-700 mt-0.5">
                Per RBI governance policy, critical breaks block final report publication until
                resolved or overridden with Maker-Checker audit evidence.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-semibold text-red-800 shrink-0">
            Gate: BLOCKED
          </span>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
            <div className="text-sm font-semibold text-emerald-900">
              All Critical Validation Gates Passed · Ready for Approval Sign-Off
            </div>
          </div>
          <span className="font-mono text-xs font-semibold text-emerald-800 shrink-0">
            Gate: CLEAR
          </span>
        </div>
      )}

      {/* FR-09 Exception Management Queue */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Exception &amp; Break Drill-Down Queue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {systemFilter !== 'All'
                ? `Showing issues for ${systemFilter}`
                : 'Showing issues across all bank source systems'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Validation Issue / Exception</span>
            </button>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['All', 'Open', 'Closed'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredExceptions.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              <Filter className="h-6 w-6 mx-auto mb-2 text-slate-400" />
              No exceptions match the selected system or status filter.
            </div>
          ) : (
            filteredExceptions.map((ex) => (
              <div
                key={ex.id}
                className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                <div className="space-y-2 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-slate-700">{ex.id}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-semibold ${
                        ex.severity === 'Critical' ? 'text-red-700' : 'text-amber-700'
                      }`}
                    >
                      {ex.severity}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-500">{ex.sourceSystem}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-slate-600">
                      Ageing: {ex.ageingHours.toFixed(1)} hrs
                    </span>
                    {ex.impactCr > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-semibold text-slate-800">
                          Impact: {formatINRCr(ex.impactCr)}
                        </span>
                      </>
                    )}
                  </div>

                  <h3 className="font-display text-base font-bold text-slate-900">{ex.title}</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="font-semibold text-slate-700">Why it happened</div>
                      <p className="mt-1 text-slate-600 leading-relaxed">{ex.plainWhy}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="font-semibold text-slate-700">Recommended Fix</div>
                      <p className="mt-1 text-slate-600 leading-relaxed">{ex.plainFix}</p>
                    </div>
                  </div>

                  {ex.status !== 'Open' && (
                    <div className="pt-1 text-xs text-emerald-800 font-medium">
                      {ex.status} by {ex.resolvedBy} ({ex.resolvedAt}) · Reason:{' '}
                      <span className="font-mono">{ex.reasonCode}</span> — {ex.resolutionNote}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {ex.status === 'Open' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBreak(ex);
                        setActionType('Resolved');
                        setNote('');
                        setFormError(null);
                      }}
                      className="px-4 py-2.5 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Fix / Override Break
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      {ex.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* FR-02 Automated Validation Rules Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-display text-base font-bold text-slate-900">
            Automated Data Quality Rules
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            6 rule categories checked automatically every morning before Basel IV math runs.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Rule</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Checked</th>
                <th className="py-3 px-4 text-right">Failed</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4 text-right">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">
                      <span className="font-mono text-slate-500 mr-2">{rule.id}</span>
                      {rule.name}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">{rule.category}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {formatNumberIN(rule.checkedRecords)}
                  </td>
                  <td
                    className={`py-3.5 px-4 text-right font-mono tabular-nums font-semibold ${
                      rule.failedRecords > 0 ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    {formatNumberIN(rule.failedRecords)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-semibold ${
                        rule.severity === 'Critical' ? 'text-red-700' : 'text-amber-700'
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onToggleRule(rule.id)}
                      className={`px-3 py-1 rounded text-xs font-semibold border cursor-pointer ${
                        rule.enabled
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}
                    >
                      {rule.enabled ? 'Enabled' : 'Paused'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Controlled Override / Resolution Modal */}
      {selectedBreak && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-xs font-semibold text-blue-700">
                  {selectedBreak.id} · Controlled Resolution
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900 mt-1">
                  {selectedBreak.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBreak(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmResolution} className="mt-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Resolution Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Resolved', 'Overridden'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setActionType(mode)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer ${
                        actionType === mode
                          ? 'bg-blue-50 border-blue-600 text-blue-900'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      {mode === 'Resolved' ? 'Data Fixed (Resolve)' : 'Controlled Override'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="reason-code-select"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Mandatory Reason Code (Audit Control)
                </label>
                <select
                  id="reason-code-select"
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                >
                  {REASON_CODES.map((rc) => (
                    <option key={rc.code} value={rc.code}>
                      {rc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="resolution-note"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Audit Evidence / Explanation Note
                </label>
                <textarea
                  id="resolution-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., Applied 75% conservative LTV fallback risk weight per RBI circular."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-700 shrink-0" />
                <span>
                  Will be stamped under <strong>{currentRole.personName}</strong> (
                  {currentRole.title}) in the immutable audit trail.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBreak(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold cursor-pointer"
                >
                  Confirm &amp; Log Audit Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Exception / Validation Issue Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                Log New Data Quality / Operational Exception
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newExTitle.trim() || !newExWhy.trim()) return;
                onCreateException({
                  title: newExTitle.trim(),
                  sourceSystem: newExSystem,
                  severity: newExSeverity,
                  impactCr: Math.max(0, Number(newExImpact) || 0),
                  plainWhy: newExWhy.trim(),
                  plainFix: newExFix.trim() || 'Review with data owner.',
                });
                setNewExTitle('');
                setNewExWhy('');
                setCreateModalOpen(false);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Issue Title</label>
                <input
                  type="text"
                  required
                  value={newExTitle}
                  onChange={(e) => setNewExTitle(e.target.value)}
                  placeholder="e.g. Missing LEI Code on 6 Corporate Borrowers"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Source System</label>
                  <select
                    value={newExSystem}
                    onChange={(e) => setNewExSystem(e.target.value)}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {feeds.map((f) => (
                      <option key={f.id} value={f.systemName}>
                        {f.systemName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Severity</label>
                  <select
                    value={newExSeverity}
                    onChange={(e) => setNewExSeverity(e.target.value as 'Critical' | 'Warning')}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Warning">Warning</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Exposure Impact (₹ Cr)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newExImpact}
                  onChange={(e) => setNewExImpact(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Plain-English Problem Description
                </label>
                <textarea
                  rows={2}
                  required
                  value={newExWhy}
                  onChange={(e) => setNewExWhy(e.target.value)}
                  placeholder="Describe why this break happened..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0B1F3A] text-white font-semibold cursor-pointer"
                >
                  Log Exception
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
