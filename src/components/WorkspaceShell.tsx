import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  History,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Scale,
  ShieldAlert,
  X,
} from 'lucide-react';
import { AlertNotification, NavView, StakeholderId, StakeholderRole } from '../types/basel';
import { BankLogo } from './BankLogo';

export const ALLOWED_VIEWS_BY_ROLE: Record<StakeholderId, NavView[]> = {
  'reporting-analyst': ['overview', 'reports', 'approvals', 'rbi-portal'],
  'data-quality-analyst': ['overview', 'quality'],
  'data-ops-analyst': ['overview', 'quality'],
  'risk-analyst': ['basel', 'reconciliation', 'approvals'],
  'finance-approver': ['reconciliation', 'basel', 'approvals'],
  'reporting-manager': ['reports', 'approvals', 'basel', 'reconciliation'],
  'compliance-officer': ['reports', 'approvals', 'rbi-portal', 'audit-config'],
  auditor: ['audit-config', 'reports', 'approvals'],
  'reg-admin': ['audit-config', 'quality', 'reports'],
  'super-admin': ['audit-config', 'overview'],
  'rbi-supervisor': ['rbi-portal'],
};

interface WorkspaceShellProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  currentRole: StakeholderRole;
  loggedInUserId: string;
  simpleGuide: boolean;
  onToggleSimpleGuide: () => void;
  notifications: AlertNotification[];
  onMarkNotificationRead: (id: string) => void;
  openBreaksCount: number;
  reconBreakCount: number;
  openQueryCount: number;
  reportingDate: string;
  onSignOut: () => void;
  onBackToLanding: () => void;
  children: React.ReactNode;
}

interface NavItem {
  id: NavView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  regulatorVisible?: boolean;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  currentView,
  onSelectView,
  currentRole,
  loggedInUserId,
  simpleGuide,
  onToggleSimpleGuide,
  notifications,
  onMarkNotificationRead,
  openBreaksCount,
  reconBreakCount,
  openQueryCount,
  reportingDate,
  onSignOut,
  onBackToLanding,
  children,
}) => {
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Daily Run & Feeds', icon: LayoutDashboard },
    { id: 'quality', label: 'Quality & Breaks', icon: ShieldAlert, badge: openBreaksCount },
    { id: 'basel', label: 'Basel IV Calculator', icon: Calculator },
    { id: 'reconciliation', label: 'GL Reconciliation', icon: Scale, badge: reconBreakCount },
    { id: 'reports', label: 'Daily Reports', icon: FileSpreadsheet },
    { id: 'approvals', label: 'Review & Approvals', icon: ClipboardCheck },
    {
      id: 'rbi-portal',
      label: 'RBI Portal',
      icon: Landmark,
      badge: openQueryCount,
      regulatorVisible: true,
    },
    { id: 'audit-config', label: 'Lineage & Config', icon: History },
  ];

  const allowedViews = ALLOWED_VIEWS_BY_ROLE[currentRole.id] || [currentRole.defaultView];
  const visibleNavItems = navItems.filter((item) => allowedViews.includes(item.id));
  const roleNotifications = notifications.filter(
    (n) => !n.targetView || allowedViews.includes(n.targetView)
  );

  const activeNav = visibleNavItems.find((n) => n.id === currentView) || visibleNavItems[0];
  const unreadCount = roleNotifications.filter((n) => !n.read).length;

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0B1F3A] text-white">
      {/* Bank Identity */}
      <div className="px-5 py-5 border-b border-white/10">
        <button
          type="button"
          onClick={onBackToLanding}
          className="flex items-center gap-3 text-left w-full cursor-pointer"
        >
          <BankLogo size="sm" />
          <div className="min-w-0">
            <div className="font-display text-sm font-bold text-white truncate">
              HDFC Bank
            </div>
            <div className="text-[11px] text-slate-300 truncate">Basel IV · Regulator: RBI</div>
          </div>
        </button>
      </div>

      {/* Role Segregation Notice for RBI */}
      {currentRole.isRegulator && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-blue-950/70 border border-blue-400/20 text-xs text-blue-100">
          <div className="font-semibold text-white">Segregated RBI Portal</div>
          <p className="mt-1 text-[11px] text-blue-200 leading-relaxed">
            Internal bank drafts &amp; open breaks are hidden. Only certified reports appear here.
          </p>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectView(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 shrink-0">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Signed-in User Card + Sign Out */}
      <div className="p-4 border-t border-white/10 bg-[#08172C]">
        <div className="text-xs font-semibold text-white truncate">{currentRole.personName}</div>
        <div className="text-[11px] text-slate-300 truncate">{currentRole.title}</div>
        <div className="mt-0.5 font-mono text-[11px] text-blue-300 truncate">
          ID: {loggedInUserId}
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 h-full">{renderSidebarContent()}</div>
          <div
            className="flex-1 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Breadcrumb & Controls Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 cursor-pointer"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="text-sm text-slate-500 flex items-center gap-2 truncate">
                <span className="hidden sm:inline font-medium text-slate-700">
                  Filing Date: <span className="font-mono">{reportingDate}</span>
                </span>
                <span className="hidden sm:inline" aria-hidden="true">
                  /
                </span>
                <span className="font-display font-bold text-slate-900 truncate">
                  {activeNav?.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Confidential Session Role Pill (No LOV inside dashboard; Sign Out to switch user) */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700">
                <span className="font-semibold text-slate-900">{currentRole.title}</span>
                <span className="text-slate-400">·</span>
                <span className="font-mono text-[11px] text-slate-600">{loggedInUserId}</span>
              </div>

              {/* Alerts Drawer Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAlertsOpen((o) => !o)}
                  aria-label="Open notifications"
                  className="relative p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-600 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {alertsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-lg z-40 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-slate-900">
                        SLA &amp; Regulatory Alerts
                      </span>
                      <button
                        type="button"
                        onClick={() => setAlertsOpen(false)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {roleNotifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            onMarkNotificationRead(n.id);
                            if (n.targetView && allowedViews.includes(n.targetView)) {
                              onSelectView(n.targetView);
                            }
                            setAlertsOpen(false);
                          }}
                          className={`w-full text-left p-3.5 hover:bg-slate-50 transition-colors cursor-pointer ${
                            n.read ? 'opacity-70' : 'bg-blue-50/30'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs font-semibold flex items-center gap-1.5 ${
                                n.severity === 'Critical'
                                  ? 'text-red-700'
                                  : n.severity === 'Warning'
                                  ? 'text-amber-700'
                                  : 'text-blue-700'
                              }`}
                            >
                              {n.severity === 'Critical' ? (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              {n.severity}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {n.timestamp}
                            </span>
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-900">
                            {n.title}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-600">{n.detail}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
