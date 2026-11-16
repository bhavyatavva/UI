import { CapitalInputs, PortfolioExposure, RegulatoryConfig, RegulatoryReport } from '../types/basel';

export function formatINRCr(value: number, decimals = 2): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return `₹ ${formatted} Cr`;
}

export function formatNumberIN(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

export function formatPct(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export interface BaselComputedMetrics {
  creditRwaStdCr: number;
  creditRwaIrbCr: number;
  totalStdRwaCr: number;
  totalIrbRwaCr: number;
  outputFloorRwaCr: number;
  isFloorBinding: boolean;
  bindingRwaCr: number;
  tier1CapitalCr: number;
  totalCapitalCr: number;
  cet1RatioPct: number;
  tier1RatioPct: number;
  crarPct: number;
  leverageRatioPct: number;
  lcrPct: number;
  nsfrPct: number;
  totalExposureCr: number;
  complianceChecks: {
    cet1Ok: boolean;
    tier1Ok: boolean;
    crarOk: boolean;
    lcrOk: boolean;
    nsfrOk: boolean;
    leverageOk: boolean;
  };
}

export function computeBaselMetrics(
  portfolios: PortfolioExposure[],
  capital: CapitalInputs,
  config: RegulatoryConfig
): BaselComputedMetrics {
  const totalExposureCr = portfolios.reduce((acc, p) => acc + p.exposureCr, 0);
  const creditRwaStdCr = portfolios.reduce(
    (acc, p) => acc + (p.exposureCr * p.stdRiskWeightPct) / 100,
    0
  );
  const creditRwaIrbCr = portfolios.reduce(
    (acc, p) => acc + (p.exposureCr * p.irbRiskWeightPct) / 100,
    0
  );

  const totalStdRwaCr =
    creditRwaStdCr + capital.marketRwaStdCr + capital.operationalRwaCr + capital.cvaRwaCr;
  const totalIrbRwaCr =
    creditRwaIrbCr + capital.marketRwaIrbCr + capital.operationalRwaCr + capital.cvaRwaCr;

  const outputFloorRwaCr = totalStdRwaCr * (config.baselOutputFloorPct / 100);
  const isFloorBinding = outputFloorRwaCr > totalIrbRwaCr;
  const bindingRwaCr = Math.max(totalIrbRwaCr, outputFloorRwaCr);

  const tier1CapitalCr = capital.cet1Cr + capital.at1Cr;
  const totalCapitalCr = tier1CapitalCr + capital.tier2Cr;

  const cet1RatioPct = bindingRwaCr > 0 ? (capital.cet1Cr / bindingRwaCr) * 100 : 0;
  const tier1RatioPct = bindingRwaCr > 0 ? (tier1CapitalCr / bindingRwaCr) * 100 : 0;
  const crarPct = bindingRwaCr > 0 ? (totalCapitalCr / bindingRwaCr) * 100 : 0;

  const leverageRatioPct =
    capital.totalLeverageExposureCr > 0
      ? (tier1CapitalCr / capital.totalLeverageExposureCr) * 100
      : 0;

  const lcrPct =
    capital.netCashOutflow30dCr > 0
      ? (capital.hqlaCr / capital.netCashOutflow30dCr) * 100
      : 0;

  const nsfrPct =
    capital.requiredStableFundingCr > 0
      ? (capital.availableStableFundingCr / capital.requiredStableFundingCr) * 100
      : 0;

  return {
    creditRwaStdCr,
    creditRwaIrbCr,
    totalStdRwaCr,
    totalIrbRwaCr,
    outputFloorRwaCr,
    isFloorBinding,
    bindingRwaCr,
    tier1CapitalCr,
    totalCapitalCr,
    cet1RatioPct,
    tier1RatioPct,
    crarPct,
    leverageRatioPct,
    lcrPct,
    nsfrPct,
    totalExposureCr,
    complianceChecks: {
      cet1Ok: cet1RatioPct >= config.rbiMinCet1Pct,
      tier1Ok: tier1RatioPct >= config.rbiMinTier1Pct,
      crarOk: crarPct >= config.rbiMinCrarPct,
      lcrOk: lcrPct >= config.rbiMinLcrPct,
      nsfrOk: nsfrPct >= config.rbiMinNsfrPct,
      leverageOk: leverageRatioPct >= config.rbiMinLeveragePct,
    },
  };
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (cell: string | number) => {
    const str = String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent = [
    headers.map(escape).join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const BULK_INGESTION_HEADERS = [
  'Account_ID',
  'Borrower_Name',
  'Asset_Class',
  'Exposure_Cr',
  'Risk_Weight_Pct',
];

export function downloadBulkIngestionTemplate(): void {
  downloadCsv('HDFC_Bulk_Ingestion_Template.csv', BULK_INGESTION_HEADERS, [
    ['LN-MUM-99012', 'Tata Infrastructure Ltd', 'Corporate & Infrastructure', '420.50', '85'],
    ['LN-DEL-99018', 'Bharat Housing Fin Corp', 'Residential Mortgages', '185.00', '35'],
    ['LN-BLR-99024', 'Deccan Precision MSME', 'Retail & MSME Regulatory', '64.25', '75'],
    ['LN-CHN-99031', 'Southern Ports Authority', 'Public Sector Entity', '310.00', '20'],
  ]);
}

function pdfAscii(text: string): string {
  return String(text)
    .replace(/₹/g, 'INR ')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = pdfAscii(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let curr = '';
  for (const w of words) {
    if (!curr) {
      curr = w;
    } else if ((curr + ' ' + w).length <= maxChars) {
      curr += ' ' + w;
    } else {
      lines.push(curr);
      curr = w;
    }
  }
  if (curr) lines.push(curr);
  return lines.length ? lines : [''];
}

export function downloadReportPdf(report: RegulatoryReport): void {
  const cmds: string[] = [];
  // Header banner
  cmds.push('0.043 0.122 0.227 rg 0 742 595 100 re f');
  cmds.push('1 1 1 rg BT /F2 16 Tf 40 806 Td (HDFC BANK - RBI REGULATORY FILING PACK) Tj ET');
  cmds.push('0.78 0.85 0.96 rg BT /F1 10 Tf 40 786 Td (Basel IV & Reserve Bank of India (RBI) Official Regulatory Report) Tj ET');
  cmds.push(`0.65 0.95 0.80 rg BT /F2 10 Tf 40 762 Td (Status: ${pdfAscii(report.status)}  |  Version: ${pdfAscii(report.version)}) Tj ET`);

  // Report title & metadata
  cmds.push('0.06 0.09 0.16 rg BT /F2 14 Tf 40 712 Td (' + pdfAscii(report.title) + ') Tj ET');
  cmds.push('0.28 0.33 0.41 rg BT /F1 10 Tf 40 694 Td (' + pdfAscii(`Code: ${report.code}   |   Reporting Date: ${report.reportDate}   |   Key Metric: ${report.keyMetricLabel}: ${report.keyMetricValue}`) + ') Tj ET');
  cmds.push('0.28 0.33 0.41 rg BT /F1 9 Tf 40 678 Td (' + pdfAscii(`Evidence Hash: ${report.evidenceHash}   |   Published By: ${report.publishedBy || 'Pending Stage 5 Sign-Off'}`) + ') Tj ET');

  // Divider
  cmds.push('0.85 0.88 0.92 RG 1 w 40 664 m 555 664 l S');

  // Table header
  cmds.push('0.95 0.96 0.98 rg 40 638 515 20 re f');
  cmds.push('0.10 0.14 0.22 rg BT /F2 9 Tf 46 645 Td (Schedule) Tj ET');
  cmds.push('BT /F2 9 Tf 128 645 Td (Line Item Particulars) Tj ET');
  cmds.push('BT /F2 9 Tf 330 645 Td (Reported Value) Tj ET');
  cmds.push('BT /F2 9 Tf 428 645 Td (Benchmark) Tj ET');
  cmds.push('BT /F2 9 Tf 506 645 Td (Result) Tj ET');

  let y = 620;
  for (const row of report.rows) {
    if (y < 95) break;
    const partLines = wrapText(row.particulars, 36);
    const valLines = wrapText(row.amountOrRatio, 18);
    const maxL = Math.max(partLines.length, valLines.length, 1);

    cmds.push(`0.15 0.20 0.28 rg BT /F1 8.5 Tf 46 ${y} Td (${pdfAscii(row.scheduleCode)}) Tj ET`);
    partLines.forEach((ln, idx) => {
      cmds.push(`0.06 0.09 0.16 rg BT /F2 8.5 Tf 128 ${y - idx * 11} Td (${ln}) Tj ET`);
    });
    valLines.forEach((ln, idx) => {
      cmds.push(`0.06 0.09 0.16 rg BT /F2 8.5 Tf 330 ${y - idx * 11} Td (${ln}) Tj ET`);
    });
    cmds.push(`0.28 0.33 0.41 rg BT /F1 8.5 Tf 428 ${y} Td (${pdfAscii(row.rbiBenchmark).slice(0, 16)}) Tj ET`);
    cmds.push(`0.08 0.50 0.24 rg BT /F2 8.5 Tf 506 ${y} Td (${pdfAscii(row.complianceStatus)}) Tj ET`);

    y -= maxL * 11 + 8;
    cmds.push(`0.92 0.94 0.96 RG 0.5 w 40 ${y + 4} m 555 ${y + 4} l S`);
  }

  // Summary / plain description box
  const boxY = Math.max(90, y - 34);
  cmds.push(`0.96 0.97 0.99 rg 40 ${boxY} 515 36 re f`);
  cmds.push(`0.20 0.25 0.35 rg BT /F2 8.5 Tf 48 ${boxY + 22} Td (Summary:) Tj ET`);
  cmds.push(`0.28 0.33 0.41 rg BT /F1 8.5 Tf 98 ${boxY + 22} Td (${pdfAscii(report.plainDesc).slice(0, 82)}) Tj ET`);
  cmds.push(`0.38 0.44 0.52 rg BT /F1 8 Tf 48 ${boxY + 8} Td (Generated offline by HDFC Bank Basel IV & RBI Regulatory Reporting Hub on ${pdfAscii(new Date().toLocaleString('en-IN'))}) Tj ET`);

  const stream = cmds.join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${report.code}_${report.reportDate}.pdf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function isSignedOffRegulatoryReport(report: RegulatoryReport): boolean {
  return report.status === 'Published to RBI';
}

export function printSignedOffReportPdf(report: RegulatoryReport): boolean {
  if (!isSignedOffRegulatoryReport(report)) {
    return false;
  }
  const previousTitle = document.title;
  document.title = `${report.code}_${report.reportDate}_SignedOff`;
  const restoreTitle = () => {
    document.title = previousTitle;
    window.removeEventListener('afterprint', restoreTitle);
  };
  window.addEventListener('afterprint', restoreTitle);
  window.print();
  setTimeout(restoreTitle, 1500);
  return true;
}

