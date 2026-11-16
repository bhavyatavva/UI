import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileCheck2,
  FileDown,
  Landmark,
  MessageSquarePlus,
  Paperclip,
  ShieldCheck,
} from 'lucide-react';
import { RegulatorQuery, RegulatoryReport, StakeholderRole } from '../types/basel';
import { downloadCsv, downloadReportPdf } from '../utils/baselCalculations';

interface RbiPortalViewProps {
  reports: RegulatoryReport[];
  queries: RegulatorQuery[];
  currentRole: StakeholderRole;
  simpleGuide: boolean;
  onRaiseQuery: (reportCode: string, subject: string, question: string, priority: 'High' | 'Standard') => void;
  onRespondQuery: (queryId: string, responseText: string, attachmentName: string, closeNow: boolean) => void;
}

export const RbiPortalView: React.FC<RbiPortalViewProps> = ({
  reports,
  queries,
  currentRole,
  simpleGuide,
  onRaiseQuery,
  onRespondQuery,
}) => {
  // Business Rule #1: Only approved and certified regulatory reports are visible in RBI Portal
  const publishedReports = reports.filter((r) => r.status === 'Published to RBI');
  const [selectedReportId, setSelectedReportId] = useState<string>(publishedReports[0]?.id || '');

  // New Query Form (FR-11)
  const [showNewQuery, setShowNewQuery] = useState(false);
  const [qReportCode, setQReportCode] = useState(publishedReports[0]?.code || 'RBI-RCA3-B4');
  const [qSubject, setQSubject] = useState('');
  const [qText, setQText] = useState('');
  const [qPriority, setQPriority] = useState<'High' | 'Standard'>('Standard');

  // Response Drafts
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [attachmentDrafts, setAttachmentDrafts] = useState<Record<string, string>>({});

  const activeReport =
    publishedReports.find((r) => r.id === selectedReportId) || publishedReports[0];

  const handleSubmitNewQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qSubject.trim() || !qText.trim()) return;
    onRaiseQuery(qReportCode, qSubject.trim(), qText.trim(), qPriority);
    setQSubject('');
    setQText('');
    setShowNewQuery(false);
  };

  const handleDownloadCertifiedPack = (report: RegulatoryReport) => {
    const headers = ['Schedule', 'Particulars', 'Certified Value', 'RBI Benchmark', 'Status'];
    const rows = report.rows.map((r) => [
      r.scheduleCode,
      r.particulars,
      r.amountOrRatio,
      r.rbiBenchmark,
      r.complianceStatus,
    ]);
    downloadCsv(`RBI_CERTIFIED_${report.code}_${report.reportDate}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* RBI Supervisory Vault Header */}
      <section className="bg-[#0B1F3A] text-white rounded-xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Landmark className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <div className="text-xs font-medium text-blue-300">
              Reserve Bank of India (RBI) · Department of Supervision
            </div>
            <h1 className="font-display text-xl font-bold text-white mt-0.5">
              Certified Regulatory Report Vault
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              {publishedReports.length} Certified Filings · HDFC Bank (Regulator: RBI)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowNewQuery((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#0B1F3A] hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer shrink-0 self-start md:self-auto"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span>Raise RBI Query</span>
        </button>
      </section>

      {/* New Supervisory Query Form */}
      {showNewQuery && (
        <form
          onSubmit={handleSubmitNewQuery}
          className="bg-white border border-blue-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">
              Log New Supervisory Query to HDFC Bank
            </h2>
            <button
              type="button"
              onClick={() => setShowNewQuery(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Report Code
              </label>
              <select
                value={qReportCode}
                onChange={(e) => setQReportCode(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="RBI-RCA3-B4">RBI-RCA3-B4 (Capital &amp; Output Floor)</option>
                <option value="RBI-BLR1-LCR">RBI-BLR1-LCR (Liquidity &amp; NSFR)</option>
                <option value="RBI-LR1-LEV">RBI-LR1-LEV (Leverage Ratio)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={qPriority}
                onChange={(e) => setQPriority(e.target.value as 'High' | 'Standard')}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="Standard">Standard (48h SLA)</option>
                <option value="High">High (Same-Day Supervisory)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                required
                value={qSubject}
                onChange={(e) => setQSubject(e.target.value)}
                placeholder="e.g. Corporate RWA variance check"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supervisory Question
            </label>
            <textarea
              rows={2}
              required
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Enter specific question for HDFC Bank Compliance & Risk team..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold cursor-pointer"
            >
              Submit Query to Bank
            </button>
          </div>
        </form>
      )}

      {/* Published Certified Reports + Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-semibold text-slate-500 px-1">
            Approved &amp; Published Filings ({publishedReports.length})
          </div>
          {publishedReports.map((rep) => {
            const isSelected = rep.id === activeReport?.id;
            return (
              <button
                key={rep.id}
                type="button"
                onClick={() => setSelectedReportId(rep.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-white border-blue-600 ring-1 ring-blue-600'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-blue-700">{rep.code}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Certified
                  </span>
                </div>
                <div className="mt-1.5 font-display text-sm font-bold text-slate-900">
                  {rep.title}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{rep.reportDate}</span>
                  <span>{rep.keyMetricValue}</span>
                </div>
              </button>
            );
          })}
        </div>

        {activeReport && (
          <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                  <FileCheck2 className="h-4 w-4" />
                  <span>Certified Filing · {activeReport.publishedAt}</span>
                </div>
                <h2 className="font-display text-lg font-bold text-slate-900 mt-1">
                  {activeReport.title}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadReportPdf(activeReport)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B1F3A] text-white text-xs font-semibold cursor-pointer"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>Download Report as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadCertifiedPack(activeReport)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                Approved By: <strong className="text-slate-900">{activeReport.publishedBy}</strong>
              </div>
              <div className="font-mono sm:text-right">
                Evidence Hash: {activeReport.evidenceHash}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4">Particulars</th>
                    <th className="py-3 px-4 text-right">Certified Value</th>
                    <th className="py-3 px-4">RBI Benchmark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {activeReport.rows.map((r) => (
                    <tr key={r.scheduleCode}>
                      <td className="py-3 px-4 font-mono text-slate-600">{r.scheduleCode}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{r.particulars}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                        {r.amountOrRatio}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{r.rbiBenchmark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-emerald-50/50 border-t border-slate-200 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
              <span>Supporting Evidence Attached: OFSAA GL Match Certificate · Data Lineage Snapshot</span>
              <span className="font-mono font-semibold">{activeReport.version}</span>
            </div>
          </section>
        )}
      </div>

      {/* FR-11 Supervisory Query Management */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-display text-base font-bold text-slate-900">
            RBI Supervisory Query Tracker
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track, attach supporting evidence, and close official questions from RBI examiners.
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {queries.map((q) => (
            <div key={q.id} className="p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-blue-700">{q.id}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-slate-600">{q.reportCode}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-semibold ${
                      q.priority === 'High' ? 'text-red-700' : 'text-slate-600'
                    }`}
                  >
                    {q.priority} Priority
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-500">Raised by {q.raisedBy}</span>
                </div>
                <span
                  className={`font-semibold ${
                    q.status === 'Closed' ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {q.status} (Due {q.dueDate})
                </span>
              </div>

              <h3 className="font-display text-base font-bold text-slate-900">{q.subject}</h3>
              <p className="text-sm text-slate-700">{q.plainQuestion}</p>

              {q.responseText ? (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="font-semibold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      Response by {q.respondedBy} ({q.respondedAt})
                    </span>
                  </div>
                  <p className="text-slate-700">{q.responseText}</p>
                  {q.attachmentName && (
                    <div className="inline-flex items-center gap-1.5 font-mono text-blue-700 pt-1">
                      <Paperclip className="h-3.5 w-3.5" />
                      <span>{q.attachmentName}</span>
                    </div>
                  )}
                </div>
              ) : (
                !currentRole.isRegulator && (
                  <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={replyDrafts[q.id] || ''}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      placeholder="Write official bank response & justification..."
                      className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      value={attachmentDrafts[q.id] || ''}
                      onChange={(e) =>
                        setAttachmentDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      placeholder="Evidence filename (e.g. IRB_Floor_Memo.pdf)"
                      className="sm:w-56 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const text = replyDrafts[q.id]?.trim();
                        if (!text) return;
                        onRespondQuery(
                          q.id,
                          text,
                          attachmentDrafts[q.id]?.trim() || 'HDFC_Supporting_Schedule.pdf',
                          true
                        );
                      }}
                      className="px-4 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                    >
                      Send &amp; Close Query
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
