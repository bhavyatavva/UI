import React, { useState } from 'react';
import { CheckCircle2, Download, FileDown, FileSpreadsheet, Plus, Printer, RefreshCw, Send, X } from 'lucide-react';
import { RegulatoryReport } from '../types/basel';
import {
  BaselComputedMetrics,
  downloadCsv,
  downloadReportPdf,
  formatINRCr,
  formatPct,
  isSignedOffRegulatoryReport,
  printSignedOffReportPdf,
} from '../utils/baselCalculations';

interface ReportsViewProps {
  reports: RegulatoryReport[];
  metrics: BaselComputedMetrics;
  criticalBreaksCount: number;
  simpleGuide: boolean;
  selectedReportId?: string;
  onSelectReport?: (reportId: string) => void;
  onRegenerateReports: () => void;
  onCreateReport: (item: { code: string; title: string; plainDesc: string }) => void;
  onSubmitReportForReview: (reportId: string) => void;
  onOpenApprovals?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  reports,
  metrics,
  criticalBreaksCount,
  selectedReportId: controlledSelectedId,
  onSelectReport,
  onRegenerateReports,
  onCreateReport,
  onSubmitReportForReview,
  onOpenApprovals,
}) => {
  const [localSelectedId, setLocalSelectedId] = useState<string>(reports[0]?.id || '');
  const selectedReportId = controlledSelectedId || localSelectedId;
  const setSelectedReportId = (id: string) => {
    setLocalSelectedId(id);
    if (onSelectReport) onSelectReport(id);
  };
  const [createOpen, setCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState('RBI-CRILC-B4');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('Large corporate exposure & Basel IV credit concentration statement.');

  const activeReport = reports.find((r) => r.id === selectedReportId) || reports[0];
  const isSignedOff = activeReport ? isSignedOffRegulatoryReport(activeReport) : false;
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  const handleExportCatalogueCsv = () => {
    const headers = ['Report ID', 'Code', 'Title', 'Date', 'Version', 'Status', 'Key Metric', 'Hash'];
    const rows = reports.map((r) => [
      r.id,
      r.code,
      r.title,
      r.reportDate,
      r.version,
      r.status,
      `${r.keyMetricLabel}: ${r.keyMetricValue}`,
      r.evidenceHash,
    ]);
    downloadCsv(`HDFC_RBI_Report_Catalogue.csv`, headers, rows);
  };

  const handleExportCsv = (report: RegulatoryReport) => {
    const headers = ['Schedule Code', 'Particulars', 'Reported Value', 'RBI Benchmark', 'Status'];
    const rows = report.rows.map((r) => [
      r.scheduleCode,
      r.particulars,
      r.amountOrRatio,
      r.rbiBenchmark,
      r.complianceStatus,
    ]);
    downloadCsv(`${report.code}_${report.reportDate}_${report.version}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Action Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="font-display text-lg font-bold text-slate-900">
            RBI Basel IV Official Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Safety Ratio {formatPct(metrics.crarPct)} · Loan Risk Score {formatINRCr(metrics.bindingRwaCr, 0)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Report</span>
          </button>
          <button
            type="button"
            onClick={onRegenerateReports}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync &amp; Regenerate</span>
          </button>
          <button
            type="button"
            onClick={handleExportCatalogueCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Catalogue</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Pack</span>
          </button>
        </div>
      </section>

      {/* Simple 3-Step Guide Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 no-print">
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-xs">
          <div className="font-bold text-slate-900">1. Create or Pick Report</div>
          <div className="text-slate-500 mt-0.5">Select a return below or click Create Report to start a draft.</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-xs">
          <div className="font-bold text-slate-900">2. Submit for 5-Step Sign-Off</div>
          <div className="text-slate-500 mt-0.5">Click Submit for Review on Draft/Returned reports to send to Approvals.</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-xs">
          <div className="font-bold text-slate-900">3. Download Offline PDF or CSV</div>
          <div className="text-slate-500 mt-0.5">Use Download Report as PDF or Download CSV for offline RBI filing records.</div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List: Templates */}
        <div className="lg:col-span-4 space-y-3 no-print">
          {reports.map((rep) => {
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
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-semibold text-blue-700">{rep.code}</span>
                  <span
                    className={`font-semibold ${
                      rep.status === 'Published to RBI'
                        ? 'text-emerald-700'
                        : rep.status === 'In Review'
                        ? 'text-amber-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {rep.status}
                  </span>
                </div>
                <div className="mt-1.5 font-display text-sm font-bold text-slate-900">
                  {rep.title}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono">{rep.reportDate}</span>
                  <span className="font-mono">{rep.version}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Detail: Official RBI Template Preview */}
        {activeReport && (
          <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-slate-800">
                    {activeReport.code}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{activeReport.reportDate}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{activeReport.version}</span>
                </div>
                <h2 className="font-display text-lg font-bold text-slate-900 mt-1">
                  {activeReport.title}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
                {(activeReport.status === 'Draft' || activeReport.status === 'Returned') && (
                  <button
                    type="button"
                    disabled={criticalBreaksCount > 0}
                    onClick={() => onSubmitReportForReview(activeReport.id)}
                    title={
                      criticalBreaksCount > 0
                        ? 'Resolve critical data quality breaks first'
                        : 'Submit report into Review & Approvals queue'
                    }
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold ${
                      criticalBreaksCount > 0
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-700 hover:bg-blue-800 text-white cursor-pointer'
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {criticalBreaksCount > 0
                        ? 'Blocked by Critical Break'
                        : 'Submit for Review'}
                    </span>
                  </button>
                )}
                {activeReport.status === 'In Review' && onOpenApprovals && (
                  <button
                    type="button"
                    onClick={onOpenApprovals}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold text-amber-800 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Open 5-Step Approvals</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={!isSignedOff}
                  title={
                    isSignedOff
                      ? 'Open browser Print-to-PDF dialog for this signed-off regulatory report'
                      : 'Print-to-PDF is enabled once report completes 5-Step Approval & Sign-Off'
                  }
                  onClick={() => {
                    const ok = printSignedOffReportPdf(activeReport);
                    if (!ok) {
                      setPdfNotice('Only signed-off (Published to RBI) regulatory reports can be printed as official PDF.');
                    } else {
                      setPdfNotice(`Opened Print-to-PDF dialog for signed-off report ${activeReport.code}.`);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold ${
                    isSignedOff
                      ? 'bg-[#0B1F3A] hover:bg-[#132E54] text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Download Report as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadReportPdf(activeReport)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>Save Offline PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCsv(activeReport)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>

            {pdfNotice && (
              <div className="px-6 py-2.5 bg-blue-50 border-b border-blue-200 flex items-center justify-between gap-2 text-xs text-blue-900 no-print">
                <span>{pdfNotice}</span>
                <button
                  type="button"
                  onClick={() => setPdfNotice(null)}
                  className="text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span>
                Reporting Entity: <strong>HDFC Bank</strong> · Regulator: <strong>Reserve Bank of India (RBI)</strong>
              </span>
              <span className="font-mono text-slate-600">
                Evidence Hash: {activeReport.evidenceHash}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4">Line Item Particulars</th>
                    <th className="py-3 px-4 text-right">Reported Amount / Ratio</th>
                    <th className="py-3 px-4">RBI Benchmark</th>
                    <th className="py-3 px-4">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {activeReport.rows.map((row) => (
                    <tr key={row.scheduleCode} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {row.scheduleCode}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">{row.particulars}</td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                        {row.amountOrRatio}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{row.rbiBenchmark}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold ${
                            row.complianceStatus === 'Compliant'
                              ? 'text-emerald-700'
                              : row.complianceStatus === 'Watch'
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }`}
                        >
                          {row.complianceStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5 text-blue-700" />
                Status: <strong>{activeReport.status}</strong>
              </span>
              <span>
                {activeReport.publishedBy
                  ? `Signed & Published by ${activeReport.publishedBy} (${activeReport.publishedAt})`
                  : 'Awaiting remaining Maker-Checker approvals before RBI visibility'}
              </span>
            </div>
          </section>
        )}
      </div>

      {/* Create Report Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                Create New RBI Regulatory Report
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
                if (!newTitle.trim()) return;
                onCreateReport({
                  code: newCode.trim() || 'RBI-CRILC-B4',
                  title: newTitle.trim(),
                  plainDesc: newDesc.trim() || 'Basel IV supervisory return.',
                });
                setNewTitle('');
                setCreateOpen(false);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">RBI Return Code</label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Report Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Large Exposure & CRILC Return"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Plain-English Summary
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
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
                  Create Draft Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
