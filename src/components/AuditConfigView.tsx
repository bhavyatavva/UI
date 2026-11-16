import React, { useState } from 'react';
import {
  ArrowRight,
  Bell,
  Copy,
  Download,
  GitBranch,
  History,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { STAKEHOLDER_ROLES } from '../data/mockBankingData';
import {
  AlertNotification,
  AuditEvent,
  ConfigRegistryItem,
  RbacModulePermissionRow,
  RegulatoryConfig,
  StakeholderId,
  StakeholderRole,
} from '../types/basel';
import { downloadCsv } from '../utils/baselCalculations';

interface AuditConfigViewProps {
  auditEvents: AuditEvent[];
  config: RegulatoryConfig;
  configRegistry: ConfigRegistryItem[];
  notifications: AlertNotification[];
  currentRole: StakeholderRole;
  rbacMatrix: RbacModulePermissionRow[];
  simpleGuide: boolean;
  onUpdateConfig: (patch: Partial<RegulatoryConfig>) => void;
  onAddConfigItem: (item: Omit<ConfigRegistryItem, 'id'>) => void;
  onToggleRbacFlag: (moduleId: string, roleId: StakeholderId, flag: 'R' | 'W' | 'X') => void;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onResetDemoData: () => void;
}

const LINEAGE_NODES = [
  {
    step: '1. Source Account',
    system: 'Finacle CBS · LN-MUM-884120',
    detail: 'Home Loan ₹ 1.45 Cr · LTV 68% · Mumbai West Branch',
  },
  {
    step: '2. Ingestion Batch',
    system: 'FEED-CBS · 06:12 IST',
    detail: 'Encrypted SFTP load · Schema verified · Zero duplicate IDs',
  },
  {
    step: '3. Quality Rule',
    system: 'DQ-02 LTV Range Check',
    detail: 'CERSAI property valuation matched · Passed threshold check',
  },
  {
    step: '4. Basel IV Math',
    system: 'SA-CR & 72.5% Output Floor',
    detail: '35% LTV Risk Weight → ₹ 0.51 Cr RWA contributed to schedule',
  },
  {
    step: '5. GL Match',
    system: 'OFSAA GL-110450',
    detail: 'Reconciled to ₹ 74,200 Cr Housing Book · ₹ 0.00 Cr variance',
  },
  {
    step: '6. RBI Report',
    system: 'RBI-RCA3-B4 · SCH-RWA-01',
    detail: 'Signed by Maker, Risk, Finance, Manager & Compliance',
  },
];

export const AuditConfigView: React.FC<AuditConfigViewProps> = ({
  auditEvents,
  config,
  configRegistry,
  notifications,
  currentRole,
  rbacMatrix,
  simpleGuide: _simpleGuide,
  onUpdateConfig,
  onAddConfigItem,
  onToggleRbacFlag,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onResetDemoData,
}) => {
  const [selectedNodeIdx, setSelectedNodeIdx] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [accessTab, setAccessTab] = useState<'matrix' | 'users'>('matrix');
  const [lockedRoles, setLockedRoles] = useState<Record<string, boolean>>({});
  const [adminToast, setAdminToast] = useState<string | null>(null);
  const [addCfgOpen, setAddCfgOpen] = useState(false);
  const [cfgType, setCfgType] = useState<ConfigRegistryItem['type']>('Reference Data');
  const [cfgName, setCfgName] = useState('');
  const [cfgValue, setCfgValue] = useState('');

  const isSuperAdmin = currentRole.id === 'super-admin' || currentRole.id === 'reg-admin';

  const matrixRoleCols: { id: StakeholderId; short: string }[] = [
    { id: 'super-admin', short: 'Superadmin' },
    { id: 'data-ops-analyst', short: 'Data Operations Analyst' },
    { id: 'data-quality-analyst', short: 'Data Quality Analyst' },
    { id: 'reporting-analyst', short: 'Reg. Reporting Analyst' },
    { id: 'risk-analyst', short: 'Risk Analyst' },
    { id: 'finance-approver', short: 'Finance Approver' },
    { id: 'compliance-officer', short: 'Compliance Officer' },
    { id: 'reporting-manager', short: 'Senior Manager' },
    { id: 'reg-admin', short: 'Regulatory Admin' },
    { id: 'auditor', short: 'Auditor' },
  ];

  const handleCopyMatrixTsv = () => {
    const header = ['Module', 'Menu', ...matrixRoleCols.map((c) => c.short), 'Assigned To'].join('\t');
    const lines = rbacMatrix.map((row) =>
      [
        row.moduleName,
        row.menuName,
        ...matrixRoleCols.map((c) => row.permissions[c.id] || ''),
        row.assignedTo,
      ].join('\t')
    );
    const tsv = [header, ...lines].join('\n');
    navigator.clipboard?.writeText(tsv).catch(() => {});
    setAdminToast('Copied full RBAC Module Matrix (tab-separated) for Excel.');
  };

  const handleExportMatrixCsv = () => {
    const headers = ['Module', 'Menu', ...matrixRoleCols.map((c) => c.short), 'Assigned To'];
    const rows = rbacMatrix.map((row) => [
      row.moduleName,
      row.menuName,
      ...matrixRoleCols.map((c) => row.permissions[c.id] || ''),
      row.assignedTo,
    ]);
    downloadCsv('HDFC_User_Access_RBAC_Matrix.csv', headers, rows);
  };

  const handleExportAuditCsv = () => {
    const headers = ['Event ID', 'Timestamp', 'Type', 'Actor', 'Role', 'Description', 'Reference'];
    const rows = filteredEvents.map((e) => [
      e.id,
      e.timestamp,
      e.actionType,
      e.actor,
      e.role,
      e.summary,
      e.referenceId,
    ]);
    downloadCsv(`HDFC_Basel4_Audit_Trail.csv`, headers, rows);
  };

  const filteredEvents = auditEvents.filter((ev) => {
    const matchesType = actionFilter === 'All' || ev.actionType === actionFilter;
    const matchesSearch =
      !searchTerm.trim() ||
      ev.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.referenceId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* End-to-End Data Lineage Visualizer */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-blue-700" />
          <h1 className="font-display text-base font-bold text-slate-900">
            Loan-to-RBI Trace Map (Data Lineage)
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Source Loan &rarr; Quality Rule &rarr; Basel IV Math &rarr; RBI Schedule
        </p>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {LINEAGE_NODES.map((node, idx) => {
            const isSelected = idx === selectedNodeIdx;
            return (
              <button
                key={node.step}
                type="button"
                onClick={() => setSelectedNodeIdx(idx)}
                className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[11px] font-bold text-blue-700">{node.step}</span>
                  {idx < LINEAGE_NODES.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-slate-400 hidden lg:block" />
                  )}
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-900">{node.system}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-900">
              {LINEAGE_NODES[selectedNodeIdx].step} ({LINEAGE_NODES[selectedNodeIdx].system}):
            </span>{' '}
            <span className="text-slate-700">{LINEAGE_NODES[selectedNodeIdx].detail}</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-700 font-semibold shrink-0">
            Lineage Verified
          </span>
        </div>
      </section>

      {/* FR-12 Configurable RBI Thresholds & Reporting Calendar */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-blue-700" />
              <span>RBI Thresholds &amp; Reporting Calendar Configuration</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Changes here immediately update live compliance checks across all dashboards and
              reports.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Active User: <strong>{currentRole.title}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              RBI Min CRAR (%)
            </label>
            <input
              type="number"
              step="0.5"
              disabled={!isSuperAdmin}
              value={config.rbiMinCrarPct}
              onChange={(e) => onUpdateConfig({ rbiMinCrarPct: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              RBI Min CET1 (%)
            </label>
            <input
              type="number"
              step="0.5"
              disabled={!isSuperAdmin}
              value={config.rbiMinCet1Pct}
              onChange={(e) => onUpdateConfig({ rbiMinCet1Pct: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Basel IV Output Floor (%)
            </label>
            <input
              type="number"
              step="0.5"
              disabled={!isSuperAdmin}
              value={config.baselOutputFloorPct}
              onChange={(e) => onUpdateConfig({ baselOutputFloorPct: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              RBI Min LCR (%)
            </label>
            <input
              type="number"
              step="5"
              disabled={!isSuperAdmin}
              value={config.rbiMinLcrPct}
              onChange={(e) => onUpdateConfig({ rbiMinLcrPct: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reporting Date
            </label>
            <input
              type="date"
              disabled={!isSuperAdmin}
              value={config.reportingDate}
              onChange={(e) => onUpdateConfig({ reportingDate: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Daily SLA Cutoff
            </label>
            <input
              type="text"
              disabled={!isSuperAdmin}
              value={config.dailySlaCutoffIst}
              onChange={(e) => onUpdateConfig({ dailySlaCutoffIst: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
          <div className="sm:col-span-2 flex items-end">
            <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50 w-full text-xs font-medium text-slate-800 ${isSuperAdmin ? 'cursor-pointer' : 'opacity-75 cursor-not-allowed'}`}>
              <input
                type="checkbox"
                disabled={!isSuperAdmin}
                checked={config.autoBlockOnCriticalBreak}
                onChange={(e) =>
                  onUpdateConfig({ autoBlockOnCriticalBreak: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-700"
              />
              <span>Enforce Critical Exception &amp; GL Break Publication Block</span>
            </label>
          </div>
        </div>
      </section>

      {/* User & Access Management + RBAC Module Permission Matrix */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-700" />
              <span>User &amp; Access Management · Role &amp; Module Permissions</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isSuperAdmin
                ? 'Super Admin active: manage Data Ingestion R/W/X permissions, lock/unlock users, or copy RBAC table to Excel.'
                : 'Read-Only View: Sign out and log in with Super Admin credentials to modify RBAC permissions or IT controls.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {adminToast && (
              <span className="text-xs font-semibold text-emerald-700 mr-1">{adminToast}</span>
            )}
            <button
              type="button"
              onClick={handleCopyMatrixTsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer whitespace-nowrap"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Matrix for Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportMatrixCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
            {!isSuperAdmin && (
              <span className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold whitespace-nowrap">
                Read-Only (Sign Out for Super Admin)
              </span>
            )}
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAccessTab('matrix')}
              className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                accessTab === 'matrix'
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Module Permission Matrix (R / W / X)
            </button>
            <button
              type="button"
              onClick={() => setAccessTab('users')}
              className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                accessTab === 'users'
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              User Directory &amp; IT Controls ({STAKEHOLDER_ROLES.length})
            </button>
          </div>
          <span className="text-[11px] font-mono text-slate-500 pb-2">
            Legend: R = Read · W = Write / Paste · X = Execute / Run · C = Create · U = Update
          </span>
        </div>

        {accessTab === 'matrix' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">Module</th>
                  <th className="py-3 px-3 whitespace-nowrap">Menu / Operations</th>
                  {matrixRoleCols.map((col) => (
                    <th
                      key={col.id}
                      className={`py-3 px-2.5 text-center whitespace-nowrap ${
                        col.id === 'data-ops-analyst' ? 'bg-blue-50/70 text-blue-800' : ''
                      }`}
                    >
                      {col.short}
                    </th>
                  ))}
                  <th className="py-3 px-4 whitespace-nowrap">Assigned To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rbacMatrix.map((row) => {
                  const isDataIngestion = row.moduleId === 'data-ingestion';
                  const dataOpsPerm = row.permissions['data-ops-analyst'] || '';
                  return (
                    <tr
                      key={row.moduleId}
                      className={isDataIngestion ? 'bg-blue-50/35' : 'hover:bg-slate-50/70'}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {row.moduleName}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {row.menuName}
                      </td>
                      {matrixRoleCols.map((col) => {
                        const permText = row.permissions[col.id] || '—';
                        const isOpsIngestionCell =
                          isDataIngestion && col.id === 'data-ops-analyst';
                        if (isOpsIngestionCell) {
                          return (
                            <td
                              key={col.id}
                              className="py-2.5 px-2.5 text-center bg-blue-50/70 whitespace-nowrap"
                            >
                              <div className="inline-flex items-center gap-1">
                                {(['R', 'W', 'X'] as const).map((flag) => {
                                  const active = dataOpsPerm
                                    .split(',')
                                    .map((s) => s.trim())
                                    .includes(flag);
                                  return (
                                    <button
                                      key={flag}
                                      type="button"
                                      disabled={!isSuperAdmin}
                                      onClick={() => {
                                        onToggleRbacFlag(row.moduleId, col.id, flag);
                                        setAdminToast(
                                          `Updated Data Operations Analyst ${flag} access on Data Ingestion.`
                                        );
                                      }}
                                      title={
                                        isSuperAdmin
                                          ? `Toggle ${flag} permission`
                                          : 'Switch to Super Admin to edit'
                                      }
                                      className={`w-6 h-6 rounded font-mono text-[11px] font-bold border transition-colors ${
                                        active
                                          ? 'bg-emerald-700 border-emerald-700 text-white'
                                          : 'bg-white border-slate-300 text-slate-400'
                                      } ${isSuperAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                                    >
                                      {flag}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        }
                        return (
                          <td
                            key={col.id}
                            className={`py-3 px-2.5 text-center font-mono text-[11px] whitespace-nowrap ${
                              col.id === 'data-ops-analyst' ? 'bg-blue-50/40' : ''
                            } ${
                              permText === '—'
                                ? 'text-slate-300'
                                : 'font-semibold text-slate-800'
                            }`}
                          >
                            {permText}
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {row.assignedTo}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">User &amp; Department</th>
                  <th className="py-3 px-4">RBAC Role</th>
                  <th className="py-3 px-4">Access Scope</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">IT Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {STAKEHOLDER_ROLES.map((r) => {
                  const isLocked = !!lockedRoles[r.id];
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{r.personName}</div>
                        <div className="text-[11px] text-slate-500">{r.department}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{r.title}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">{r.permissionsSummary}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            isLocked ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {isLocked ? 'Locked' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!isSuperAdmin}
                            onClick={() => {
                              setLockedRoles((prev) => ({ ...prev, [r.id]: !isLocked }));
                              setAdminToast(
                                `${r.personName} (${r.title}) ${isLocked ? 'unlocked' : 'locked'}.`
                              );
                            }}
                            className={`px-2.5 py-1 rounded border text-xs font-medium ${
                              isSuperAdmin
                                ? 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800 cursor-pointer'
                                : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {isLocked ? 'Unlock' : 'Lock'}
                          </button>
                          <button
                            type="button"
                            disabled={!isSuperAdmin}
                            onClick={() =>
                              setAdminToast(`Password reset issued for ${r.personName} (${r.title}).`)
                            }
                            className={`px-2.5 py-1 rounded border text-xs font-medium ${
                              isSuperAdmin
                                ? 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 cursor-pointer'
                                : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            Reset Pwd
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Notification Centre & Configuration Register */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-700" />
                <span>Notification &amp; SLA Alert Centre</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {notifications.filter((n) => !n.read).length} unread regulatory / SLA notifications
              </p>
            </div>
            <button
              type="button"
              onClick={onMarkAllNotificationsRead}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
            >
              Mark All Read
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex items-start justify-between gap-3 text-xs ${
                  n.read ? 'opacity-65' : 'bg-blue-50/30'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${
                        n.severity === 'Critical'
                          ? 'text-red-700'
                          : n.severity === 'Warning'
                          ? 'text-amber-700'
                          : 'text-blue-700'
                      }`}
                    >
                      {n.severity}
                    </span>
                    <span className="font-mono text-slate-400">{n.timestamp}</span>
                  </div>
                  <div className="font-semibold text-slate-900 mt-0.5">{n.title}</div>
                  <div className="text-slate-600 mt-0.5">{n.detail}</div>
                </div>
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => onMarkNotificationRead(n.id)}
                    className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 shrink-0 cursor-pointer"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-blue-700" />
                  <span>Configuration Register</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reporting calendar, validation guards &amp; tolerance parameters
                </p>
              </div>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setAddCfgOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0B1F3A] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Config</span>
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {configRegistry.map((c) => (
                <div key={c.id} className="px-6 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono text-[11px] text-blue-700 font-semibold">
                      {c.id} · {c.type}
                    </div>
                    <div className="font-semibold text-slate-900">{c.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold text-slate-800">{c.value}</div>
                    <div className="text-[11px] text-emerald-700 font-semibold">{c.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Reset all sample banking data (Admin only)</span>
            <button
              type="button"
              disabled={!isSuperAdmin}
              onClick={onResetDemoData}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                isSuperAdmin
                  ? 'border-red-200 bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer'
                  : 'border-slate-200 bg-white text-slate-400 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Workspace</span>
            </button>
          </div>
        </section>
      </div>

      {/* Immutable Audit Log */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="h-4 w-4 text-blue-700" />
              <span>Immutable Audit Trail ({filteredEvents.length} Events)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every login, ingestion, override, GL adjustment, approval, and RBI query is recorded.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search actor or ID..."
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="All">All Actions</option>
              <option value="Ingestion">Ingestion</option>
              <option value="Validation">Validation</option>
              <option value="Override">Override</option>
              <option value="Reconciliation">Reconciliation</option>
              <option value="Approval">Approval</option>
              <option value="Publication">Publication</option>
              <option value="RBI Query">RBI Query</option>
              <option value="Config">Config</option>
            </select>
            <button
              type="button"
              onClick={handleExportAuditCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Audit CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Actor &amp; Role</th>
                <th className="py-3 px-4">Event Description</th>
                <th className="py-3 px-4 text-right">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                    {ev.timestamp}
                  </td>
                  <td className="py-3 px-4 font-semibold text-blue-700 whitespace-nowrap">
                    {ev.actionType}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{ev.actor}</div>
                    <div className="text-[11px] text-slate-500">{ev.role}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{ev.summary}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                    {ev.referenceId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {addCfgOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                Add Configuration Parameter
              </h3>
              <button
                type="button"
                onClick={() => setAddCfgOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!cfgName.trim() || !cfgValue.trim()) return;
                onAddConfigItem({
                  type: cfgType,
                  name: cfgName.trim(),
                  value: cfgValue.trim(),
                  status: 'Active',
                });
                setCfgName('');
                setCfgValue('');
                setAddCfgOpen(false);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Type</label>
                <select
                  value={cfgType}
                  onChange={(e) => setCfgType(e.target.value as ConfigRegistryItem['type'])}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option>Reporting Calendar</option>
                  <option>Validation Rule</option>
                  <option>Reconciliation Tolerance</option>
                  <option>Notification Setting</option>
                  <option>Reference Data</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Parameter Name</label>
                <input
                  type="text"
                  required
                  value={cfgName}
                  onChange={(e) => setCfgName(e.target.value)}
                  placeholder="e.g. RBI Sovereign Risk Weight Cap"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Value</label>
                <input
                  type="text"
                  required
                  value={cfgValue}
                  onChange={(e) => setCfgValue(e.target.value)}
                  placeholder="e.g. 0.00% (SLR Exempt)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddCfgOpen(false)}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0B1F3A] text-white font-semibold cursor-pointer"
                >
                  Save Parameter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
