import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  ClipboardPaste,
  Clock,
  Copy,
  Database,
  Download,
  FileSpreadsheet,
  FileUp,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import {
  ApprovalStage,
  AuditEvent,
  ExcelPasteRow,
  IngestionRunRecord,
  NavView,
  RbacModulePermissionRow,
  RegulatoryConfig,
  RegulatoryReport,
  SourceFeed,
  SourceSystemRecord,
  StakeholderRole,
} from '../types/basel';
import {
  BaselComputedMetrics,
  downloadBulkIngestionTemplate,
  formatINRCr,
  formatNumberIN,
  formatPct,
} from '../utils/baselCalculations';

interface OverviewIngestionViewProps {
  metrics: BaselComputedMetrics;
  config: RegulatoryConfig;
  feeds: SourceFeed[];
  sourceSystems: SourceSystemRecord[];
  ingestionRuns: IngestionRunRecord[];
  reports: RegulatoryReport[];
  auditEvents: AuditEvent[];
  approvalStages: ApprovalStage[];
  currentRole: StakeholderRole;
  rbacMatrix: RbacModulePermissionRow[];
  openBreaksCount: number;
  criticalBreaksCount: number;
  reconBreakCount: number;
  simpleGuide: boolean;
  onRerunFeed: (feedId: string) => void;
  onSimulateLateFeed: (feedId: string) => void;
  onAddSourceSystem: (src: Omit<SourceSystemRecord, 'id'>) => void;
  onAddFeed: (feed: Omit<SourceFeed, 'id' | 'recordsLoaded' | 'arrivalTime' | 'completenessPct'>) => void;
  onSimulateCsvUpload: (feedId: string, fileName: string, isCsv: boolean) => void;
  onBulkExcelIngest: (feedId: string, rows: ExcelPasteRow[]) => void;
  onNavigate: (view: NavView, reportId?: string) => void;
}

type CalendarDeadlineStatus = 'Overdue' | 'Critical' | 'Upcoming' | 'Submitted';

interface CalendarFilingItem {
  day: string;
  dateLabel: string;
  isoDate: string;
  reportCode: string;
  reportId?: string;
  title: string;
  statusNote: string;
  cutoff: string;
  state: CalendarDeadlineStatus;
  prepView: NavView;
  prepLabel: string;
  secondaryView?: NavView;
  secondaryLabel?: string;
}

const SAMPLE_EXCEL_TSV = `Account_ID\tBorrower_Name\tAsset_Class\tExposure_Cr\tRisk_Weight_Pct
LN-MUM-99012\tTata Infrastructure Ltd\tCorporate & Infrastructure\t420.50\t85
LN-DEL-99018\tBharat Housing Fin Corp\tResidential Mortgages\t185.00\t35
LN-BLR-99024\tDeccan Precision MSME\tRetail & MSME Regulatory\t64.25\t75
LN-CHN-99031\tSouthern Ports Authority\tPublic Sector Entity\t310.00\t20`;

function parseExcelGridText(raw: string): ExcelPasteRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const parsed: ExcelPasteRow[] = [];
  lines.forEach((line, idx) => {
    const delimiter = line.includes('\t') ? '\t' : ',';
    const cols = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (
      idx === 0 &&
      (cols[0]?.toLowerCase().includes('account') ||
        cols[0]?.toLowerCase().includes('loan') ||
        cols[3]?.toLowerCase().includes('exposure'))
    ) {
      return;
    }
    const accountId = cols[0] || '';
    const borrowerName = cols[1] || '';
    const assetClass = cols[2] || 'Corporate & Infrastructure';
    const exposureCr = Number(String(cols[3] || '0').replace(/[^0-9.-]/g, ''));
    const riskWeightPct = Number(String(cols[4] || '75').replace(/[^0-9.-]/g, ''));

    let error: string | undefined;
    if (!accountId) error = 'Missing Account ID';
    else if (!borrowerName) error = 'Missing Borrower Name';
    else if (!Number.isFinite(exposureCr) || exposureCr <= 0) error = 'Exposure must be > 0';
    else if (!Number.isFinite(riskWeightPct) || riskWeightPct < 0 || riskWeightPct > 250) {
      error = 'Risk weight 0–250%';
    }

    parsed.push({
      accountId,
      borrowerName,
      assetClass,
      exposureCr: Number.isFinite(exposureCr) ? exposureCr : 0,
      riskWeightPct: Number.isFinite(riskWeightPct) ? riskWeightPct : 75,
      valid: !error,
      error,
    });
  });
  return parsed;
}

export const OverviewIngestionView: React.FC<OverviewIngestionViewProps> = ({
  metrics,
  config,
  feeds,
  sourceSystems,
  ingestionRuns,
  reports,
  auditEvents,
  approvalStages,
  currentRole,
  rbacMatrix,
  openBreaksCount,
  criticalBreaksCount,
  reconBreakCount,
  simpleGuide: _simpleGuide,
  onRerunFeed,
  onSimulateLateFeed,
  onAddSourceSystem,
  onAddFeed,
  onSimulateCsvUpload,
  onBulkExcelIngest,
  onNavigate,
}) => {
  const [selectedDayIso, setSelectedDayIso] = useState<string>(config.reportingDate);
  const [calendarFilter, setCalendarFilter] = useState<'All' | CalendarDeadlineStatus>('All');
  const [ingestionTab, setIngestionTab] = useState<'feeds' | 'excel' | 'sources' | 'schedule' | 'runs'>('feeds');
  const [activeModal, setActiveModal] = useState<'source' | 'feed' | 'upload' | null>(null);
  const [schedFeedId, setSchedFeedId] = useState<string>(feeds[0]?.id || 'FEED-CBS');
  const [schedFreq, setSchedFreq] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [apiStatusNote, setApiStatusNote] = useState<string>('All 5 core banking / treasury connectors operational (local offline mode).');

  // Bulk Excel Paste State
  const [excelTargetFeedId, setExcelTargetFeedId] = useState<string>(feeds[0]?.id || 'FEED-CBS');
  const [excelRawText, setExcelRawText] = useState<string>(SAMPLE_EXCEL_TSV);
  const [excelRows, setExcelRows] = useState<ExcelPasteRow[]>(() =>
    parseExcelGridText(SAMPLE_EXCEL_TSV)
  );
  const [ingestionFeedback, setIngestionFeedback] = useState<string | null>(null);

  const dataIngestionRow = rbacMatrix.find((r) => r.moduleId === 'data-ingestion');
  const rolePermString = dataIngestionRow?.permissions[currentRole.id] || '';
  const permTokens = rolePermString
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const hasIngestRead = permTokens.includes('R');
  const hasIngestWrite = permTokens.includes('W') || permTokens.includes('C') || permTokens.includes('U');
  const hasIngestExecute = permTokens.includes('X');
  const canBulkExcelPaste = hasIngestWrite && hasIngestExecute;

  const validExcelRows = useMemo(() => excelRows.filter((r) => r.valid), [excelRows]);
  const totalExcelExposureCr = useMemo(
    () => validExcelRows.reduce((sum, r) => sum + r.exposureCr, 0),
    [validExcelRows]
  );

  // Add Source Form
  const [srcName, setSrcName] = useState('');
  const [srcType, setSrcType] = useState<SourceSystemRecord['type']>('Database');
  const [srcOwner, setSrcOwner] = useState('Banking Operations');

  // Add Feed Form
  const [feedName, setFeedName] = useState('');
  const [feedDomain, setFeedDomain] = useState('Risk & Treasury Balances');
  const [feedFreq, setFeedFreq] = useState<'Daily' | 'Weekly' | 'Monthly' | 'On Demand'>('Daily');
  const [feedFormat, setFeedFormat] = useState<'CSV' | 'API' | 'SFTP' | 'ISO20022'>('CSV');
  const [feedCutoff, setFeedCutoff] = useState('07:30 IST');

  // Simulate CSV Upload Form
  const [uploadFeedId, setUploadFeedId] = useState<string>(feeds[0]?.id || '');
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleExcelTextChange = (txt: string) => {
    setExcelRawText(txt);
    setExcelRows(parseExcelGridText(txt));
    setIngestionFeedback(null);
  };

  const handleUpdateExcelCell = (
    idx: number,
    field: 'accountId' | 'borrowerName' | 'assetClass' | 'exposureCr' | 'riskWeightPct',
    value: string
  ) => {
    setExcelRows((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const next: ExcelPasteRow = {
          ...row,
          [field]:
            field === 'exposureCr' || field === 'riskWeightPct' ? Number(value) || 0 : value,
        };
        let error: string | undefined;
        if (!next.accountId.trim()) error = 'Missing Account ID';
        else if (!next.borrowerName.trim()) error = 'Missing Borrower Name';
        else if (next.exposureCr <= 0) error = 'Exposure must be > 0';
        else if (next.riskWeightPct < 0 || next.riskWeightPct > 250) error = 'Risk weight 0–250%';
        return { ...next, valid: !error, error };
      })
    );
  };

  const handleCopyFeedsTsv = () => {
    const header = ['Feed ID', 'System Name', 'Domain', 'Records', 'Value (Cr)', 'Arrival', 'SLA', 'Status'].join('\t');
    const lines = feeds.map((f) =>
      [f.id, f.systemName, f.domain, f.recordsLoaded, f.totalValueCr, f.arrivalTime, f.slaCutoff, f.status].join('\t')
    );
    navigator.clipboard?.writeText([header, ...lines].join('\n')).catch(() => {});
    setIngestionFeedback('Copied Data Feeds table (tab-separated) for Excel paste.');
  };

  const handleCopyExcelTemplate = () => {
    navigator.clipboard?.writeText(SAMPLE_EXCEL_TSV).catch(() => {});
    setIngestionFeedback('Copied 4-row Excel template to clipboard. Paste in Excel, edit, and Ctrl+V back.');
  };

  const handleExecuteExcelIngest = () => {
    if (!canBulkExcelPaste || validExcelRows.length === 0) return;
    const feedObj = feeds.find((f) => f.id === excelTargetFeedId) || feeds[0];
    onBulkExcelIngest(excelTargetFeedId, validExcelRows);
    setIngestionFeedback(
      `Ingested ${validExcelRows.length} Excel rows (${formatINRCr(totalExcelExposureCr, 2)}) into ${
        feedObj?.systemName || 'Target Feed'
      }.`
    );
  };

  const approvedCount = approvalStages.filter((s) => s.status === 'Approved').length;
  const loadedFeedsCount = feeds.filter((f) => f.status === 'Loaded').length;
  const delayedFeedsCount = feeds.filter((f) => f.status === 'Delayed').length;
  const failedFeedsCount = feeds.filter((f) => f.status === 'Failed').length;
  const currentPendingStage = approvalStages.find((s) => s.status === 'Pending');
  const allApproved = approvedCount === approvalStages.length;

  // Report Status Distribution for SVG Donut
  const statusBuckets = [
    {
      label: 'Published to RBI',
      count: reports.filter((r) => r.status === 'Published to RBI').length,
      color: '#15803D',
    },
    {
      label: 'In Review / Approved',
      count: reports.filter((r) => r.status === 'In Review' || r.status === 'Approved').length,
      color: '#1D4ED8',
    },
    {
      label: 'Draft / Returned',
      count: reports.filter((r) => r.status === 'Draft' || r.status === 'Returned').length,
      color: '#D97706',
    },
  ];
  const totalReportsForDonut = Math.max(
    statusBuckets.reduce((acc, b) => acc + b.count, 0),
    1
  );
  const donutCircumference = 2 * Math.PI * 44;

  const overdueCrilcRep = reports.find((r) => r.id === 'REP-CRILC-OVERDUE');
  const isCrilcCleared =
    overdueCrilcRep &&
    (overdueCrilcRep.status === 'In Review' ||
      overdueCrilcRep.status === 'Approved' ||
      overdueCrilcRep.status === 'Published to RBI');

  const weeklyCalendar: CalendarFilingItem[] = [
    {
      day: 'Day 1',
      dateLabel: '11 Nov',
      isoDate: '2026-11-11',
      reportCode: 'RBI-BLR1-LCR',
      reportId: 'REP-RCA3-PREV',
      title: 'Daily Cash Buffer',
      statusNote: 'Certified & in RBI Vault',
      cutoff: '09:30 IST',
      state: 'Submitted',
      prepView: 'rbi-portal',
      prepLabel: 'View Filing',
    },
    {
      day: 'Day 2',
      dateLabel: '12 Nov',
      isoDate: '2026-11-12',
      reportCode: 'RBI-RCA3-B4',
      reportId: 'REP-RCA3-PREV',
      title: 'Capital & Risk Score',
      statusNote: 'Certified · Zero Breaks',
      cutoff: '09:30 IST',
      state: 'Submitted',
      prepView: 'rbi-portal',
      prepLabel: 'View Filing',
    },
    {
      day: 'Day 3',
      dateLabel: '13 Nov',
      isoDate: '2026-11-13',
      reportCode: 'RBI-CRILC-WK',
      reportId: 'REP-CRILC-OVERDUE',
      title: 'Large Loans (CRILC)',
      statusNote: isCrilcCleared ? 'Submitted for Review' : 'Missed 17:00 IST Cutoff',
      cutoff: '17:00 IST',
      state: isCrilcCleared ? 'Submitted' : 'Overdue',
      prepView: 'reports',
      prepLabel: 'Fix & Prepare Report',
      secondaryView: 'quality',
      secondaryLabel: 'Check Loan Errors',
    },
    {
      day: 'Today',
      dateLabel: '14 Nov',
      isoDate: '2026-11-14',
      reportCode: 'RBI-RCA3-B4',
      reportId: 'REP-RCA3-LIVE',
      title: 'Capital & 72.5% Floor',
      statusNote: allApproved
        ? 'All 5 Sign-Offs Done'
        : criticalBreaksCount > 0
        ? `${criticalBreaksCount} Critical Break Blocking · ${currentPendingStage?.requiredRoleTitle || 'Approvals'}`
        : `Pending ${currentPendingStage?.requiredRoleTitle || 'Sign-Off'}`,
      cutoff: config.dailySlaCutoffIst,
      state: allApproved ? 'Submitted' : 'Critical',
      prepView: 'reports',
      prepLabel: 'Prepare Capital Report',
      secondaryView: criticalBreaksCount > 0 ? 'quality' : 'approvals',
      secondaryLabel: criticalBreaksCount > 0 ? 'Fix Critical Break' : 'Open 5-Step Sign-Off',
    },
    {
      day: 'Day 5',
      dateLabel: '15 Nov',
      isoDate: '2026-11-15',
      reportCode: 'RBI-BLR1-LCR',
      reportId: 'REP-BLR1-LIVE',
      title: '30-Day Cash & GL Check',
      statusNote: reconBreakCount > 0 ? `${reconBreakCount} GL Variance Open` : 'Due Tomorrow · Ready',
      cutoff: '09:30 IST',
      state: 'Critical',
      prepView: 'reports',
      prepLabel: 'Prepare Cash Report',
      secondaryView: reconBreakCount > 0 ? 'reconciliation' : 'basel',
      secondaryLabel: reconBreakCount > 0 ? 'Fix GL Difference' : 'Basel IV Calculator',
    },
    {
      day: 'Day 6',
      dateLabel: '16 Nov',
      isoDate: '2026-11-16',
      reportCode: 'RBI-NSFR-WK',
      reportId: 'REP-NSFR-UPCOMING',
      title: '1-Year Stable Funding',
      statusNote: 'Draft Ready · Due in 2 Days',
      cutoff: '11:00 IST',
      state: 'Upcoming',
      prepView: 'reports',
      prepLabel: 'Prepare NSFR Draft',
      secondaryView: 'basel',
      secondaryLabel: 'Check NSFR Ratio',
    },
    {
      day: 'Day 7',
      dateLabel: '17 Nov',
      isoDate: '2026-11-17',
      reportCode: 'RBI-LR1-LEV',
      reportId: 'REP-LR1-PREV',
      title: 'Leverage Exposure',
      statusNote: 'Scheduled · Due in 3 Days',
      cutoff: '09:30 IST',
      state: 'Upcoming',
      prepView: 'reports',
      prepLabel: 'Prepare Leverage Report',
      secondaryView: 'basel',
      secondaryLabel: 'Check Leverage Ratio',
    },
  ];

  const filteredCalendar =
    calendarFilter === 'All'
      ? weeklyCalendar
      : weeklyCalendar.filter((d) => d.state === calendarFilter);

  const activeCalendarItem =
    filteredCalendar.find((d) => d.isoDate === selectedDayIso) ||
    filteredCalendar[0] ||
    weeklyCalendar[3];

  const calendarCounts = {
    Overdue: weeklyCalendar.filter((d) => d.state === 'Overdue').length,
    Critical: weeklyCalendar.filter((d) => d.state === 'Critical').length,
    Upcoming: weeklyCalendar.filter((d) => d.state === 'Upcoming').length,
    Submitted: weeklyCalendar.filter((d) => d.state === 'Submitted').length,
  };

  const handleSaveSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!srcName.trim()) return;
    onAddSourceSystem({
      name: srcName.trim(),
      type: srcType,
      owner: srcOwner.trim() || 'Operations',
      status: 'Active',
    });
    setSrcName('');
    setActiveModal(null);
    setIngestionTab('sources');
  };

  const handleSaveFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedName.trim()) return;
    onAddFeed({
      systemName: feedName.trim(),
      domain: feedDomain.trim() || 'Banking Balances',
      plainDesc: `Automated ${feedFreq.toLowerCase()} ${feedFormat} ingestion feed.`,
      frequency: feedFreq,
      format: feedFormat,
      slaCutoff: feedCutoff,
      status: 'Loaded',
      totalValueCr: 12500,
    });
    setFeedName('');
    setActiveModal(null);
    setIngestionTab('feeds');
  };

  const handleProcessUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const targetName = uploadFileName.trim() || 'daily_basel4_batch.csv';
    const isCsv = targetName.toLowerCase().endsWith('.csv');
    if (!isCsv) {
      setUploadError('Only .csv files are accepted for Basel IV feed batch ingestion.');
    } else {
      setUploadError(null);
    }
    onSimulateCsvUpload(uploadFeedId || feeds[0]?.id, targetName, isCsv);
    if (isCsv) {
      setUploadFileName('');
      setActiveModal(null);
      setIngestionTab('runs');
    }
  };

  let donutOffset = 0;

  return (
    <div className="space-y-6">
      {/* Daily Pipeline Progress Strip */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">
              Daily RBI Filing Run · {config.reportingDate}
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Cutoff SLA: <span className="font-mono font-semibold">{config.dailySlaCutoffIst}</span>{' '}
              · Feeds Ready:{' '}
              <span className="font-mono font-semibold">
                {loadedFeedsCount}/{feeds.length}
              </span>{' '}
              · Review &amp; Approvals:{' '}
              <span className="font-mono font-semibold">{approvedCount}/5 Signed</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {criticalBreaksCount > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('quality')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{criticalBreaksCount} Critical Break Blocking RBI</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('basel')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Basel IV Calculator</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('approvals')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span>Open Review &amp; Approvals</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 6-Stage Interactive Pipeline */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              title: '1. Data Feeds',
              status: `${loadedFeedsCount}/${feeds.length} Loaded`,
              ok: loadedFeedsCount === feeds.length,
              view: 'overview' as NavView,
            },
            {
              title: '2. Data Quality',
              status: openBreaksCount === 0 ? 'All Clear' : `${openBreaksCount} Open Breaks`,
              ok: openBreaksCount === 0,
              view: 'quality' as NavView,
            },
            {
              title: '3. Basel IV Math',
              status: metrics.complianceChecks.crarOk ? 'CRAR Safe' : 'Below RBI Min',
              ok: metrics.complianceChecks.crarOk,
              view: 'basel' as NavView,
            },
            {
              title: '4. GL Match',
              status: reconBreakCount === 0 ? 'Matched' : `${reconBreakCount} Variance`,
              ok: reconBreakCount === 0,
              view: 'reconciliation' as NavView,
            },
            {
              title: '5. Sign-Offs',
              status: `${approvedCount}/5 Signed`,
              ok: approvedCount === 5,
              view: 'approvals' as NavView,
            },
            {
              title: '6. RBI Vault',
              status: approvedCount === 5 ? 'Published' : 'Waiting Sign-Off',
              ok: approvedCount === 5,
              view: 'rbi-portal' as NavView,
            },
          ].map((step) => (
            <button
              key={step.title}
              type="button"
              onClick={() => onNavigate(step.view)}
              className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                step.ok
                  ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400'
                  : 'bg-amber-50/60 border-amber-200 hover:border-amber-400'
              }`}
            >
              <div className="text-xs font-semibold text-slate-900">{step.title}</div>
              <div
                className={`mt-1.5 font-mono text-xs font-semibold flex items-center gap-1 ${
                  step.ok ? 'text-emerald-700' : 'text-amber-800'
                }`}
              >
                {step.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{step.status}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 7-Day RBI Reporting Calendar + Review & Approvals Live Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-700" />
                <span>Reporting Calendar · 7-Day RBI Timeline</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                11–17 Nov 2026 · Daily Cutoff {config.dailySlaCutoffIst}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['All', 'Overdue', 'Critical', 'Upcoming', 'Submitted'] as const).map((tab) => {
                const count =
                  tab === 'All' ? weeklyCalendar.length : calendarCounts[tab];
                const isActive = calendarFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCalendarFilter(tab)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {filteredCalendar.map((item) => {
              const isSelected = item.isoDate === activeCalendarItem.isoDate;
              const styleMap: Record<
                CalendarDeadlineStatus,
                { card: string; badge: string; Icon: typeof AlertTriangle }
              > = {
                Overdue: {
                  card: 'border-red-300 bg-red-50/70 hover:border-red-400',
                  badge: 'text-red-700',
                  Icon: AlertTriangle,
                },
                Critical: {
                  card: 'border-amber-300 bg-amber-50/70 hover:border-amber-400',
                  badge: 'text-amber-800',
                  Icon: Clock,
                },
                Upcoming: {
                  card: 'border-blue-200 bg-blue-50/40 hover:border-blue-400',
                  badge: 'text-blue-700',
                  Icon: Calendar,
                },
                Submitted: {
                  card: 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-400',
                  badge: 'text-emerald-700',
                  Icon: CheckCircle2,
                },
              };
              const cfg = styleMap[item.state];
              const StatusIcon = cfg.Icon;

              return (
                <div
                  key={item.isoDate}
                  onClick={() => setSelectedDayIso(item.isoDate)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedDayIso(item.isoDate);
                    }
                  }}
                  className={`text-left p-3 rounded-lg border transition-colors cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 ring-1 ring-blue-600 bg-white'
                      : cfg.card
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span
                        className={`font-semibold ${
                          item.day === 'Today' ? 'text-blue-700' : 'text-slate-600'
                        }`}
                      >
                        {item.day}
                      </span>
                      <span className="font-mono text-slate-500">{item.dateLabel}</span>
                    </div>
                    <div className="mt-2 font-mono text-[11px] font-bold text-slate-900 truncate">
                      {item.reportCode}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-600 leading-snug line-clamp-2">
                      {item.title}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/70 space-y-1.5">
                    <div className={`text-[10px] font-bold flex items-center gap-1 ${cfg.badge}`}>
                      <StatusIcon className="h-3 w-3 shrink-0" />
                      <span>{item.state}</span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">{item.cutoff}</div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(item.prepView, item.reportId);
                      }}
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer whitespace-nowrap"
                    >
                      {item.state === 'Submitted' ? 'View →' : 'Prepare →'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs">
              <div className="font-semibold text-slate-900 flex flex-wrap items-center gap-2">
                <span>
                  {activeCalendarItem.day}, {activeCalendarItem.dateLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-blue-700">{activeCalendarItem.reportCode}</span>
                <span>({activeCalendarItem.title})</span>
              </div>
              <p className="text-slate-600 mt-0.5">
                <strong
                  className={
                    activeCalendarItem.state === 'Overdue'
                      ? 'text-red-700'
                      : activeCalendarItem.state === 'Critical'
                      ? 'text-amber-800'
                      : activeCalendarItem.state === 'Submitted'
                      ? 'text-emerald-700'
                      : 'text-blue-700'
                  }
                >
                  {activeCalendarItem.state}
                </strong>{' '}
                · {activeCalendarItem.statusNote} · Cutoff{' '}
                <strong className="font-mono">{activeCalendarItem.cutoff}</strong>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {activeCalendarItem.secondaryView && activeCalendarItem.secondaryLabel && (
                <button
                  type="button"
                  onClick={() => onNavigate(activeCalendarItem.secondaryView!)}
                  className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-800 cursor-pointer whitespace-nowrap"
                >
                  {activeCalendarItem.secondaryLabel} →
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigate(activeCalendarItem.prepView, activeCalendarItem.reportId)}
                className="px-3.5 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                {activeCalendarItem.prepLabel} →
              </button>
            </div>
          </div>
        </section>

        {/* Review & Approvals Spotlight Card */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-blue-700" />
                <span>Review &amp; Approvals</span>
              </h2>
              <span className="font-mono text-xs font-bold text-blue-700">
                {approvedCount}/5 Done
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              5-Step Sign-Off before RBI release
            </p>

            <div className="mt-4 space-y-2">
              {approvalStages.map((stg) => (
                <div
                  key={stg.id}
                  className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-slate-100 last:border-b-0"
                >
                  <span className="text-slate-700 truncate">
                    <span className="font-mono text-slate-400 mr-1.5">0{stg.order}</span>
                    {stg.requiredRoleTitle}
                  </span>
                  <span
                    className={`font-semibold shrink-0 ${
                      stg.status === 'Approved'
                        ? 'text-emerald-700'
                        : stg.status === 'Pending'
                        ? 'text-blue-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {stg.status === 'Approved'
                      ? 'Signed'
                      : stg.status === 'Pending'
                      ? 'Waiting Sign'
                      : 'Queued'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('approvals')}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold cursor-pointer"
          >
            <span>
              {allApproved
                ? 'View Signed Certificates'
                : `Go Sign Stage ${currentPendingStage?.order || 2} →`}
            </span>
          </button>
        </section>
      </div>

      {/* 4 Core Basel IV KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Bank Safety Ratio (CRAR)</div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {formatPct(metrics.crarPct)}
          </div>
          <div className="mt-1 text-xs font-medium text-emerald-700">
            RBI Min {formatPct(config.rbiMinCrarPct)} ·{' '}
            {metrics.complianceChecks.crarOk ? 'Safe' : 'Breach'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Core Owner Cash (CET1)</div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {formatPct(metrics.cet1RatioPct)}
          </div>
          <div className="mt-1 text-xs font-medium text-emerald-700">
            RBI Min {formatPct(config.rbiMinCet1Pct)} ·{' '}
            {metrics.complianceChecks.cet1Ok ? 'Safe' : 'Breach'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">30-Day Cash Buffer (LCR)</div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {formatPct(metrics.lcrPct)}
          </div>
          <div className="mt-1 text-xs font-medium text-emerald-700">
            RBI Min {formatPct(config.rbiMinLcrPct)} ·{' '}
            {metrics.complianceChecks.lcrOk ? 'Safe' : 'Breach'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Loan Risk Score (RWA)</div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {formatINRCr(metrics.bindingRwaCr, 0)}
          </div>
          <div className="mt-1 text-xs font-medium text-blue-700">
            {metrics.isFloorBinding
              ? `${config.baselOutputFloorPct}% Safety Floor`
              : 'Internal Model Active'}
          </div>
        </div>
      </section>

      {/* Visual Analytics Row: Pure SVG Report Status Donut + Feed Health Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-bold text-slate-900">
              Report Status Distribution
            </h2>
            <span className="font-mono text-xs text-slate-500">{reports.length} Total</span>
          </div>
          <div className="flex items-center gap-5">
            <svg viewBox="0 0 116 116" className="w-28 h-28 shrink-0">
              <circle cx="58" cy="58" r="44" fill="none" stroke="#E2E8F0" strokeWidth="14" />
              {statusBuckets.map((b) => {
                const segLen = (b.count / totalReportsForDonut) * donutCircumference;
                const el = (
                  <circle
                    key={b.label}
                    cx="58"
                    cy="58"
                    r="44"
                    fill="none"
                    stroke={b.color}
                    strokeWidth="14"
                    strokeDasharray={`${segLen} ${donutCircumference - segLen}`}
                    strokeDashoffset={-donutOffset}
                    transform="rotate(-90 58 58)"
                  />
                );
                donutOffset += segLen;
                return el;
              })}
              <text
                x="58"
                y="62"
                textAnchor="middle"
                className="font-mono font-bold fill-slate-900"
                fontSize="16"
              >
                {reports.length}
              </text>
            </svg>
            <div className="space-y-2 text-xs flex-1">
              {statusBuckets.map((b) => (
                <div key={b.label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-slate-700">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: b.color }}
                    />
                    {b.label}
                  </span>
                  <span className="font-mono font-bold text-slate-900">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Source Feed Health Bars */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-bold text-slate-900">
              Data Feed Health Breakdown
            </h2>
            <span className="font-mono text-xs text-slate-500">{feeds.length} Feeds</span>
          </div>
          <div className="space-y-3 text-xs">
            {[
              { label: 'Loaded On-Time', count: loadedFeedsCount, color: 'bg-emerald-600' },
              { label: 'SLA Delayed', count: delayedFeedsCount, color: 'bg-amber-500' },
              { label: 'Failed / Missing', count: failedFeedsCount, color: 'bg-red-600' },
            ].map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-700 font-medium">{bar.label}</span>
                  <span className="font-mono font-bold text-slate-900">
                    {bar.count} / {feeds.length}
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${bar.color}`}
                    style={{ width: `${(bar.count / Math.max(feeds.length, 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity Snapshot */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-sm font-bold text-slate-900">
                Recent Reporting Activity
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('audit-config')}
                className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Full Audit &rarr;
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              {auditEvents.slice(0, 3).map((ev) => (
                <div
                  key={ev.id}
                  className="pb-2 border-b border-slate-100 last:border-b-0 last:pb-0"
                >
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-blue-700">{ev.actionType}</span>
                    <span className="font-mono">{ev.timestamp}</span>
                  </div>
                  <div className="text-slate-800 mt-0.5 line-clamp-1">{ev.summary}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Data Ingestion Studio: Feeds, Direct Excel Copy-Paste, Source Systems & Execution Runs */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Data Ingestion &amp; Source Systems Console
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned to <strong className="text-slate-700">Bavya &amp; Yogapriya</strong> · Your
              Access ({currentRole.title}):{' '}
              <span
                className={`font-mono font-bold ${
                  canBulkExcelPaste ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {rolePermString || 'No Access'}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadBulkIngestionTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-800 cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Template</span>
            </button>
            <button
              type="button"
              onClick={() => setIngestionTab('excel')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Bulk Paste from Excel</span>
            </button>
            <button
              type="button"
              onClick={handleCopyFeedsTsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer whitespace-nowrap"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Feeds to Excel</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('source')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <Database className="h-3.5 w-3.5" />
              <span>Register Source</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('feed')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Feed</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadFeedId(feeds[0]?.id || '');
                setUploadError(null);
                setActiveModal('upload');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold cursor-pointer"
            >
              <FileUp className="h-3.5 w-3.5" />
              <span>Simulate CSV Upload</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'feeds' as const, label: `Data Feeds (${feeds.length})` },
              { id: 'excel' as const, label: 'Excel Bulk Paste (Copy-Paste)' },
              { id: 'sources' as const, label: `Source Systems (${sourceSystems.length})` },
              { id: 'schedule' as const, label: 'Scheduled Ingestion & API' },
              { id: 'runs' as const, label: `Execution History (${ingestionRuns.length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setIngestionTab(t.id)}
                className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  ingestionTab === t.id
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500 font-mono pb-2">
            Total Ingested: {formatNumberIN(feeds.reduce((a, f) => a + f.recordsLoaded, 0))} rows
          </span>
        </div>

        {ingestionFeedback && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>{ingestionFeedback}</span>
            <button
              type="button"
              onClick={() => setIngestionFeedback(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {ingestionTab === 'excel' && (
          <div className="p-6 space-y-5">
            {/* Role Permission Gate Banner */}
            <div
              className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                canBulkExcelPaste
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-amber-50 border-amber-300'
              }`}
            >
              <div className="text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  {canBulkExcelPaste ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  ) : (
                    <Lock className="h-4 w-4 text-amber-700" />
                  )}
                  <span>
                    {canBulkExcelPaste
                      ? `${currentRole.title} · Full Data Ingestion Access Granted (R, W, X)`
                      : `${currentRole.title} · Read / Restricted Access (${rolePermString || 'None'})`}
                  </span>
                </div>
                <p className="text-slate-600 mt-0.5">
                  {canBulkExcelPaste
                    ? 'Copy cells directly from Microsoft Excel or Google Sheets and press Ctrl+V below to bulk load rows.'
                    : 'Only Data Operations Analyst (R, W, X) or Super Admin can write & execute bulk Excel paste batches.'}
                </p>
              </div>
              {!canBulkExcelPaste && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-amber-800 whitespace-nowrap shrink-0">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Restricted: Sign out &amp; log in as Data Operations Analyst (R, W, X)</span>
                </span>
              )}
            </div>

            {/* Excel Paste Box + Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Source System Feed
                </label>
                <select
                  value={excelTargetFeedId}
                  onChange={(e) => setExcelTargetFeedId(e.target.value)}
                  disabled={!hasIngestRead}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  {feeds.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.systemName} ({f.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-8 flex flex-wrap items-center gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    downloadBulkIngestionTemplate();
                    setIngestionFeedback('Downloaded HDFC_Bulk_Ingestion_Template.csv with headers: Account_ID, Borrower_Name, Asset_Class, Exposure_Cr, Risk_Weight_Pct.');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-800 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Template</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyExcelTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Excel Template</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExcelTextChange(SAMPLE_EXCEL_TSV)}
                  disabled={!hasIngestWrite}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold ${
                    hasIngestWrite
                      ? 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 cursor-pointer'
                      : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  <span>Load Sample Excel Rows</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExcelTextChange('')}
                  disabled={!hasIngestWrite}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold ${
                    hasIngestWrite
                      ? 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer'
                      : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Clear Grid
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Paste Excel Rows Directly Here (Tab-Separated or CSV)
              </label>
              <textarea
                rows={5}
                value={excelRawText}
                disabled={!hasIngestWrite}
                onChange={(e) => handleExcelTextChange(e.target.value)}
                placeholder="Paste rows copied directly from Excel: Account_ID [Tab] Borrower_Name [Tab] Asset_Class [Tab] Exposure_Cr [Tab] Risk_Weight_Pct"
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
              />
            </div>

            {/* Live Parsed Editable Excel Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-800">
                  Excel Preview Grid ({validExcelRows.length} Valid / {excelRows.length} Total Rows)
                </span>
                <span className="font-mono font-semibold text-blue-700">
                  Total Batch Exposure: {formatINRCr(totalExcelExposureCr, 2)}
                </span>
              </div>
              {excelRows.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Paste rows from Excel above or click Load Sample Excel Rows to preview &amp; edit.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                        <th className="py-2.5 px-3">Account / Loan ID</th>
                        <th className="py-2.5 px-3">Borrower Name</th>
                        <th className="py-2.5 px-3">Asset Class</th>
                        <th className="py-2.5 px-3 text-right">Exposure (₹ Cr)</th>
                        <th className="py-2.5 px-3 text-right">Risk Weight (%)</th>
                        <th className="py-2.5 px-3">Validation</th>
                        <th className="py-2.5 px-3 text-right">Row</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {excelRows.map((row, idx) => (
                        <tr key={`${row.accountId}-${idx}`} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              disabled={!hasIngestWrite}
                              value={row.accountId}
                              onChange={(e) =>
                                handleUpdateExcelCell(idx, 'accountId', e.target.value)
                              }
                              className="w-32 px-2 py-1 font-mono text-xs border border-slate-200 rounded bg-white"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              disabled={!hasIngestWrite}
                              value={row.borrowerName}
                              onChange={(e) =>
                                handleUpdateExcelCell(idx, 'borrowerName', e.target.value)
                              }
                              className="w-44 px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              disabled={!hasIngestWrite}
                              value={row.assetClass}
                              onChange={(e) =>
                                handleUpdateExcelCell(idx, 'assetClass', e.target.value)
                              }
                              className="w-44 px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              disabled={!hasIngestWrite}
                              value={row.exposureCr}
                              onChange={(e) =>
                                handleUpdateExcelCell(idx, 'exposureCr', e.target.value)
                              }
                              className="w-28 px-2 py-1 font-mono text-right text-xs border border-slate-200 rounded bg-white"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="1"
                              disabled={!hasIngestWrite}
                              value={row.riskWeightPct}
                              onChange={(e) =>
                                handleUpdateExcelCell(idx, 'riskWeightPct', e.target.value)
                              }
                              className="w-20 px-2 py-1 font-mono text-right text-xs border border-slate-200 rounded bg-white"
                            />
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {row.valid ? (
                              <span className="font-semibold text-emerald-700">Valid</span>
                            ) : (
                              <span className="font-semibold text-red-700">{row.error}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              disabled={!hasIngestWrite}
                              onClick={() =>
                                setExcelRows((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-slate-400 hover:text-red-600 p-1 cursor-pointer disabled:opacity-40"
                              aria-label="Remove row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-xs text-slate-500">
                Permissions required: <strong className="font-mono text-slate-700">R, W, X</strong>{' '}
                on Data Ingestion
              </span>
              <button
                type="button"
                disabled={!canBulkExcelPaste || validExcelRows.length === 0}
                onClick={handleExecuteExcelIngest}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold ${
                  canBulkExcelPaste && validExcelRows.length > 0
                    ? 'bg-[#0B1F3A] hover:bg-[#132E54] text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Execute &amp; Ingest {validExcelRows.length} Excel Rows</span>
              </button>
            </div>
          </div>
        )}

        {ingestionTab === 'feeds' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Source System Feed</th>
                  <th className="py-3 px-4">Data Domain</th>
                  <th className="py-3 px-4 text-right">Records</th>
                  <th className="py-3 px-4 text-right">Balance (₹ Cr)</th>
                  <th className="py-3 px-4">Arrival / SLA</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ops Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {feeds.map((feed) => (
                  <tr key={feed.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{feed.systemName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{feed.domain}</td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800">
                      {formatNumberIN(feed.recordsLoaded)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800">
                      {feed.totalValueCr > 0 ? formatINRCr(feed.totalValueCr, 0) : 'Reference'}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700">
                      {feed.arrivalTime} <span className="text-slate-400">/ {feed.slaCutoff}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          feed.status === 'Loaded'
                            ? 'text-emerald-700'
                            : feed.status === 'Delayed'
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }`}
                      >
                        {feed.status} ({feed.completenessPct}%)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onRerunFeed(feed.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer whitespace-nowrap"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Re-run</span>
                        </button>
                        {feed.status === 'Loaded' && (
                          <button
                            type="button"
                            onClick={() => onSimulateLateFeed(feed.id)}
                            className="px-2.5 py-1 rounded border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium cursor-pointer whitespace-nowrap"
                          >
                            Test Late SLA
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ingestionTab === 'sources' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Source ID</th>
                  <th className="py-3 px-4">Source System Name</th>
                  <th className="py-3 px-4">Integration Type</th>
                  <th className="py-3 px-4">Business Owner</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sourceSystems.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-blue-700 font-semibold">{s.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{s.name}</td>
                    <td className="py-3 px-4 text-slate-700">{s.type}</td>
                    <td className="py-3 px-4 text-slate-700">{s.owner}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ingestionTab === 'schedule' && (
          <div className="p-6 space-y-5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-slate-500">Daily Ingestion Window</span>
                <div className="font-mono text-lg font-bold text-slate-900 mt-1">02:00 – 07:30 IST</div>
                <span className="text-slate-500">Every business day before 09:30 RBI cutoff</span>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-slate-500">Weekly Ingestion Window</span>
                <div className="font-mono text-lg font-bold text-slate-900 mt-1">Sunday · 03:00 IST</div>
                <span className="text-slate-500">Weekly CRILC &amp; NSFR consolidation</span>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-slate-500">Monthly Ingestion Window</span>
                <div className="font-mono text-lg font-bold text-slate-900 mt-1">1st Day · 04:00 IST</div>
                <span className="text-slate-500">Monthly statutory balance reconciliation</span>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-white flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <label className="block font-semibold text-slate-700 mb-1">Select Feed</label>
                <select
                  value={schedFeedId}
                  onChange={(e) => setSchedFeedId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {feeds.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.id} — {f.systemName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[160px]">
                <label className="block font-semibold text-slate-700 mb-1">Frequency</label>
                <select
                  value={schedFreq}
                  onChange={(e) => setSchedFreq(e.target.value as 'Daily' | 'Weekly' | 'Monthly')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  const f = feeds.find((x) => x.id === schedFeedId);
                  setIngestionFeedback(
                    `Schedule updated to ${schedFreq} for ${f?.systemName || schedFeedId}.`
                  );
                }}
                className="px-4 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white font-semibold cursor-pointer"
              >
                Save Schedule
              </button>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900">API Integration &amp; Gateway Check</div>
                <div className="text-slate-600 mt-0.5">{apiStatusNote}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const ts = new Date().toLocaleTimeString('en-IN');
                  setApiStatusNote(`API Connection Verified at ${ts} (Core Banking, CreditLens, CERSAI 200 OK).`);
                  setIngestionFeedback('API gateway connectivity verified across active source connectors.');
                }}
                className="px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold cursor-pointer"
              >
                Test API Connection
              </button>
            </div>
          </div>
        )}

        {ingestionTab === 'runs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Run ID</th>
                  <th className="py-3 px-4">Feed Name</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Records</th>
                  <th className="py-3 px-4">Execution Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {ingestionRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-blue-700 font-semibold">{run.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{run.feedName}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{run.timestamp}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          run.status === 'Completed'
                            ? 'text-emerald-700'
                            : run.status === 'Delayed'
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatNumberIN(run.records)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{run.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                {activeModal === 'source'
                  ? 'Register New Source System'
                  : activeModal === 'feed'
                  ? 'Create Data Ingestion Feed'
                  : 'Simulate CSV Batch Upload'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {activeModal === 'source' && (
              <form onSubmit={handleSaveSource} className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Source System Name
                  </label>
                  <input
                    type="text"
                    required
                    value={srcName}
                    onChange={(e) => setSrcName(e.target.value)}
                    placeholder="e.g. Trade Finance Ledger"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Type</label>
                    <select
                      value={srcType}
                      onChange={(e) => setSrcType(e.target.value as SourceSystemRecord['type'])}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Database">Database</option>
                      <option value="API">API</option>
                      <option value="File">File (SFTP/CSV)</option>
                      <option value="Core Ledger">Core Ledger</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Owner Team</label>
                    <input
                      type="text"
                      required
                      value={srcOwner}
                      onChange={(e) => setSrcOwner(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3.5 py-2 border border-slate-300 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#0B1F3A] text-white font-semibold cursor-pointer"
                  >
                    Save Source System
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'feed' && (
              <form onSubmit={handleSaveFeed} className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Feed Name</label>
                  <input
                    type="text"
                    required
                    value={feedName}
                    onChange={(e) => setFeedName(e.target.value)}
                    placeholder="e.g. Derivatives CVA Feed"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data Domain</label>
                  <input
                    type="text"
                    required
                    value={feedDomain}
                    onChange={(e) => setFeedDomain(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Frequency</label>
                    <select
                      value={feedFreq}
                      onChange={(e) =>
                        setFeedFreq(e.target.value as 'Daily' | 'Weekly' | 'Monthly' | 'On Demand')
                      }
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option>Daily</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Format</label>
                    <select
                      value={feedFormat}
                      onChange={(e) =>
                        setFeedFormat(e.target.value as 'CSV' | 'API' | 'SFTP' | 'ISO20022')
                      }
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option>CSV</option>
                      <option>API</option>
                      <option>SFTP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">SLA Cutoff</label>
                    <input
                      type="text"
                      value={feedCutoff}
                      onChange={(e) => setFeedCutoff(e.target.value)}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3.5 py-2 border border-slate-300 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#0B1F3A] text-white font-semibold cursor-pointer"
                  >
                    Create Feed
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'upload' && (
              <form onSubmit={handleProcessUpload} className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Feed</label>
                  <select
                    value={uploadFeedId}
                    onChange={(e) => setUploadFeedId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {feeds.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.systemName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Choose File (.csv)
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setUploadFileName(f.name);
                    }}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                  />
                </div>
                {uploadError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700">
                    {uploadError}
                  </div>
                )}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3.5 py-2 border border-slate-300 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#0B1F3A] text-white font-semibold cursor-pointer"
                  >
                    Validate &amp; Ingest
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
