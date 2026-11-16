import { useMemo, useState } from 'react';
import { ApprovalsView } from './components/ApprovalsView';
import { AuditConfigView } from './components/AuditConfigView';
import { BaselEngineView } from './components/BaselEngineView';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { OverviewIngestionView } from './components/OverviewIngestionView';
import { QualityExceptionsView } from './components/QualityExceptionsView';
import { RbiPortalView } from './components/RbiPortalView';
import { ReconciliationView } from './components/ReconciliationView';
import { ReportsView } from './components/ReportsView';
import { ALLOWED_VIEWS_BY_ROLE, WorkspaceShell } from './components/WorkspaceShell';
import {
  INITIAL_APPROVAL_STAGES,
  INITIAL_AUDIT_EVENTS,
  INITIAL_CALCULATION_RUNS,
  INITIAL_CAPITAL,
  INITIAL_CONFIG,
  INITIAL_CONFIG_REGISTRY,
  INITIAL_EXCEPTIONS,
  INITIAL_FEEDS,
  INITIAL_INGESTION_RUNS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PORTFOLIOS,
  INITIAL_QUERIES,
  INITIAL_RBAC_MATRIX,
  INITIAL_RECONCILIATION,
  INITIAL_REPORTS,
  INITIAL_SOURCE_SYSTEMS,
  INITIAL_VALIDATION_RULES,
  STAKEHOLDER_ROLES,
} from './data/mockBankingData';
import {
  AlertNotification,
  ApprovalStage,
  AuditEvent,
  CalculationRunRecord,
  CapitalInputs,
  ConfigRegistryItem,
  ExcelPasteRow,
  ExceptionBreak,
  IngestionRunRecord,
  NavView,
  PortfolioExposure,
  RbacModulePermissionRow,
  ReconciliationRow,
  RegulatorQuery,
  RegulatoryConfig,
  RegulatoryReport,
  SourceFeed,
  SourceSystemRecord,
  StakeholderId,
  ValidationRule,
} from './types/basel';
import { computeBaselMetrics, formatINRCr, formatPct } from './utils/baselCalculations';

type AppScreen = NavView | 'login';

function nowIst(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(
    d.getSeconds()
  ).padStart(2, '0')} IST`;
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('landing');
  const [loginTargetRole, setLoginTargetRole] = useState<StakeholderId>('reporting-analyst');
  const [currentRoleId, setCurrentRoleId] = useState<StakeholderId>('reporting-analyst');
  const [loggedInUserId, setLoggedInUserId] = useState<string>('HDFC-RPT-1042');
  const [customDisplayName, setCustomDisplayName] = useState<string | null>(null);
  const [simpleGuide, setSimpleGuide] = useState<boolean>(true);

  const [config, setConfig] = useState<RegulatoryConfig>(INITIAL_CONFIG);
  const [feeds, setFeeds] = useState<SourceFeed[]>(INITIAL_FEEDS);
  const [sourceSystems, setSourceSystems] = useState<SourceSystemRecord[]>(INITIAL_SOURCE_SYSTEMS);
  const [ingestionRuns, setIngestionRuns] = useState<IngestionRunRecord[]>(INITIAL_INGESTION_RUNS);
  const [calculationRuns, setCalculationRuns] = useState<CalculationRunRecord[]>(
    INITIAL_CALCULATION_RUNS
  );
  const [configRegistry, setConfigRegistry] = useState<ConfigRegistryItem[]>(INITIAL_CONFIG_REGISTRY);
  const [rules, setRules] = useState<ValidationRule[]>(INITIAL_VALIDATION_RULES);
  const [exceptions, setExceptions] = useState<ExceptionBreak[]>(INITIAL_EXCEPTIONS);
  const [portfolios, setPortfolios] = useState<PortfolioExposure[]>(INITIAL_PORTFOLIOS);
  const [capital, setCapital] = useState<CapitalInputs>(INITIAL_CAPITAL);
  const [reconciliation, setReconciliation] = useState<ReconciliationRow[]>(INITIAL_RECONCILIATION);
  const [approvalStages, setApprovalStages] = useState<ApprovalStage[]>(INITIAL_APPROVAL_STAGES);
  const [reports, setReports] = useState<RegulatoryReport[]>(INITIAL_REPORTS);
  const [selectedReportId, setSelectedReportId] = useState<string>(INITIAL_REPORTS[0]?.id || 'REP-RCA3-LIVE');
  const [queries, setQueries] = useState<RegulatorQuery[]>(INITIAL_QUERIES);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(INITIAL_AUDIT_EVENTS);
  const [notifications, setNotifications] = useState<AlertNotification[]>(INITIAL_NOTIFICATIONS);
  const [rbacMatrix, setRbacMatrix] = useState<RbacModulePermissionRow[]>(INITIAL_RBAC_MATRIX);

  const baseRole =
    STAKEHOLDER_ROLES.find((r) => r.id === currentRoleId) || STAKEHOLDER_ROLES[0];
  const currentRole = customDisplayName
    ? { ...baseRole, personName: customDisplayName }
    : baseRole;

  const metrics = useMemo(
    () => computeBaselMetrics(portfolios, capital, config),
    [portfolios, capital, config]
  );

  const openBreaks = exceptions.filter((e) => e.status === 'Open');
  const openBreaksCount = openBreaks.length;
  const criticalBreaksCount = openBreaks.filter((e) => e.severity === 'Critical').length;
  const reconBreakCount = reconciliation.filter((r) => r.status === 'Variance Break').length;
  const openQueryCount = queries.filter((q) => q.status === 'Open').length;
  const publishedReportsCount = reports.filter((r) => r.status === 'Published to RBI').length;

  const appendAudit = (
    actionType: AuditEvent['actionType'],
    summary: string,
    referenceId: string,
    actorOverride?: string
  ) => {
    const newEvent: AuditEvent = {
      id: `AUD-${902 + auditEvents.length}`,
      timestamp: nowIst(),
      actor: actorOverride || currentRole.personName,
      role: currentRole.title,
      actionType,
      summary,
      referenceId,
    };
    setAuditEvents((prev) => [newEvent, ...prev]);
  };

  const handleGoToLogin = (roleId?: StakeholderId) => {
    if (roleId) setLoginTargetRole(roleId);
    setScreen('login');
  };

  const handleLoginSuccess = (roleId: StakeholderId, enteredId: string, displayName?: string) => {
    const targetRole = STAKEHOLDER_ROLES.find((r) => r.id === roleId) || STAKEHOLDER_ROLES[0];
    setCurrentRoleId(roleId);
    setLoggedInUserId(enteredId);
    setCustomDisplayName(displayName || null);
    setScreen(targetRole.defaultView);
    appendAudit(
      'Config',
      `User ${enteredId} signed in as ${targetRole.title} (Standard Password Auth).`,
      enteredId,
      displayName || targetRole.personName
    );
  };

  const handleSelectView = (view: NavView) => {
    if (view === 'landing') {
      setScreen('landing');
      return;
    }
    const allowed = ALLOWED_VIEWS_BY_ROLE[currentRoleId] || [currentRole.defaultView];
    if (allowed.includes(view)) {
      setScreen(view);
    } else {
      setScreen(allowed[0]);
    }
  };

  const handleSignOut = () => {
    appendAudit('Config', `User ${loggedInUserId} (${currentRole.title}) signed out.`, loggedInUserId);
    setCustomDisplayName(null);
    setScreen('login');
  };

  const handleRerunFeed = (feedId: string) => {
    const target = feeds.find((f) => f.id === feedId);
    if (!target) return;
    setFeeds((prev) =>
      prev.map((f) =>
        f.id === feedId
          ? { ...f, status: 'Loaded', completenessPct: 100, arrivalTime: nowIst().slice(0, 5) + ' IST' }
          : f
      )
    );
    setIngestionRuns((prev) => [
      {
        id: `RUN-2026-${845 + prev.length}`,
        feedId,
        feedName: target.systemName,
        timestamp: nowIst(),
        status: 'Completed',
        records: target.recordsLoaded,
        message: 'Manual feed re-run completed at 100% completeness.',
      },
      ...prev,
    ]);
    appendAudit('Ingestion', `Re-ran source feed ${target.systemName}; 100% loaded.`, feedId);
  };

  const handleSimulateLateFeed = (feedId: string) => {
    const target = feeds.find((f) => f.id === feedId);
    if (!target) return;
    setFeeds((prev) =>
      prev.map((f) => (f.id === feedId ? { ...f, status: 'Delayed' } : f))
    );
    setIngestionRuns((prev) => [
      {
        id: `RUN-2026-${845 + prev.length}`,
        feedId,
        feedName: target.systemName,
        timestamp: nowIst(),
        status: 'Delayed',
        records: target.recordsLoaded,
        message: `Missed ${target.slaCutoff} SLA cutoff; alert raised.`,
      },
      ...prev,
    ]);
    const newAlert: AlertNotification = {
      id: `ALT-${Date.now()}`,
      timestamp: nowIst().slice(0, 5) + ' IST',
      severity: 'Warning',
      title: `SLA Breach Alert: ${target.systemName} Delayed`,
      detail: `Feed missed ${target.slaCutoff} cutoff. Escalated to Data Operations Analyst.`,
      targetView: 'overview',
      read: false,
    };
    setNotifications((prev) => [newAlert, ...prev]);
    appendAudit('Ingestion', `SLA Delay triggered for ${target.systemName}.`, feedId);
  };

  const handleAddSourceSystem = (src: Omit<SourceSystemRecord, 'id'>) => {
    const newSrc: SourceSystemRecord = {
      ...src,
      id: `SRC-00${sourceSystems.length + 1}`,
    };
    setSourceSystems((prev) => [newSrc, ...prev]);
    appendAudit('Config', `Registered new source banking system: ${src.name}.`, newSrc.id);
  };

  const handleAddFeed = (
    feed: Omit<SourceFeed, 'id' | 'recordsLoaded' | 'arrivalTime' | 'completenessPct'>
  ) => {
    const newFeed: SourceFeed = {
      ...feed,
      id: `FEED-CUSTOM-${feeds.length + 1}`,
      recordsLoaded: 0,
      arrivalTime: 'Not run',
      completenessPct: 100,
    };
    setFeeds((prev) => [newFeed, ...prev]);
    appendAudit('Ingestion', `Created new ingestion feed: ${feed.systemName}.`, newFeed.id);
  };

  const handleSimulateCsvUpload = (feedId: string, fileName: string, isCsv: boolean) => {
    const target = feeds.find((f) => f.id === feedId);
    if (!target) return;
    const rowsAdded = isCsv ? 2450 : 0;
    if (isCsv) {
      setFeeds((prev) =>
        prev.map((f) =>
          f.id === feedId
            ? {
                ...f,
                status: 'Loaded',
                completenessPct: 100,
                recordsLoaded: f.recordsLoaded + rowsAdded,
                arrivalTime: nowIst().slice(0, 5) + ' IST',
              }
            : f
        )
      );
    }
    setIngestionRuns((prev) => [
      {
        id: `RUN-2026-${845 + prev.length}`,
        feedId,
        feedName: target.systemName,
        timestamp: nowIst(),
        status: isCsv ? 'Completed' : 'Failed',
        records: rowsAdded,
        message: isCsv
          ? `Simulated CSV batch "${fileName}" validated & loaded.`
          : `Rejected "${fileName}": invalid format (CSV expected).`,
      },
      ...prev,
    ]);
    appendAudit(
      'Ingestion',
      `CSV batch simulation on ${target.systemName} (${fileName}): ${isCsv ? 'Completed' : 'Rejected'}.`,
      feedId
    );
  };

  const handleBulkExcelIngest = (feedId: string, rows: ExcelPasteRow[]) => {
    const target = feeds.find((f) => f.id === feedId) || feeds[0];
    if (!target || rows.length === 0) return;
    const validRows = rows.filter((r) => r.valid);
    const totalAddedCr = validRows.reduce((acc, r) => acc + r.exposureCr, 0);

    setFeeds((prev) =>
      prev.map((f) =>
        f.id === target.id
          ? {
              ...f,
              status: 'Loaded',
              completenessPct: 100,
              recordsLoaded: f.recordsLoaded + validRows.length,
              totalValueCr: f.totalValueCr + totalAddedCr,
              arrivalTime: nowIst().slice(0, 5) + ' IST',
            }
          : f
      )
    );
    setIngestionRuns((prev) => [
      {
        id: `RUN-2026-${845 + prev.length}`,
        feedId: target.id,
        feedName: target.systemName,
        timestamp: nowIst(),
        status: 'Completed',
        records: validRows.length,
        message: `Excel bulk copy-paste ingested ${validRows.length} rows (${formatINRCr(totalAddedCr, 2)}).`,
      },
      ...prev,
    ]);
    appendAudit(
      'Ingestion',
      `Excel bulk paste on ${target.systemName}: ${validRows.length} records (${formatINRCr(totalAddedCr, 2)}) ingested by ${currentRole.title}.`,
      target.id
    );
  };

  const handleToggleRbacFlag = (
    moduleId: string,
    roleId: StakeholderId,
    flag: 'R' | 'W' | 'X'
  ) => {
    setRbacMatrix((prev) =>
      prev.map((row) => {
        if (row.moduleId !== moduleId) return row;
        const raw = row.permissions[roleId] || '';
        const parts = raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const hasFlag = parts.includes(flag);
        const nextParts = hasFlag
          ? parts.filter((p) => p !== flag)
          : [...parts, flag];
        return {
          ...row,
          permissions: {
            ...row.permissions,
            [roleId]: nextParts.join(', '),
          },
        };
      })
    );
    appendAudit(
      'Config',
      `Updated RBAC permission ${flag} on module ${moduleId} for ${roleId}.`,
      `RBAC-${moduleId}`
    );
  };

  const handleResolveException = (
    exceptionId: string,
    action: 'Resolved' | 'Overridden',
    reasonCode: string,
    note: string
  ) => {
    const target = exceptions.find((e) => e.id === exceptionId);
    if (!target) return;

    setExceptions((prev) =>
      prev.map((e) =>
        e.id === exceptionId
          ? {
              ...e,
              status: action,
              reasonCode,
              resolutionNote: note,
              resolvedBy: currentRole.personName,
              resolvedAt: nowIst(),
            }
          : e
      )
    );
    setRules((prev) =>
      prev.map((r) => (r.id === target.ruleId ? { ...r, failedRecords: 0 } : r))
    );
    appendAudit(
      action === 'Overridden' ? 'Override' : 'Validation',
      `${action} ${exceptionId} (${reasonCode}): ${note}`,
      exceptionId
    );
  };

  const handleCreateException = (ex: {
    title: string;
    sourceSystem: string;
    severity: 'Critical' | 'Warning';
    impactCr: number;
    plainWhy: string;
    plainFix: string;
  }) => {
    const newEx: ExceptionBreak = {
      id: `EXC-2026-${106 + exceptions.length}`,
      ruleId: 'DQ-01',
      title: ex.title,
      plainWhy: ex.plainWhy,
      plainFix: ex.plainFix,
      sourceSystem: ex.sourceSystem,
      impactCr: ex.impactCr,
      severity: ex.severity,
      ageingHours: 0.1,
      ownerRole: 'Data Quality Analyst',
      status: 'Open',
    };
    setExceptions((prev) => [newEx, ...prev]);
    appendAudit('Validation', `Logged new exception ${newEx.id}: ${ex.title}`, newEx.id);
  };

  const handleToggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
    appendAudit('Config', `Toggled Data Quality rule ${ruleId}.`, ruleId);
  };

  const handleRunCalculationSnapshot = () => {
    const newRun: CalculationRunRecord = {
      id: `CAL-2026-0${calculationRuns.length + 1}`,
      area: 'Basel IV Output Floor Pack',
      period: config.reportingDate,
      version: `v1.${4 + calculationRuns.length}`,
      status: 'Completed',
      outputCr: Number(metrics.bindingRwaCr.toFixed(2)),
      timestamp: nowIst().slice(0, 5) + ' IST',
      triggeredBy: `${currentRole.personName} (${currentRole.title})`,
    };
    setCalculationRuns((prev) => [newRun, ...prev]);
    appendAudit(
      'Config',
      `Saved Basel IV calculation run ${newRun.id}: CRAR ${formatPct(metrics.crarPct)}, Binding RWA ${formatINRCr(metrics.bindingRwaCr, 0)}.`,
      newRun.id
    );
  };

  const handleUpdatePortfolioExposure = (id: string, exposureCr: number) => {
    setPortfolios((prev) =>
      prev.map((p) => (p.id === id ? { ...p, exposureCr } : p))
    );
  };

  const handleUpdatePortfolioWeight = (id: string, stdRiskWeightPct: number) => {
    setPortfolios((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stdRiskWeightPct } : p))
    );
  };

  const handleUpdateCapital = (patch: Partial<CapitalInputs>) => {
    setCapital((prev) => ({ ...prev, ...patch }));
  };

  const handleApplyPreset = (preset: 'live' | 'loan-surge' | 'liquidity-stress') => {
    if (preset === 'live') {
      setPortfolios(INITIAL_PORTFOLIOS);
      setCapital(INITIAL_CAPITAL);
    } else if (preset === 'loan-surge') {
      setPortfolios(
        INITIAL_PORTFOLIOS.map((p) =>
          p.id === 'PORT-CORP' ? { ...p, exposureCr: p.exposureCr + 65000 } : p
        )
      );
      setCapital(INITIAL_CAPITAL);
    } else if (preset === 'liquidity-stress') {
      setPortfolios(INITIAL_PORTFOLIOS);
      setCapital({
        ...INITIAL_CAPITAL,
        hqlaCr: 76000,
        netCashOutflow30dCr: 84000,
      });
    }
  };

  const handleResolveReconBreak = (rowId: string, reasonCode: string, note: string) => {
    setReconciliation((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              riskBalanceCr: r.glBalanceCr,
              baselReportCr: r.glBalanceCr,
              status: 'Adjusted',
              reasonCode,
              adjustmentNote: note,
              resolvedBy: currentRole.personName,
            }
          : r
      )
    );
    appendAudit(
      'Reconciliation',
      `Adjusted GL variance on ${rowId} (${reasonCode}): ${note}`,
      rowId
    );
  };

  const handleAddReconciliation = (item: {
    lineItem: string;
    riskSourceSystem: string;
    glAccountCode: string;
    riskBalanceCr: number;
    glBalanceCr: number;
    toleranceCr: number;
  }) => {
    const diff = Math.abs(item.riskBalanceCr - item.glBalanceCr);
    const isBreak = diff > item.toleranceCr;
    const newRow: ReconciliationRow = {
      id: `REC-0${reconciliation.length + 1}`,
      lineItem: item.lineItem,
      plainDesc: `Automated GL comparison between ${item.riskSourceSystem} and ${item.glAccountCode}.`,
      riskSourceSystem: item.riskSourceSystem,
      riskBalanceCr: item.riskBalanceCr,
      glAccountCode: item.glAccountCode,
      glBalanceCr: item.glBalanceCr,
      baselReportCr: item.glBalanceCr,
      toleranceCr: item.toleranceCr,
      status: isBreak ? 'Variance Break' : 'Matched',
      breakCause: isBreak
        ? `₹ ${diff.toFixed(2)} Cr variance exceeded tolerance limit of ₹ ${item.toleranceCr.toFixed(2)} Cr.`
        : undefined,
    };
    setReconciliation((prev) => [newRow, ...prev]);
    if (isBreak) {
      handleCreateException({
        title: `GL Variance Break: ${item.lineItem}`,
        sourceSystem: item.riskSourceSystem,
        severity: 'Warning',
        impactCr: diff,
        plainWhy: `Risk figure differs from Finance GL by ₹ ${diff.toFixed(2)} Cr.`,
        plainFix: 'Review in GL Reconciliation and post Finance timing adjustment.',
      });
    }
    appendAudit(
      'Reconciliation',
      `Ran reconciliation ${newRow.id} (${item.lineItem}): ${newRow.status}.`,
      newRow.id
    );
  };

  const handleRegenerateReports = () => {
    setReports((prev) =>
      prev.map((rep) => {
        if (rep.status === 'Published to RBI') return rep;
        if (rep.code === 'RBI-RCA3-B4') {
          return {
            ...rep,
            reportDate: config.reportingDate,
            keyMetricValue: `${formatPct(metrics.crarPct)} / ${formatPct(metrics.cet1RatioPct)}`,
            rows: [
              {
                scheduleCode: 'SCH-CAP-01',
                particulars: 'Common Equity Tier 1 (CET1) Capital',
                amountOrRatio: `${formatINRCr(capital.cet1Cr)} (${formatPct(metrics.cet1RatioPct)})`,
                rbiBenchmark: `Min ${formatPct(config.rbiMinCet1Pct)}`,
                complianceStatus: metrics.complianceChecks.cet1Ok ? 'Compliant' : 'Breach',
              },
              {
                scheduleCode: 'SCH-CAP-02',
                particulars: 'Total Tier 1 Capital (CET1 + AT1)',
                amountOrRatio: `${formatINRCr(metrics.tier1CapitalCr)} (${formatPct(metrics.tier1RatioPct)})`,
                rbiBenchmark: `Min ${formatPct(config.rbiMinTier1Pct)}`,
                complianceStatus: metrics.complianceChecks.tier1Ok ? 'Compliant' : 'Breach',
              },
              {
                scheduleCode: 'SCH-CAP-03',
                particulars: 'Total Regulatory Capital (CRAR)',
                amountOrRatio: `${formatINRCr(metrics.totalCapitalCr)} (${formatPct(metrics.crarPct)})`,
                rbiBenchmark: `Min ${formatPct(config.rbiMinCrarPct)}`,
                complianceStatus: metrics.complianceChecks.crarOk ? 'Compliant' : 'Breach',
              },
              {
                scheduleCode: 'SCH-RWA-01',
                particulars: 'Standardized Total RWA (SA-CR + FRTB + SMA + CVA)',
                amountOrRatio: formatINRCr(metrics.totalStdRwaCr),
                rbiBenchmark: '100% Standardized Base',
                complianceStatus: 'Compliant',
              },
              {
                scheduleCode: 'SCH-RWA-02',
                particulars: `${config.baselOutputFloorPct}% Basel IV Output Floor Binding RWA`,
                amountOrRatio: formatINRCr(metrics.bindingRwaCr),
                rbiBenchmark: metrics.isFloorBinding ? 'Output Floor Binding' : 'Internal Model Active',
                complianceStatus: metrics.isFloorBinding ? 'Watch' : 'Compliant',
              },
            ],
          };
        }
        if (rep.code === 'RBI-BLR1-LCR') {
          return {
            ...rep,
            reportDate: config.reportingDate,
            keyMetricValue: `${formatPct(metrics.lcrPct)} / ${formatPct(metrics.nsfrPct)}`,
            rows: [
              {
                scheduleCode: 'SCH-LCR-01',
                particulars: 'High-Quality Liquid Assets (HQLA)',
                amountOrRatio: formatINRCr(capital.hqlaCr),
                rbiBenchmark: 'Level 1 & Level 2A/B',
                complianceStatus: 'Compliant',
              },
              {
                scheduleCode: 'SCH-LCR-02',
                particulars: '30-Day Stressed Net Cash Outflows',
                amountOrRatio: formatINRCr(capital.netCashOutflow30dCr),
                rbiBenchmark: 'Basel IV Stress Weights',
                complianceStatus: 'Compliant',
              },
              {
                scheduleCode: 'SCH-LCR-03',
                particulars: 'Liquidity Coverage Ratio (LCR)',
                amountOrRatio: formatPct(metrics.lcrPct),
                rbiBenchmark: `RBI Min ${formatPct(config.rbiMinLcrPct)}`,
                complianceStatus: metrics.complianceChecks.lcrOk ? 'Compliant' : 'Breach',
              },
              {
                scheduleCode: 'SCH-NSFR-01',
                particulars: 'Net Stable Funding Ratio (NSFR)',
                amountOrRatio: formatPct(metrics.nsfrPct),
                rbiBenchmark: `RBI Min ${formatPct(config.rbiMinNsfrPct)}`,
                complianceStatus: metrics.complianceChecks.nsfrOk ? 'Compliant' : 'Breach',
              },
            ],
          };
        }
        return rep;
      })
    );
    appendAudit('Config', 'Synchronized daily RBI report templates with live Basel IV metrics.', 'REP-SYNC');
  };

  const handleCreateReport = (item: { code: string; title: string; plainDesc: string }) => {
    const newRep: RegulatoryReport = {
      id: `REP-CUSTOM-${reports.length + 1}`,
      code: item.code,
      title: item.title,
      plainDesc: item.plainDesc,
      reportDate: config.reportingDate,
      version: 'v1.0 (Draft)',
      status: 'Draft',
      keyMetricLabel: 'CRAR / Binding RWA',
      keyMetricValue: `${formatPct(metrics.crarPct)} / ${formatINRCr(metrics.bindingRwaCr, 0)}`,
      evidenceHash: `SHA256-HDFC-${config.reportingDate.replace(/-/g, '')}-${reports.length + 10}`,
      rows: [
        {
          scheduleCode: 'SCH-01',
          particulars: 'Total Regulatory Capital (CRAR)',
          amountOrRatio: `${formatINRCr(metrics.totalCapitalCr)} (${formatPct(metrics.crarPct)})`,
          rbiBenchmark: `Min ${formatPct(config.rbiMinCrarPct)}`,
          complianceStatus: metrics.complianceChecks.crarOk ? 'Compliant' : 'Breach',
        },
        {
          scheduleCode: 'SCH-02',
          particulars: `${config.baselOutputFloorPct}% Basel IV Output Floor Binding RWA`,
          amountOrRatio: formatINRCr(metrics.bindingRwaCr),
          rbiBenchmark: 'Basel IV Standardized Floor',
          complianceStatus: 'Compliant',
        },
      ],
    };
    setReports((prev) => [newRep, ...prev]);
    appendAudit('Config', `Created draft report ${newRep.code} (${newRep.title}).`, newRep.id);
  };

  const handleSubmitReportForReview = (reportId: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: 'In Review' } : r))
    );
    appendAudit('Approval', `Submitted report ${reportId} into Review & Approvals queue.`, reportId);
  };

  const handleReturnStage = (stageId: string, comment: string) => {
    const stageIdx = approvalStages.findIndex((s) => s.id === stageId);
    if (stageIdx === -1) return;
    setApprovalStages((prev) =>
      prev.map((s) =>
        s.order === 1
          ? { ...s, status: 'Pending', approvedBy: undefined, approvedAt: undefined, comment }
          : { ...s, status: 'Waiting', approvedBy: undefined, approvedAt: undefined, comment: undefined }
      )
    );
    setNotifications((prev) => [
      {
        id: `ALT-RET-${Date.now()}`,
        timestamp: nowIst().slice(0, 5) + ' IST',
        severity: 'Critical',
        title: `Report Returned from Stage ${approvalStages[stageIdx].order}`,
        detail: `${comment} Returned to Reporting Analyst (Maker) for correction.`,
        targetView: 'approvals',
        read: false,
      },
      ...prev,
    ]);
    appendAudit('Approval', `Returned stage ${stageId} to Maker: ${comment}`, stageId);
  };

  const handleApproveStage = (stageId: string, comment: string) => {
    const stageIdx = approvalStages.findIndex((s) => s.id === stageId);
    if (stageIdx === -1) return;

    const timestamp = nowIst();
    const updatedStages = approvalStages.map((s, idx) => {
      if (idx === stageIdx) {
        return {
          ...s,
          status: 'Approved' as const,
          approvedBy: currentRole.personName,
          approvedAt: timestamp,
          comment,
        };
      }
      if (idx === stageIdx + 1 && s.status === 'Waiting') {
        return { ...s, status: 'Pending' as const };
      }
      return s;
    });

    setApprovalStages(updatedStages);
    const stage = approvalStages[stageIdx];
    appendAudit('Approval', `Approved ${stage.stageName}: ${comment}`, stage.id);

    // If Stage 5 (Compliance Publish to RBI) completes, publish reports to RBI Portal
    if (stage.order === 5) {
      setReports((prev) =>
        prev.map((r) =>
          r.status !== 'Published to RBI'
            ? {
                ...r,
                status: 'Published to RBI',
                version: 'v1.4 (Final Certified)',
                publishedAt: `${config.reportingDate} · ${timestamp}`,
                publishedBy: `${currentRole.personName} (${currentRole.title})`,
              }
            : r
        )
      );
      setNotifications((prev) => [
        {
          id: `ALT-PUB-${Date.now()}`,
          timestamp: timestamp.slice(0, 5) + ' IST',
          severity: 'Info',
          title: 'Daily Basel IV Reports Published to RBI Portal',
          detail: `Certified by ${currentRole.personName}. RBI Supervisory Users can now inspect the filing.`,
          targetView: 'rbi-portal',
          read: false,
        },
        ...prev,
      ]);
      appendAudit(
        'Publication',
        `Published certified daily Basel IV reports (${config.reportingDate}) to RBI Supervisory Portal.`,
        'RBI-VAULT'
      );
    }
  };

  const handleRaiseQuery = (
    reportCode: string,
    subject: string,
    question: string,
    priority: 'High' | 'Standard'
  ) => {
    const newQuery: RegulatorQuery = {
      id: `RBI-Q-${885 + queries.length}`,
      reportCode,
      subject,
      plainQuestion: question,
      raisedBy: `${currentRole.personName} (RBI)`,
      raisedAt: `${config.reportingDate} · ${nowIst().slice(0, 5)} IST`,
      dueDate: 'Tomorrow · 17:00 IST',
      priority,
      status: 'Open',
    };
    setQueries((prev) => [newQuery, ...prev]);
    setNotifications((prev) => [
      {
        id: `ALT-Q-${Date.now()}`,
        timestamp: nowIst().slice(0, 5) + ' IST',
        severity: priority === 'High' ? 'Critical' : 'Warning',
        title: `New RBI Supervisory Query: ${newQuery.id}`,
        detail: `${subject} (${reportCode})`,
        targetView: 'rbi-portal',
        read: false,
      },
      ...prev,
    ]);
    appendAudit('RBI Query', `Raised supervisory query ${newQuery.id}: ${subject}`, newQuery.id);
  };

  const handleRespondQuery = (
    queryId: string,
    responseText: string,
    attachmentName: string,
    closeNow: boolean
  ) => {
    setQueries((prev) =>
      prev.map((q) =>
        q.id === queryId
          ? {
              ...q,
              status: closeNow ? 'Closed' : 'Responded',
              responseText,
              attachmentName,
              respondedBy: currentRole.personName,
              respondedAt: `${config.reportingDate} · ${nowIst().slice(0, 5)} IST`,
            }
          : q
      )
    );
    appendAudit(
      'RBI Query',
      `Responded & closed query ${queryId} with attachment ${attachmentName}.`,
      queryId
    );
  };

  const handleUpdateConfig = (patch: Partial<RegulatoryConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    appendAudit('Config', `Updated RBI/Basel IV configuration rules.`, 'CFG-RBI');
  };

  const handleAddConfigItem = (item: Omit<ConfigRegistryItem, 'id'>) => {
    const newItem: ConfigRegistryItem = {
      ...item,
      id: `CFG-00${configRegistry.length + 1}`,
    };
    setConfigRegistry((prev) => [newItem, ...prev]);
    appendAudit('Config', `Added configuration parameter ${item.name} = ${item.value}.`, newItem.id);
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleResetDemoData = () => {
    setConfig(INITIAL_CONFIG);
    setFeeds(INITIAL_FEEDS);
    setSourceSystems(INITIAL_SOURCE_SYSTEMS);
    setIngestionRuns(INITIAL_INGESTION_RUNS);
    setCalculationRuns(INITIAL_CALCULATION_RUNS);
    setConfigRegistry(INITIAL_CONFIG_REGISTRY);
    setRules(INITIAL_VALIDATION_RULES);
    setExceptions(INITIAL_EXCEPTIONS);
    setPortfolios(INITIAL_PORTFOLIOS);
    setCapital(INITIAL_CAPITAL);
    setReconciliation(INITIAL_RECONCILIATION);
    setApprovalStages(INITIAL_APPROVAL_STAGES);
    setReports(INITIAL_REPORTS);
    setQueries(INITIAL_QUERIES);
    setAuditEvents(INITIAL_AUDIT_EVENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setRbacMatrix(INITIAL_RBAC_MATRIX);
    appendAudit('Config', 'Workspace reset to clean baseline banking snapshot.', 'RESET');
  };

  if (screen === 'landing') {
    return (
      <LandingPage
        metrics={metrics}
        openBreaksCount={openBreaksCount}
        publishedReportsCount={publishedReportsCount}
        onGoToLogin={handleGoToLogin}
      />
    );
  }

  if (screen === 'login') {
    return (
      <LoginPage
        initialRoleId={loginTargetRole}
        onLoginSuccess={handleLoginSuccess}
        onBackToLanding={() => setScreen('landing')}
      />
    );
  }

  const allowedForCurrentRole = ALLOWED_VIEWS_BY_ROLE[currentRoleId] || [currentRole.defaultView];
  const activeView: NavView = allowedForCurrentRole.includes(screen)
    ? screen
    : allowedForCurrentRole[0];

  return (
    <WorkspaceShell
      currentView={activeView}
      onSelectView={handleSelectView}
      currentRole={currentRole}
      loggedInUserId={loggedInUserId}
      simpleGuide={simpleGuide}
      onToggleSimpleGuide={() => setSimpleGuide((v) => !v)}
      notifications={notifications}
      onMarkNotificationRead={handleMarkNotificationRead}
      openBreaksCount={openBreaksCount}
      reconBreakCount={reconBreakCount}
      openQueryCount={openQueryCount}
      reportingDate={config.reportingDate}
      onSignOut={handleSignOut}
      onBackToLanding={() => setScreen('landing')}
    >
      {activeView === 'overview' && (
        <OverviewIngestionView
          metrics={metrics}
          config={config}
          feeds={feeds}
          sourceSystems={sourceSystems}
          ingestionRuns={ingestionRuns}
          reports={reports}
          auditEvents={auditEvents}
          approvalStages={approvalStages}
          currentRole={currentRole}
          rbacMatrix={rbacMatrix}
          openBreaksCount={openBreaksCount}
          criticalBreaksCount={criticalBreaksCount}
          reconBreakCount={reconBreakCount}
          simpleGuide={simpleGuide}
          onRerunFeed={handleRerunFeed}
          onSimulateLateFeed={handleSimulateLateFeed}
          onAddSourceSystem={handleAddSourceSystem}
          onAddFeed={handleAddFeed}
          onSimulateCsvUpload={handleSimulateCsvUpload}
          onBulkExcelIngest={handleBulkExcelIngest}
          onNavigate={(view, reportId) => {
            if (reportId) setSelectedReportId(reportId);
            handleSelectView(view);
          }}
        />
      )}

      {activeView === 'quality' && (
        <QualityExceptionsView
          rules={rules}
          exceptions={exceptions}
          feeds={feeds}
          currentRole={currentRole}
          simpleGuide={simpleGuide}
          onResolveException={handleResolveException}
          onCreateException={handleCreateException}
          onToggleRule={handleToggleRule}
        />
      )}

      {activeView === 'basel' && (
        <BaselEngineView
          portfolios={portfolios}
          capital={capital}
          config={config}
          metrics={metrics}
          calculationRuns={calculationRuns}
          simpleGuide={simpleGuide}
          onUpdatePortfolioExposure={handleUpdatePortfolioExposure}
          onUpdatePortfolioWeight={handleUpdatePortfolioWeight}
          onUpdateCapital={handleUpdateCapital}
          onApplyPreset={handleApplyPreset}
          onRunCalculationSnapshot={handleRunCalculationSnapshot}
        />
      )}

      {activeView === 'reconciliation' && (
        <ReconciliationView
          rows={reconciliation}
          currentRole={currentRole}
          simpleGuide={simpleGuide}
          onResolveReconBreak={handleResolveReconBreak}
          onAddReconciliation={handleAddReconciliation}
        />
      )}

      {activeView === 'reports' && (
        <ReportsView
          reports={reports}
          metrics={metrics}
          criticalBreaksCount={criticalBreaksCount}
          simpleGuide={simpleGuide}
          selectedReportId={selectedReportId}
          onSelectReport={setSelectedReportId}
          onRegenerateReports={handleRegenerateReports}
          onCreateReport={handleCreateReport}
          onSubmitReportForReview={handleSubmitReportForReview}
          onOpenApprovals={() => handleSelectView('approvals')}
        />
      )}

      {activeView === 'approvals' && (
        <ApprovalsView
          stages={approvalStages}
          currentRole={currentRole}
          metrics={metrics}
          reportingDate={config.reportingDate}
          criticalBreaksCount={criticalBreaksCount}
          reconBreakCount={reconBreakCount}
          autoBlockEnabled={config.autoBlockOnCriticalBreak}
          simpleGuide={simpleGuide}
          onApproveStage={handleApproveStage}
          onReturnStage={handleReturnStage}
          onNavigate={handleSelectView}
        />
      )}

      {activeView === 'rbi-portal' && (
        <RbiPortalView
          reports={reports}
          queries={queries}
          currentRole={currentRole}
          simpleGuide={simpleGuide}
          onRaiseQuery={handleRaiseQuery}
          onRespondQuery={handleRespondQuery}
        />
      )}

      {activeView === 'audit-config' && (
        <AuditConfigView
          auditEvents={auditEvents}
          config={config}
          configRegistry={configRegistry}
          notifications={notifications}
          currentRole={currentRole}
          rbacMatrix={rbacMatrix}
          simpleGuide={simpleGuide}
          onUpdateConfig={handleUpdateConfig}
          onAddConfigItem={handleAddConfigItem}
          onToggleRbacFlag={handleToggleRbacFlag}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onResetDemoData={handleResetDemoData}
        />
      )}
    </WorkspaceShell>
  );
}
