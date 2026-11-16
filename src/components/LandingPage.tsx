import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileCheck2,
  Landmark,
  Scale,
  ShieldCheck,
  Calculator,
} from 'lucide-react';
import { STAKEHOLDER_ROLES } from '../data/mockBankingData';
import { NavView, StakeholderId } from '../types/basel';
import { BaselComputedMetrics, formatINRCr, formatPct } from '../utils/baselCalculations';
import { BankLogo } from './BankLogo';

interface LandingPageProps {
  metrics: BaselComputedMetrics;
  openBreaksCount: number;
  publishedReportsCount: number;
  onGoToLogin: (roleId?: StakeholderId) => void;
}

const SIX_SIMPLE_STEPS = [
  {
    step: '01',
    title: 'Bank Feeds & Data',
    plain: 'Core Banking, Treasury & Collateral files',
    icon: Database,
    targetView: 'overview' as NavView,
  },
  {
    step: '02',
    title: 'Data Quality Check',
    plain: 'Auto-rules catch missing or wrong numbers',
    icon: ShieldCheck,
    targetView: 'quality' as NavView,
  },
  {
    step: '03',
    title: 'Basel IV Calculator',
    plain: 'Safety Ratio (CRAR), 72.5% Floor & Cash (LCR)',
    icon: Calculator,
    targetView: 'basel' as NavView,
  },
  {
    step: '04',
    title: 'GL Book Match',
    plain: 'Risk numbers vs Bank Accounting Book',
    icon: Scale,
    targetView: 'reconciliation' as NavView,
  },
  {
    step: '05',
    title: '5-Step Sign-Off',
    plain: 'Maker-Checker review before RBI release',
    icon: FileCheck2,
    targetView: 'approvals' as NavView,
  },
  {
    step: '06',
    title: 'RBI Official Portal',
    plain: 'Certified filings vault & RBI queries',
    icon: Landmark,
    targetView: 'rbi-portal' as NavView,
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  metrics,
  openBreaksCount,
  publishedReportsCount,
  onGoToLogin,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          <a
            href="#top"
            className="flex items-center gap-3 font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <BankLogo size="sm" />
            <span>HDFC Bank</span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#how-it-works"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#live-snapshot"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Daily Snapshot
            </a>
            <a
              href="#stakeholders"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Team Roles
            </a>
            <a
              href="#brd-scope"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              RBI Controls
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onGoToLogin('reporting-analyst')}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0B1F3A] hover:bg-[#132E54] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Section */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-4">
                <span>HDFC Bank</span>
                <span aria-hidden="true">·</span>
                <span>RBI Daily Filing</span>
                <span aria-hidden="true">·</span>
                <span>Regulator: Reserve Bank of India (RBI)</span>
              </div>

              <h1
                className="font-display font-bold tracking-tight text-slate-900 leading-[1.12]"
                style={{ fontSize: 'clamp(2.25rem, 3.8vw, 3.5rem)', textWrap: 'balance' }}
              >
                Basel IV Regulatory Reporting Hub
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                Daily bank feeds · Data quality checks · Basel IV capital &amp; cash ratios ·
                5-step RBI sign-off
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onGoToLogin('reporting-analyst')}
                  className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#0B1F3A] hover:bg-[#132E54] text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Sign In to Reporting Hub</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onGoToLogin('rbi-supervisor')}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Landmark className="h-4 w-4 text-blue-700" />
                  <span>RBI Regulator Sign In</span>
                </button>
              </div>
            </div>

            {/* Right Hero Visual: Live Daily Readiness Board */}
            <div
              id="live-snapshot"
              className="lg:col-span-5 bg-[#0B1F3A] text-white rounded-xl p-7 flex flex-col justify-between border border-slate-800"
            >
              <div>
                <div className="flex items-center justify-between gap-4 pb-5 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <BankLogo size="md" />
                    <div>
                      <div className="font-display text-sm font-bold text-white">
                        Daily RBI Filing Board
                      </div>
                      <div className="text-xs text-slate-300">14 Nov 2026 · SLA 09:30 IST</div>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-emerald-300 font-medium">
                    CRAR {formatPct(metrics.crarPct)}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-xs text-slate-300">CET1 Safety Cushion</div>
                    <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-white">
                      {formatPct(metrics.cet1RatioPct)}
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-300">RBI Min 8.00% · Safe</div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-xs text-slate-300">30-Day Cash (LCR)</div>
                    <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-white">
                      {formatPct(metrics.lcrPct)}
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-300">RBI Min 100.00% · Safe</div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-xs text-slate-300">72.5% Output Floor</div>
                    <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-white">
                      {formatINRCr(metrics.bindingRwaCr, 0)}
                    </div>
                    <div className="mt-1 text-[11px] text-amber-300">
                      {metrics.isFloorBinding ? 'Floor Active (Safe Limit)' : 'Internal Model Active'}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-xs text-slate-300">Open Data Breaks</div>
                    <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-white">
                      {openBreaksCount} Items
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300">
                      {publishedReportsCount} Reports in RBI Vault
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                <span>Total Bank Balance Sheet: {formatINRCr(metrics.totalExposureCr, 0)}</span>
                <button
                  type="button"
                  onClick={() => onGoToLogin('risk-analyst')}
                  className="text-blue-300 hover:text-white font-semibold cursor-pointer"
                >
                  Sign In to Calculator →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4-Column Quick Proof Strip */}
        <section className="bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-7 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-slate-500">Daily Records Checked</div>
              <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
                73,12,690
              </div>
              <div className="mt-0.5 text-xs text-slate-600">Across 6 Indian bank feeds</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Daily RBI Cutoff SLA</div>
              <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
                09:30 IST
              </div>
              <div className="mt-0.5 text-xs text-slate-600">Zero manual Excel cut-paste</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Approval Gates</div>
              <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
                5 Stages
              </div>
              <div className="mt-0.5 text-xs text-slate-600">Maker-Checker before RBI sees it</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Audit Traceability</div>
              <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
                100%
              </div>
              <div className="mt-0.5 text-xs text-slate-600">Loan ID to RBI Schedule lineage</div>
            </div>
          </div>
        </section>

        {/* 6 Simple Steps — Understandable by a 5th-Grade Student */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-16">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold text-blue-700 mb-2">
              Daily Reporting Workflow
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              6-Step RBI Filing Pipeline
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SIX_SIMPLE_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() =>
                    onGoToLogin(item.targetView === 'rbi-portal' ? 'rbi-supervisor' : 'reporting-analyst')
                  }
                  className="text-left bg-white border border-slate-200 hover:border-blue-600 rounded-xl p-6 transition-colors group cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-blue-700">
                        Step {item.step}
                      </span>
                      <Icon className="h-5 w-5 text-slate-400 group-hover:text-blue-700 transition-colors" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-bold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.plain}</p>
                  </div>
                  <div className="mt-5 text-xs font-semibold text-blue-700 inline-flex items-center gap-1">
                    <span>Sign In to Open</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* All 9 BRD Stakeholders + RBI Supervisory User */}
        <section id="stakeholders" className="bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-blue-700 mb-2">
                  Role-Based Access Control
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Stakeholder Access Directory
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onGoToLogin('reporting-analyst')}
                className="text-sm font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap cursor-pointer"
              >
                Open Standard Login Page →
              </button>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {STAKEHOLDER_ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => onGoToLogin(role.id)}
                  className={`text-left p-5 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between ${
                    role.isRegulator
                      ? 'bg-[#0B1F3A] text-white border-slate-800 hover:border-blue-500'
                      : 'bg-slate-50/70 hover:bg-white border-slate-200 hover:border-blue-600'
                  }`}
                >
                  <div>
                    <div
                      className={`text-xs font-medium ${
                        role.isRegulator ? 'text-blue-300' : 'text-slate-500'
                      }`}
                    >
                      {role.department}
                    </div>
                    <h3
                      className={`mt-1.5 font-display text-sm font-bold ${
                        role.isRegulator ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {role.title}
                    </h3>
                    <p
                      className={`mt-2 text-xs leading-relaxed ${
                        role.isRegulator ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {role.plainEnglishRole}
                    </p>
                  </div>
                  <div
                    className={`mt-4 pt-3 border-t text-xs font-semibold flex items-center justify-between ${
                      role.isRegulator
                        ? 'border-white/10 text-emerald-300'
                        : 'border-slate-200 text-blue-700'
                    }`}
                  >
                    <span>{role.personName}</span>
                    <span>Sign In →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* BRD Controls & Scope Summary */}
        <section id="brd-scope" className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Built-In RBI Governance Controls
              </h2>
              <ul className="mt-6 space-y-3.5 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Critical Error Gate:</strong> Open errors block RBI submission.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Certified Vault Only:</strong> Stage 5 Compliance sign-off required for RBI portal.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Full Audit Trail:</strong> Every manual change logs user ID, timestamp &amp; reason code.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-7">
              <h3 className="font-display text-lg font-bold text-slate-900">
                RBI &amp; Basel IV Coverage Matrix
              </h3>
              <div className="mt-4 divide-y divide-slate-100 text-sm">
                <div className="py-3 flex items-center justify-between gap-4">
                  <span className="font-medium text-slate-800">Capital Adequacy (CRAR &amp; CET1)</span>
                  <span className="font-mono text-xs text-slate-600">RBI-RCA3-B4</span>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <span className="font-medium text-slate-800">72.5% Output Floor vs Internal IRB</span>
                  <span className="font-mono text-xs text-slate-600">Basel IV Live Engine</span>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <span className="font-medium text-slate-800">Liquidity Coverage &amp; Stable Funding</span>
                  <span className="font-mono text-xs text-slate-600">RBI-BLR1-LCR / NSFR</span>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <span className="font-medium text-slate-800">3-Way Risk vs General Ledger Match</span>
                  <span className="font-mono text-xs text-slate-600">OFSAA GL Controls</span>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <span className="font-medium text-slate-800">Supervisory Queries &amp; Evidence Vault</span>
                  <span className="font-mono text-xs text-slate-600">RBI Supervisory Portal</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            HDFC Bank · Basel IV Regulatory Reporting Platform · Regulated by Reserve Bank
            of India (RBI)
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="/hdfc-basel4/index.html"
              className="font-medium text-blue-700 hover:underline"
            >
              Open Pure HTML5 / Chrome File Explorer Edition
            </a>
            <span aria-hidden="true">·</span>
            <span>Reserve Bank of India (RBI) Supervisory Compliance</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
