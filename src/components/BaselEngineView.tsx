import React, { useState } from 'react';
import { Calculator, Download, Play, Plus, RotateCcw, TrendingUp } from 'lucide-react';
import {
  CalculationRunRecord,
  CapitalInputs,
  PortfolioExposure,
  RegulatoryConfig,
} from '../types/basel';
import {
  BaselComputedMetrics,
  downloadCsv,
  formatINRCr,
  formatPct,
} from '../utils/baselCalculations';

interface BaselEngineViewProps {
  portfolios: PortfolioExposure[];
  capital: CapitalInputs;
  config: RegulatoryConfig;
  metrics: BaselComputedMetrics;
  calculationRuns: CalculationRunRecord[];
  simpleGuide: boolean;
  onUpdatePortfolioExposure: (id: string, exposureCr: number) => void;
  onUpdatePortfolioWeight: (id: string, stdRiskWeightPct: number) => void;
  onUpdateCapital: (patch: Partial<CapitalInputs>) => void;
  onApplyPreset: (preset: 'live' | 'loan-surge' | 'liquidity-stress') => void;
  onRunCalculationSnapshot: () => void;
}

export const BaselEngineView: React.FC<BaselEngineViewProps> = ({
  portfolios,
  capital,
  config,
  metrics,
  calculationRuns,
  simpleGuide,
  onUpdatePortfolioExposure,
  onUpdatePortfolioWeight,
  onUpdateCapital,
  onApplyPreset,
  onRunCalculationSnapshot,
}) => {
  const [quickPortId, setQuickPortId] = useState<string>('PORT-MORT');
  const [quickLoanCr, setQuickLoanCr] = useState<number>(100);
  const [quickAddedMsg, setQuickAddedMsg] = useState<string | null>(null);

  const quickPort = portfolios.find((p) => p.id === quickPortId) || portfolios[0];
  const quickRwaCr = (quickLoanCr * (quickPort?.stdRiskWeightPct || 0)) / 100;
  const quickMinCapitalCr = (quickRwaCr * config.rbiMinCrarPct) / 100;

  const maxRwaScale = Math.max(metrics.totalStdRwaCr, metrics.bindingRwaCr, 1) * 1.05;

  const gaugeRows = [
    {
      name: 'Bank Safety Ratio (CRAR)',
      formula: `${formatINRCr(metrics.totalCapitalCr, 0)} ÷ ${formatINRCr(metrics.bindingRwaCr, 0)}`,
      value: metrics.crarPct,
      min: config.rbiMinCrarPct,
      ok: metrics.complianceChecks.crarOk,
    },
    {
      name: 'Core Owner Cash (CET1)',
      formula: `${formatINRCr(capital.cet1Cr, 0)} ÷ ${formatINRCr(metrics.bindingRwaCr, 0)}`,
      value: metrics.cet1RatioPct,
      min: config.rbiMinCet1Pct,
      ok: metrics.complianceChecks.cet1Ok,
    },
    {
      name: 'Tier 1 Safety Ratio',
      formula: `${formatINRCr(metrics.tier1CapitalCr, 0)} ÷ ${formatINRCr(metrics.bindingRwaCr, 0)}`,
      value: metrics.tier1RatioPct,
      min: config.rbiMinTier1Pct,
      ok: metrics.complianceChecks.tier1Ok,
    },
    {
      name: '30-Day Cash Buffer (LCR)',
      formula: `${formatINRCr(capital.hqlaCr, 0)} ÷ ${formatINRCr(capital.netCashOutflow30dCr, 0)}`,
      value: metrics.lcrPct,
      min: config.rbiMinLcrPct,
      ok: metrics.complianceChecks.lcrOk,
    },
    {
      name: '1-Year Stable Funding (NSFR)',
      formula: `${formatINRCr(capital.availableStableFundingCr, 0)} ÷ ${formatINRCr(
        capital.requiredStableFundingCr,
        0
      )}`,
      value: metrics.nsfrPct,
      min: config.rbiMinNsfrPct,
      ok: metrics.complianceChecks.nsfrOk,
    },
    {
      name: 'Total Exposure Ratio (Leverage)',
      formula: `${formatINRCr(metrics.tier1CapitalCr, 0)} ÷ ${formatINRCr(
        capital.totalLeverageExposureCr,
        0
      )}`,
      value: metrics.leverageRatioPct,
      min: config.rbiMinLeveragePct,
      ok: metrics.complianceChecks.leverageOk,
    },
  ];

  const handleExportCalculationSheet = () => {
    const headers = ['Category', 'Line Item', 'Amount / Input', 'Computed RWA / Ratio', 'RBI Min'];
    const rows: (string | number)[][] = [
      ['Capital', 'CET1 Core Equity', formatINRCr(capital.cet1Cr), formatPct(metrics.cet1RatioPct), formatPct(config.rbiMinCet1Pct)],
      ['Capital', 'AT1 Capital', formatINRCr(capital.at1Cr), '-', '-'],
      ['Capital', 'Tier 2 Capital', formatINRCr(capital.tier2Cr), '-', '-'],
      ['Capital', 'Total Regulatory Capital', formatINRCr(metrics.totalCapitalCr), formatPct(metrics.crarPct), formatPct(config.rbiMinCrarPct)],
      ...portfolios.map((p) => [
        'Credit Risk (SA-CR)',
        `${p.assetClass} (${p.stdRiskWeightPct}% RW)`,
        formatINRCr(p.exposureCr),
        formatINRCr((p.exposureCr * p.stdRiskWeightPct) / 100),
        '-',
      ]),
      ['Market Risk', 'FRTB Standardized Market RWA', formatINRCr(capital.marketRwaStdCr), formatINRCr(capital.marketRwaStdCr), '-'],
      ['OpRisk', 'SMA Operational Risk RWA', formatINRCr(capital.operationalRwaCr), formatINRCr(capital.operationalRwaCr), '-'],
      ['CVA Risk', 'Basel IV CVA RWA', formatINRCr(capital.cvaRwaCr), formatINRCr(capital.cvaRwaCr), '-'],
      ['Output Floor', `${config.baselOutputFloorPct}% of Standardized RWA`, formatINRCr(metrics.totalStdRwaCr), formatINRCr(metrics.outputFloorRwaCr), '72.50%'],
      ['Final Binding RWA', metrics.isFloorBinding ? 'Output Floor Binding' : 'Internal IRB Active', '-', formatINRCr(metrics.bindingRwaCr), '-'],
      ['Liquidity', 'LCR (HQLA / 30d Outflow)', formatINRCr(capital.hqlaCr), formatPct(metrics.lcrPct), formatPct(config.rbiMinLcrPct)],
    ];
    downloadCsv(`HDFC_Basel_IV_Calculator_${config.reportingDate}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Quick 1-Loan Basel IV Calculator */}
      <section className="bg-white border border-blue-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Quick Loan Calculator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Loan Amount &times; Risk Weight % = Risk Score (RWA)
            </p>
          </div>
          {quickAddedMsg && (
            <span className="text-xs font-semibold text-emerald-700">{quickAddedMsg}</span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              1. Pick Type of Loan
            </label>
            <select
              value={quickPortId}
              onChange={(e) => setQuickPortId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg"
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.assetClass} ({p.stdRiskWeightPct}% Risk Weight)
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              2. Loan Amount (₹ Cr)
            </label>
            <input
              type="number"
              min={0}
              step={10}
              value={quickLoanCr}
              onChange={(e) => setQuickLoanCr(Math.max(0, Number(e.target.value)))}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="lg:col-span-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-500">Risk Score (RWA)</div>
            <div className="font-mono text-sm font-bold text-slate-900 mt-0.5">
              {formatINRCr(quickRwaCr, 2)}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              {quickLoanCr} &times; {quickPort?.stdRiskWeightPct || 0}%
            </div>
          </div>

          <div className="lg:col-span-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="text-[11px] text-blue-800">RBI Safety Money ({config.rbiMinCrarPct}%)</div>
            <div className="font-mono text-sm font-bold text-blue-900 mt-0.5">
              {formatINRCr(quickMinCapitalCr, 2)}
            </div>
            <div className="text-[10px] text-blue-700">Bank capital required</div>
          </div>

          <div className="lg:col-span-2">
            <button
              type="button"
              onClick={() => {
                if (!quickPort || quickLoanCr <= 0) return;
                onUpdatePortfolioExposure(quickPort.id, quickPort.exposureCr + quickLoanCr);
                setQuickAddedMsg(`Added ${formatINRCr(quickLoanCr, 0)} to ${quickPort.assetClass}`);
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add to Bank Book</span>
            </button>
          </div>
        </div>
      </section>

      {/* Top Calculator Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-700" />
            <span>Basel IV Capital &amp; Liquidity Calculator</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live RBI Capital Ratios · 72.5% Output Floor · Stress Presets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onApplyPreset('loan-surge')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 cursor-pointer whitespace-nowrap"
          >
            <TrendingUp className="h-3.5 w-3.5 text-amber-700" />
            <span>Loan Surge (+₹ 65,000 Cr)</span>
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('liquidity-stress')}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 cursor-pointer whitespace-nowrap"
          >
            Deposit Outflow Shock
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('live')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={onRunCalculationSnapshot}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Save Official Run</span>
          </button>
          <button
            type="button"
            onClick={handleExportCalculationSheet}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Math Sheet</span>
          </button>
        </div>
      </section>

      {/* 4-Step Live Formula Breakdown */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-semibold text-blue-700">Step 1 · Total Safety Capital</div>
          <div className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900">
            {formatINRCr(metrics.totalCapitalCr, 0)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-500">
            CET1 ({formatINRCr(capital.cet1Cr, 0)}) + AT1 + Tier 2
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-semibold text-blue-700">
            Step 2 · 100% Standardized RWA
          </div>
          <div className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900">
            {formatINRCr(metrics.totalStdRwaCr, 0)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-500">
            Credit + FRTB + OpRisk + CVA
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-semibold text-blue-700">
            Step 3 · {config.baselOutputFloorPct}% Output Floor
          </div>
          <div className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900">
            {formatINRCr(metrics.bindingRwaCr, 0)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-amber-800">
            max(IRB {formatINRCr(metrics.totalIrbRwaCr, 0)}, Floor{' '}
            {formatINRCr(metrics.outputFloorRwaCr, 0)})
          </div>
        </div>

        <div className="bg-[#0B1F3A] text-white rounded-xl p-4 border border-slate-800">
          <div className="text-[11px] font-semibold text-blue-300">Step 4 · Final RBI CRAR</div>
          <div
            className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
              metrics.complianceChecks.crarOk ? 'text-emerald-300' : 'text-red-300'
            }`}
          >
            {formatPct(metrics.crarPct)}
          </div>
          <div className="mt-1 text-[11px] text-slate-300">
            {metrics.complianceChecks.crarOk
              ? `Safe (Above RBI Min ${formatPct(config.rbiMinCrarPct)})`
              : `Breach (Below RBI Min ${formatPct(config.rbiMinCrarPct)})`}
          </div>
        </div>
      </section>

      {/* Output Floor Visual Bar + 6 Live RBI Ratios */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 72.5% Output Floor Comparison */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-slate-900">
                Basel IV {config.baselOutputFloorPct}% Output Floor Check
              </h2>
              <span
                className={`font-mono text-xs font-semibold ${
                  metrics.isFloorBinding ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {metrics.isFloorBinding ? 'Floor Binding' : 'Internal Model Active'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Binding RWA is always the <strong>higher</strong> of Internal Model RWA or{' '}
              {config.baselOutputFloorPct}% of Standardized RWA.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700">100% Standardized RWA (SA)</span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900">
                    {formatINRCr(metrics.totalStdRwaCr, 0)}
                  </span>
                </div>
                <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-400 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (metrics.totalStdRwaCr / maxRwaScale) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700">
                    {config.baselOutputFloorPct}% Output Floor Limit
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-blue-800">
                    {formatINRCr(metrics.outputFloorRwaCr, 0)}
                  </span>
                </div>
                <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-700 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (metrics.outputFloorRwaCr / maxRwaScale) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700">Bank Internal Model RWA (IRB)</span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900">
                    {formatINRCr(metrics.totalIrbRwaCr, 0)}
                  </span>
                </div>
                <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (metrics.totalIrbRwaCr / maxRwaScale) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Non-Credit RWA Inputs (FRTB, SMA OpRisk, CVA) */}
          <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                FRTB Market (₹ Cr)
              </label>
              <input
                type="number"
                min={0}
                step={500}
                value={capital.marketRwaStdCr}
                onChange={(e) =>
                  onUpdateCapital({
                    marketRwaStdCr: Math.max(0, Number(e.target.value)),
                    marketRwaIrbCr: Math.round(Math.max(0, Number(e.target.value)) * 0.72),
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                SMA OpRisk (₹ Cr)
              </label>
              <input
                type="number"
                min={0}
                step={500}
                value={capital.operationalRwaCr}
                onChange={(e) =>
                  onUpdateCapital({ operationalRwaCr: Math.max(0, Number(e.target.value)) })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                CVA Risk (₹ Cr)
              </label>
              <input
                type="number"
                min={0}
                step={250}
                value={capital.cvaRwaCr}
                onChange={(e) => onUpdateCapital({ cvaRwaCr: Math.max(0, Number(e.target.value)) })}
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </section>

        {/* Right: 6 Live RBI Ratio Gauges */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-display text-base font-bold text-slate-900">
            RBI Compliance Ratios (Live Numerator ÷ Denominator)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Shows exact rupees used in every Basel IV calculation.
          </p>

          <div className="mt-4 divide-y divide-slate-100">
            {gaugeRows.map((row) => (
              <div key={row.name} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{row.name}</div>
                    <div className="text-[11px] font-mono text-slate-500">{row.formula}</div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono text-lg font-bold tabular-nums ${
                        row.ok ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {formatPct(row.value)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      RBI Min {formatPct(row.min)} ·{' '}
                      <span
                        className={
                          row.ok ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'
                        }
                      >
                        {row.ok ? 'Pass' : 'Breach'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom Interactive Inputs: Capital & Liquidity + Credit Portfolio Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Capital & Liquidity Controls */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Capital &amp; Liquidity Inputs (₹ Cr)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Drag sliders or enter exact ₹ Crore figures.
            </p>
          </div>

          {[
            {
              label: 'CET1 Core Equity Capital',
              key: 'cet1Cr' as const,
              val: capital.cet1Cr,
              min: 18000,
              max: 60000,
              step: 500,
            },
            {
              label: 'AT1 Perpetual Bonds',
              key: 'at1Cr' as const,
              val: capital.at1Cr,
              min: 0,
              max: 10000,
              step: 250,
            },
            {
              label: 'Tier 2 Subordinated Capital',
              key: 'tier2Cr' as const,
              val: capital.tier2Cr,
              min: 2000,
              max: 15000,
              step: 250,
            },
            {
              label: 'High-Quality Liquid Assets (HQLA)',
              key: 'hqlaCr' as const,
              val: capital.hqlaCr,
              min: 50000,
              max: 150000,
              step: 1000,
            },
            {
              label: '30-Day Stressed Cash Outflow',
              key: 'netCashOutflow30dCr' as const,
              val: capital.netCashOutflow30dCr,
              min: 50000,
              max: 130000,
              step: 1000,
            },
          ].map((item) => (
            <div key={item.key}>
              <div className="flex items-center justify-between gap-2 text-xs font-medium mb-1">
                <span className="text-slate-700">{item.label}</span>
                <input
                  type="number"
                  min={0}
                  step={item.step}
                  value={item.val}
                  onChange={(e) =>
                    onUpdateCapital({ [item.key]: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-28 px-2 py-1 text-right text-xs font-mono bg-slate-50 border border-slate-300 rounded"
                />
              </div>
              <input
                type="range"
                min={item.min}
                max={item.max}
                step={item.step}
                value={item.val}
                onChange={(e) => onUpdateCapital({ [item.key]: Number(e.target.value) })}
                className="w-full accent-blue-700 cursor-pointer"
              />
            </div>
          ))}
        </section>

        {/* Credit Portfolio Breakdown with Editable Exposure & Basel IV Risk Weights */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Basel IV Credit Risk Calculator (SA-CR &amp; LTV/Rating Weights)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Edit Exposure (₹ Cr) or Risk Weight (%) to compute Credit RWA = Exposure &times;
                Weight.
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-800">
              Credit RWA: {formatINRCr(metrics.creditRwaStdCr, 0)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Asset Class</th>
                  <th className="py-2.5 px-4">Exposure (₹ Cr)</th>
                  <th className="py-2.5 px-4 text-right">SA Weight (%)</th>
                  <th className="py-2.5 px-4 text-right">SA RWA (₹ Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {portfolios.map((p) => {
                  const stdRwa = (p.exposureCr * p.stdRiskWeightPct) / 100;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{p.assetClass}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            step={500}
                            value={p.exposureCr}
                            onChange={(e) =>
                              onUpdatePortfolioExposure(p.id, Math.max(0, Number(e.target.value)))
                            }
                            className="w-24 px-2 py-1 text-right font-mono tabular-nums bg-white border border-slate-300 rounded"
                          />
                          <input
                            type="range"
                            min={0}
                            max={250000}
                            step={1000}
                            value={p.exposureCr}
                            onChange={(e) =>
                              onUpdatePortfolioExposure(p.id, Number(e.target.value))
                            }
                            className="w-20 accent-blue-700 cursor-pointer hidden sm:block"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          min={0}
                          max={250}
                          step={5}
                          value={p.stdRiskWeightPct}
                          onChange={(e) =>
                            onUpdatePortfolioWeight(
                              p.id,
                              Math.min(250, Math.max(0, Number(e.target.value)))
                            )
                          }
                          className="w-16 px-2 py-1 text-right font-mono tabular-nums bg-white border border-slate-300 rounded"
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {formatINRCr(stdRwa, 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Calculation Execution History */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Basel IV Calculation Execution History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged calculation runs for Credit, Market (FRTB), Operational (SMA), CVA, and 72.5%
              Output Floor.
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500">{calculationRuns.length} Runs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Run ID</th>
                <th className="py-3 px-4">Calculation Area</th>
                <th className="py-3 px-4">Date / Version</th>
                <th className="py-3 px-4 text-right">Computed Output (₹ Cr)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Triggered By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {calculationRuns.map((run) => (
                <tr key={run.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-blue-700 font-semibold">{run.id}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{run.area}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {run.period} · {run.version}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatINRCr(run.outputCr, 2)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-700">{run.status}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {run.triggeredBy} ({run.timestamp})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
