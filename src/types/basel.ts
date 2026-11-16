export type NavView =
  | 'landing'
  | 'overview'
  | 'quality'
  | 'basel'
  | 'reconciliation'
  | 'reports'
  | 'approvals'
  | 'rbi-portal'
  | 'audit-config';

export type StakeholderId =
  | 'reporting-analyst'
  | 'data-quality-analyst'
  | 'data-ops-analyst'
  | 'risk-analyst'
  | 'reporting-manager'
  | 'finance-approver'
  | 'compliance-officer'
  | 'auditor'
  | 'reg-admin'
  | 'super-admin'
  | 'rbi-supervisor';

export interface StakeholderRole {
  id: StakeholderId;
  title: string;
  personName: string;
  department: string;
  plainEnglishRole: string;
  permissionsSummary: string;
  defaultView: NavView;
  canApproveStage?: string;
  isRegulator?: boolean;
}

export interface SourceFeed {
  id: string;
  systemName: string;
  domain: string;
  plainDesc: string;
  frequency?: 'Daily' | 'Weekly' | 'Monthly' | 'On Demand';
  format?: 'SFTP' | 'API' | 'CSV' | 'ISO20022';
  recordsLoaded: number;
  arrivalTime: string;
  slaCutoff: string;
  status: 'Loaded' | 'Delayed' | 'Failed';
  completenessPct: number;
  totalValueCr: number;
}

export interface SourceSystemRecord {
  id: string;
  name: string;
  type: 'Database' | 'API' | 'File' | 'Core Ledger';
  owner: string;
  status: 'Active' | 'Inactive';
}

export interface IngestionRunRecord {
  id: string;
  feedId: string;
  feedName: string;
  timestamp: string;
  status: 'Completed' | 'Delayed' | 'Failed';
  records: number;
  message: string;
}

export interface CalculationRunRecord {
  id: string;
  area: 'Credit Risk (SA-CR & IRB)' | 'Market Risk (FRTB)' | 'Operational Risk (SMA)' | 'CVA Risk' | 'Basel IV Output Floor Pack';
  period: string;
  version: string;
  status: 'Completed' | 'Pending';
  outputCr: number;
  timestamp: string;
  triggeredBy: string;
}

export interface ConfigRegistryItem {
  id: string;
  type: 'Reporting Calendar' | 'Validation Rule' | 'Reconciliation Tolerance' | 'Notification Setting' | 'Reference Data';
  name: string;
  value: string;
  status: 'Active' | 'Inactive';
}

export interface ValidationRule {
  id: string;
  name: string;
  category: 'Completeness' | 'Accuracy' | 'Timeliness' | 'Duplicate' | 'Threshold' | 'Business Rule';
  plainDesc: string;
  enabled: boolean;
  checkedRecords: number;
  failedRecords: number;
  severity: 'Critical' | 'Warning';
}

export interface ExceptionBreak {
  id: string;
  ruleId: string;
  title: string;
  plainWhy: string;
  plainFix: string;
  sourceSystem: string;
  impactCr: number;
  severity: 'Critical' | 'Warning';
  ageingHours: number;
  ownerRole: string;
  status: 'Open' | 'Overridden' | 'Resolved';
  reasonCode?: string;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface PortfolioExposure {
  id: string;
  assetClass: string;
  plainDesc: string;
  exposureCr: number;
  stdRiskWeightPct: number;
  irbRiskWeightPct: number;
}

export interface CapitalInputs {
  cet1Cr: number;
  at1Cr: number;
  tier2Cr: number;
  marketRwaStdCr: number;
  marketRwaIrbCr: number;
  operationalRwaCr: number;
  cvaRwaCr: number;
  totalLeverageExposureCr: number;
  hqlaCr: number;
  netCashOutflow30dCr: number;
  availableStableFundingCr: number;
  requiredStableFundingCr: number;
}

export interface ReconciliationRow {
  id: string;
  lineItem: string;
  plainDesc: string;
  riskSourceSystem: string;
  riskBalanceCr: number;
  glAccountCode: string;
  glBalanceCr: number;
  baselReportCr: number;
  toleranceCr: number;
  status: 'Matched' | 'Variance Break' | 'Adjusted';
  breakCause?: string;
  adjustmentNote?: string;
  reasonCode?: string;
  resolvedBy?: string;
}

export interface ApprovalStage {
  id: string;
  order: number;
  stageName: string;
  plainDesc: string;
  requiredRoleId: StakeholderId;
  requiredRoleTitle: string;
  status: 'Approved' | 'Pending' | 'Waiting';
  approvedBy?: string;
  approvedAt?: string;
  comment?: string;
}

export interface RegulatoryReport {
  id: string;
  code: string;
  title: string;
  plainDesc: string;
  reportDate: string;
  version: string;
  status: 'Draft' | 'In Review' | 'Returned' | 'Approved' | 'Published to RBI';
  publishedAt?: string;
  publishedBy?: string;
  keyMetricLabel: string;
  keyMetricValue: string;
  evidenceHash: string;
  rows: {
    scheduleCode: string;
    particulars: string;
    amountOrRatio: string;
    rbiBenchmark: string;
    complianceStatus: 'Compliant' | 'Watch' | 'Breach';
  }[];
}

export interface RegulatorQuery {
  id: string;
  reportCode: string;
  subject: string;
  plainQuestion: string;
  raisedBy: string;
  raisedAt: string;
  dueDate: string;
  priority: 'High' | 'Standard';
  status: 'Open' | 'Responded' | 'Closed';
  responseText?: string;
  attachmentName?: string;
  respondedBy?: string;
  respondedAt?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  actionType: 'Ingestion' | 'Validation' | 'Override' | 'Reconciliation' | 'Approval' | 'Publication' | 'RBI Query' | 'Config';
  summary: string;
  referenceId: string;
}

export interface AlertNotification {
  id: string;
  timestamp: string;
  severity: 'Critical' | 'Warning' | 'Info';
  title: string;
  detail: string;
  targetView: NavView;
  read: boolean;
}

export interface RegulatoryConfig {
  rbiMinCet1Pct: number;
  rbiMinTier1Pct: number;
  rbiMinCrarPct: number;
  baselOutputFloorPct: number;
  rbiMinLcrPct: number;
  rbiMinNsfrPct: number;
  rbiMinLeveragePct: number;
  dailySlaCutoffIst: string;
  reportingDate: string;
  autoBlockOnCriticalBreak: boolean;
}

export interface RbacModulePermissionRow {
  moduleId: string;
  moduleName: string;
  menuName: string;
  assignedTo: string;
  permissions: Partial<Record<StakeholderId, string>>;
}

export interface ExcelPasteRow {
  accountId: string;
  borrowerName: string;
  assetClass: string;
  exposureCr: number;
  riskWeightPct: number;
  valid: boolean;
  error?: string;
}
