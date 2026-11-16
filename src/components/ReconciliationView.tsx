import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSearch, Plus, Scale, X } from 'lucide-react';
import { ReconciliationRow, StakeholderRole } from '../types/basel';
import { formatINRCr } from '../utils/baselCalculations';

interface ReconciliationViewProps {
  rows: ReconciliationRow[];
  currentRole: StakeholderRole;
  simpleGuide: boolean;
  onResolveReconBreak: (rowId: string, reasonCode: string, note: string) => void;
  onAddReconciliation: (item: {
    lineItem: string;
    riskSourceSystem: string;
    glAccountCode: string;
    riskBalanceCr: number;
    glBalanceCr: number;
    toleranceCr: number;
  }) => void;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({
  rows,
  currentRole,
  simpleGuide,
  onResolveReconBreak,
  onAddReconciliation,
}) => {
  const [inspectRow, setInspectRow] = useState<ReconciliationRow | null>(null);
  const [reasonCode, setReasonCode] = useState('RC-GL-TIMING');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSystem, setNewSystem] = useState('Finacle Core Banking (CBS)');
  const [newGlCode, setNewGlCode] = useState('GL-130500');
  const [newRiskBal, setNewRiskBal] = useState('45000');
  const [newGlBal, setNewGlBal] = useState('45000');

  const totalRisk = rows.reduce((a, r) => a + r.riskBalanceCr, 0);
  const totalGl = rows.reduce((a, r) => a + r.glBalanceCr, 0);
  const netVariance = totalRisk - totalGl;
  const openBreakCount = rows.filter((r) => r.status === 'Variance Break').length;

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectRow) return;
    if (note.trim().length < 6) {
      setError('Please write a brief explanation (at least 6 characters) for Finance sign-off.');
      return;
    }
    onResolveReconBreak(inspectRow.id, reasonCode, note.trim());
    setInspectRow(null);
    setNote('');
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* 3-Way Match Summary Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Risk System Total</div>
          <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900">
            {formatINRCr(totalRisk)}
          </div>
          <div className="mt-1 text-xs text-slate-600">Finacle · CreditLens · Kondor+</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Bank Accounting Book (GL)</div>
          <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900">
            {formatINRCr(totalGl)}
          </div>
          <div className="mt-1 text-xs text-slate-600">Oracle OFSAA Ledger</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Book Difference (Variance)</div>
          <div
            className={`mt-1 font-mono text-xl font-bold tabular-nums ${
              Math.abs(netVariance) > 0.01 ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {formatINRCr(netVariance)}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {Math.abs(netVariance) > 0.01 ? 'Adjustment Needed' : 'Matched (Zero Diff)'}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Book Match Status</div>
          <div
            className={`mt-1 font-display text-xl font-bold ${
              openBreakCount > 0 ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {openBreakCount > 0 ? `${openBreakCount} Break Open` : 'All Books Matched'}
          </div>
          <div className="mt-1 text-xs text-slate-600">Finance Sign-Off Gate</div>
        </div>
      </section>

      {/* Reconciliation Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-700" />
              <span>Risk System vs Bank Accounting Book (GL)</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Reconciliation Check</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Portfolio / GL Account</th>
                <th className="py-3 px-4 text-right">Risk Source (₹ Cr)</th>
                <th className="py-3 px-4 text-right">Finance GL (₹ Cr)</th>
                <th className="py-3 px-4 text-right">Basel Report (₹ Cr)</th>
                <th className="py-3 px-4 text-right">Variance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rows.map((row) => {
                const variance = row.riskBalanceCr - row.glBalanceCr;
                return (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{row.lineItem}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {row.riskSourceSystem} ↔ {row.glAccountCode}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800">
                      {formatINRCr(row.riskBalanceCr)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800">
                      {formatINRCr(row.glBalanceCr)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900 font-semibold">
                      {formatINRCr(row.baselReportCr)}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono tabular-nums font-semibold ${
                        Math.abs(variance) > row.toleranceCr
                          ? 'text-red-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {formatINRCr(variance)}
                    </td>
                    <td className="py-3.5 px-4">
                      {row.status === 'Variance Break' ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Variance Break
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {row.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setInspectRow(row);
                          setNote(row.adjustmentNote || '');
                          setError(null);
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer whitespace-nowrap ${
                          row.status === 'Variance Break'
                            ? 'bg-[#0B1F3A] border-[#0B1F3A] text-white hover:bg-[#132E54]'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <FileSearch className="h-3.5 w-3.5" />
                        <span>
                          {row.status === 'Variance Break' ? 'Inspect & Reconcile' : 'View Details'}
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Drill-down & Reconciliation Modal */}
      {inspectRow && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-xs text-blue-700 font-semibold">
                  {inspectRow.id} · GL Reconciliation Drill-Down
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900 mt-1">
                  {inspectRow.lineItem}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectRow(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Risk Source</div>
                <div className="font-mono font-bold text-slate-900 mt-1">
                  {formatINRCr(inspectRow.riskBalanceCr)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Finance GL</div>
                <div className="font-mono font-bold text-slate-900 mt-1">
                  {formatINRCr(inspectRow.glBalanceCr)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Variance</div>
                <div className="font-mono font-bold text-amber-800 mt-1">
                  {formatINRCr(inspectRow.riskBalanceCr - inspectRow.glBalanceCr)}
                </div>
              </div>
            </div>

            {inspectRow.breakCause && (
              <div className="mt-4 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950">
                <div className="font-semibold">Root Cause Identified</div>
                <p className="mt-1 leading-relaxed">{inspectRow.breakCause}</p>
              </div>
            )}

            {inspectRow.status === 'Variance Break' ? (
              <form onSubmit={handleApplyAdjustment} className="mt-4 space-y-4">
                {error && (
                  <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="recon-reason"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    GL Adjustment Reason Code
                  </label>
                  <select
                    id="recon-reason"
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="RC-GL-TIMING">
                      RC-GL-TIMING · Align T+0 Coupon Accrual to Official GL EOD
                    </option>
                    <option value="RC-GL-RECLASS">
                      RC-GL-RECLASS · Account Mapping Reclassification Approved
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="recon-note"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Finance Certification Note
                  </label>
                  <textarea
                    id="recon-note"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g., Verified ₹ 18.40 Cr accrued G-Sec coupon timing entry; aligned Risk balance to OFSAA GL ₹ 98,500 Cr."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500">
                    Actor: {currentRole.personName}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectRow(null)}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold cursor-pointer"
                    >
                      Post Adjustment &amp; Match
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-semibold">
                  {inspectRow.resolvedBy
                    ? `Adjusted by ${inspectRow.resolvedBy} (${inspectRow.reasonCode})`
                    : 'Automatically matched within tolerance'}
                </span>
                <button
                  type="button"
                  onClick={() => setInspectRow(null)}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Reconciliation Check Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                Create New GL Reconciliation Check
              </h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newName.trim()) return;
                onAddReconciliation({
                  lineItem: newName.trim(),
                  riskSourceSystem: newSystem,
                  glAccountCode: newGlCode.trim() || 'GL-130500',
                  riskBalanceCr: Number(newRiskBal) || 0,
                  glBalanceCr: Number(newGlBal) || 0,
                  toleranceCr: 1.0,
                });
                setNewName('');
                setCreateOpen(false);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Portfolio / Comparison Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Agri & Rural Gold Loan Portfolio"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Risk System</label>
                  <input
                    type="text"
                    value={newSystem}
                    onChange={(e) => setNewSystem(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GL Account</label>
                  <input
                    type="text"
                    value={newGlCode}
                    onChange={(e) => setNewGlCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Risk Balance (₹ Cr)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRiskBal}
                    onChange={(e) => setNewRiskBal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Finance GL Balance (₹ Cr)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newGlBal}
                    onChange={(e) => setNewGlBal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                If Risk Balance and GL Balance differ by more than ₹ 1.00 Cr, the engine flags a
                Variance Break and automatically creates an Operational Exception.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0B1F3A] text-white font-semibold cursor-pointer"
                >
                  Run Reconciliation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
