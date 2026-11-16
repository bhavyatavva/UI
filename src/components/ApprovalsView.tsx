import React, { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  Lock,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { ApprovalStage, NavView, StakeholderRole } from '../types/basel';
import { BaselComputedMetrics, formatINRCr, formatPct } from '../utils/baselCalculations';

interface ApprovalsViewProps {
  stages: ApprovalStage[];
  currentRole: StakeholderRole;
  metrics: BaselComputedMetrics;
  reportingDate: string;
  criticalBreaksCount: number;
  reconBreakCount: number;
  autoBlockEnabled: boolean;
  simpleGuide: boolean;
  onApproveStage: (stageId: string, comment: string) => void;
  onReturnStage: (stageId: string, comment: string) => void;
  onNavigate: (view: NavView) => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  stages,
  currentRole,
  metrics,
  reportingDate,
  criticalBreaksCount,
  reconBreakCount,
  autoBlockEnabled,
  simpleGuide,
  onApproveStage,
  onReturnStage,
  onNavigate,
}) => {
  const [comments, setComments] = useState<Record<string, string>>({});

  const isPublishBlocked = autoBlockEnabled && (criticalBreaksCount > 0 || reconBreakCount > 0);
  const allApproved = stages.every((s) => s.status === 'Approved');
  const approvedCount = stages.filter((s) => s.status === 'Approved').length;
  const activeStage = stages.find((s) => s.status === 'Pending');

  return (
    <div className="space-y-6">
      {/* Live Pack Snapshot Being Reviewed */}
      <section className="bg-[#0B1F3A] text-white rounded-xl p-6 border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <div className="text-xs font-medium text-blue-300">
              Daily Filing · {reportingDate}
            </div>
            <h1 className="font-display text-xl font-bold text-white mt-1 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-emerald-300" />
              <span>5-Stage Review &amp; Approvals Board</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Inspect Full Report Schedules</span>
            </button>
            <div className="px-3.5 py-2 rounded-lg bg-white/10 font-mono text-xs font-bold text-emerald-300">
              {approvedCount}/5 Stages Signed
            </div>
          </div>
        </div>

        {/* 4 Key Figures Under Review */}
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-white/5 border border-white/10">
            <div className="text-xs text-slate-300">Safety Ratio (CRAR)</div>
            <div className="font-mono text-lg font-bold text-white mt-0.5">
              {formatPct(metrics.crarPct)}
            </div>
            <div className="text-[11px] text-emerald-300">
              {metrics.complianceChecks.crarOk ? 'Safe (Above Min)' : 'Check Needed'}
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-white/5 border border-white/10">
            <div className="text-xs text-slate-300">Core Cash (CET1)</div>
            <div className="font-mono text-lg font-bold text-white mt-0.5">
              {formatPct(metrics.cet1RatioPct)}
            </div>
            <div className="text-[11px] text-emerald-300">Risk Score {formatINRCr(metrics.bindingRwaCr, 0)}</div>
          </div>
          <div className="p-3.5 rounded-lg bg-white/5 border border-white/10">
            <div className="text-xs text-slate-300">30-Day Cash (LCR)</div>
            <div className="font-mono text-lg font-bold text-white mt-0.5">
              {formatPct(metrics.lcrPct)}
            </div>
            <div className="text-[11px] text-emerald-300">Cash Safe</div>
          </div>
          <div className="p-3.5 rounded-lg bg-white/5 border border-white/10">
            <div className="text-xs text-slate-300">Open Errors</div>
            <div
              className={`font-mono text-lg font-bold mt-0.5 ${
                criticalBreaksCount + reconBreakCount > 0 ? 'text-amber-300' : 'text-emerald-300'
              }`}
            >
              {criticalBreaksCount + reconBreakCount} Open
            </div>
            <div className="text-[11px] text-slate-300">
              {criticalBreaksCount} Data · {reconBreakCount} Ledger
            </div>
          </div>
        </div>

        {/* Visual 5-Step Relay Track */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          {stages.map((s) => (
            <div
              key={s.id}
              className={`p-3 rounded-lg border text-xs ${
                s.status === 'Approved'
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-100'
                  : s.status === 'Pending'
                  ? 'bg-blue-900/60 border-blue-400 text-white'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              <div className="font-mono text-[11px] font-bold">
                Step 0{s.order} · {s.status}
              </div>
              <div className="font-semibold mt-1 truncate">{s.requiredRoleTitle}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Publication Gate Banner */}
      {isPublishBlocked ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertOctagon className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-red-900">
                Final RBI Publication Gate is Locked
              </div>
              <p className="text-xs text-red-700 mt-0.5">
                {criticalBreaksCount > 0 && `${criticalBreaksCount} Critical Data Quality Break open. `}
                {reconBreakCount > 0 && `${reconBreakCount} GL Reconciliation Variance open. `}
                Clear those open items first so Stage 5 can publish to RBI.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {criticalBreaksCount > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('quality')}
                className="px-3.5 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold cursor-pointer"
              >
                Fix Quality Break &rarr;
              </button>
            )}
            {reconBreakCount > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('reconciliation')}
                className="px-3.5 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold cursor-pointer"
              >
                Fix GL Variance &rarr;
              </button>
            )}
          </div>
        </div>
      ) : allApproved ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
            <div>
              <div className="text-sm font-bold text-emerald-900">
                Daily Filing Run Published to Reserve Bank of India (RBI)!
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                All 5 Maker-Checker stages are certified. The report is now live in the RBI
                Supervisory Portal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('rbi-portal')}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer shrink-0"
          >
            View in RBI Portal &rarr;
          </button>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-3 text-xs font-semibold text-emerald-900">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
            All Critical Data &amp; GL Gates Clear · Next Action: {activeStage?.requiredRoleTitle}
          </span>
        </div>
      )}

      {/* 5-Stage Detailed Sign-Off Cards */}
      <section className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              5-Step Sign-Off Checklist
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Signed in as: <strong>{currentRole.personName}</strong> ({currentRole.title})
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Segregation of Duties Enforced
          </span>
        </div>

        {stages.map((stage) => {
          const isRoleMatch = currentRole.id === stage.requiredRoleId;
          const isFinalStage = stage.order === 5;
          const blockedByGate = isFinalStage && isPublishBlocked;
          const canAct = stage.status === 'Pending' && isRoleMatch && !blockedByGate;

          return (
            <div
              key={stage.id}
              className={`p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${
                stage.status === 'Pending' ? 'bg-blue-50/30' : ''
              }`}
            >
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="font-mono font-bold text-blue-700">Stage 0{stage.order}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-600 font-medium">
                    Signer Required: <strong>{stage.requiredRoleTitle}</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-semibold ${
                      stage.status === 'Approved'
                        ? 'text-emerald-700'
                        : stage.status === 'Pending'
                        ? 'text-blue-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {stage.status}
                  </span>
                </div>

                <h3 className="font-display text-base font-bold text-slate-900">
                  {stage.stageName}
                </h3>

                {stage.status === 'Approved' && (
                  <div className="pt-1 text-xs text-emerald-800 font-medium">
                    Signed by {stage.approvedBy} at {stage.approvedAt}
                    {stage.comment && ` — "${stage.comment}"`}
                  </div>
                )}
              </div>

              <div className="shrink-0 w-full lg:w-auto">
                {stage.status === 'Approved' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Certified
                  </span>
                )}

                {stage.status === 'Waiting' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <Clock className="h-4 w-4" />
                    Waiting for Stage 0{stage.order - 1}
                  </span>
                )}

                {stage.status === 'Pending' && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    {isRoleMatch ? (
                      <>
                        <input
                          type="text"
                          value={comments[stage.id] || ''}
                          onChange={(e) =>
                            setComments((prev) => ({ ...prev, [stage.id]: e.target.value }))
                          }
                          placeholder="Add review note (optional)..."
                          className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg min-w-[200px]"
                        />
                        <button
                          type="button"
                          disabled={!canAct}
                          onClick={() =>
                            onApproveStage(
                              stage.id,
                              comments[stage.id]?.trim() ||
                                `${stage.stageName} verified and approved.`
                            )
                          }
                          className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${
                            blockedByGate
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-[#0B1F3A] hover:bg-[#132E54] text-white cursor-pointer'
                          }`}
                        >
                          {blockedByGate ? (
                            <>
                              <Lock className="h-3.5 w-3.5" />
                              <span>Blocked by Open Break</span>
                            </>
                          ) : isFinalStage ? (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              <span>Certify &amp; Publish to RBI</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Approve Stage {stage.order}</span>
                            </>
                          )}
                        </button>
                        {stage.order > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              onReturnStage(
                                stage.id,
                                comments[stage.id]?.trim() ||
                                  `Returned from ${stage.stageName} for Maker correction.`
                              )
                            }
                            className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            Return
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs font-medium text-amber-800 whitespace-nowrap">
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Requires sign-in as {stage.requiredRoleTitle} (Sign Out to switch user)
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};
