/* HDFC BANK · BASEL IV & RBI REGULATORY REPORTING HUB — SHARED STORE, AUTH & RBAC (OFFLINE CHROME FILE:// READY) */
(function (global) {
  const KEYS = {
    ACCOUNTS: "hdfc_basel4_accounts_v1",
    SESSION: "hdfc_basel4_session_v1",
    RBAC: "hdfc_basel4_rbac_v1",
    DATA: "hdfc_basel4_workspace_v1",
    INGESTION: "hdfc_basel4_ingestion_v1"
  };

  const LOGO_SVG =
    '<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<rect x="2" y="2" width="32" height="32" rx="6" fill="#004C8F"/>' +
    '<rect x="7" y="7" width="22" height="22" rx="2" fill="#ED232A"/>' +
    '<rect x="11.5" y="11.5" width="13" height="13" fill="#FFFFFF"/>' +
    '<rect x="15.5" y="15.5" width="5" height="5" fill="#004C8F"/>' +
    '<rect x="17" y="7" width="2" height="22" fill="#FFFFFF"/>' +
    '<rect x="7" y="17" width="22" height="2" fill="#FFFFFF"/>' +
    '</svg>';

  const ROLES = [
    {
      id: "reporting-analyst",
      title: "Regulatory Reporting Analyst",
      personName: "Ananya Deshmukh",
      department: "Regulatory Reporting Cell",
      defaultView: "overview",
      allowedViews: ["overview", "basel", "approvals", "reports"],
      plain: "Maker: Prepares daily RBI returns, reviews ratios, and submits Stage 1 packs."
    },
    {
      id: "data-quality-analyst",
      title: "Data Quality Analyst",
      personName: "Rohan Kulkarni",
      department: "Enterprise Data Governance",
      defaultView: "quality",
      allowedViews: ["overview", "quality"],
      plain: "Runs DQ validation rules, resolves exceptions, and signs off reason codes."
    },
    {
      id: "data-ops-analyst",
      title: "Data Operations Analyst",
      personName: "Vikram Nair",
      department: "Banking Operations & IT",
      defaultView: "data-ingestion",
      allowedViews: ["overview", "data-ingestion", "quality"],
      plain: "Full R, W, X on Data Ingestion: bulk Excel paste, CSV templates, and feed execution."
    },
    {
      id: "risk-analyst",
      title: "Risk Analyst",
      personName: "Meera Iyer",
      department: "Integrated Risk Management",
      defaultView: "basel",
      allowedViews: ["overview", "basel", "approvals"],
      plain: "Validates Basel IV RWA, 72.5% output floor, LCR/NSFR, and Stage 2 Risk Review."
    },
    {
      id: "finance-approver",
      title: "Finance Approver",
      personName: "Siddharth Menon",
      department: "Finance & General Ledger Control",
      defaultView: "reconciliation",
      allowedViews: ["overview", "reconciliation", "approvals", "basel"],
      plain: "Approves 3-way Risk vs Oracle OFSAA GL reconciliations and Stage 3 Finance Cert."
    },
    {
      id: "reporting-manager",
      title: "Reporting Manager",
      personName: "Kavita Krishnan",
      department: "Regulatory Reporting Leadership",
      defaultView: "approvals",
      allowedViews: ["overview", "approvals", "reports", "reconciliation"],
      plain: "Conducts Stage 4 Manager Review across daily packs and SLA gates."
    },
    {
      id: "compliance-officer",
      title: "Compliance Officer",
      personName: "Arjun Malhotra",
      department: "Compliance & RBI Affairs",
      defaultView: "approvals",
      allowedViews: ["overview", "approvals", "reports", "rbi-portal"],
      plain: "Checker: Certifies Stage 5 Final RBI Publish, approves PDF filings, closes RBI queries."
    },
    {
      id: "auditor",
      title: "Auditor",
      personName: "Priya Chatterjee",
      department: "Internal Audit & Assurance",
      defaultView: "audit-config",
      allowedViews: ["overview", "audit-config", "reports", "approvals"],
      plain: "Read-only independent audit assurance over lineage, overrides, and audit trail."
    },
    {
      id: "reg-admin",
      title: "Regulatory Platform Admin",
      personName: "Deepak Verma",
      department: "Banking Platform Admin",
      defaultView: "audit-config",
      allowedViews: ["overview", "audit-config"],
      plain: "Maintains RBAC permissions, user access, and threshold governance (no filing self-approval)."
    },
    {
      id: "super-admin",
      title: "IT Super Admin",
      personName: "Suresh Subramanian",
      department: "IT Infrastructure & Identity Access",
      defaultView: "audit-config",
      allowedViews: ["overview", "audit-config", "data-ingestion"],
      plain: "Administers identity, RBAC matrix, and platform configuration without self-approving returns."
    },
    {
      id: "rbi-supervisor",
      title: "RBI Supervisory User",
      personName: "Dr. S. Raghuraman",
      department: "Reserve Bank of India · DoS",
      defaultView: "rbi-portal",
      allowedViews: ["rbi-portal", "reports"],
      plain: "External RBI Supervisor: inspects certified Approved/Published filings only & raises queries."
    }
  ];

  const DEFAULT_ACCOUNTS = [
    { userId: "HDFC-RPT-1042", fullName: "Ananya Deshmukh", email: "ananya.deshmukh@hdfcbank.com", department: "Regulatory Reporting Cell", roleId: "reporting-analyst", password: "Basel4@HDFC2026" },
    { userId: "HDFC-DQA-2018", fullName: "Rohan Kulkarni", email: "rohan.kulkarni@hdfcbank.com", department: "Enterprise Data Governance", roleId: "data-quality-analyst", password: "Basel4@HDFC2026" },
    { userId: "HDFC-OPS-3005", fullName: "Vikram Nair", email: "vikram.nair@hdfcbank.com", department: "Banking Operations & IT", roleId: "data-ops-analyst", password: "Basel4@HDFC2026" },
    { userId: "HDFC-RSK-4011", fullName: "Meera Iyer", email: "meera.iyer@hdfcbank.com", department: "Integrated Risk Management", roleId: "risk-analyst", password: "Basel4@HDFC2026" },
    { userId: "HDFC-FIN-5002", fullName: "Siddharth Menon", email: "siddharth.menon@hdfcbank.com", department: "Finance & General Ledger Control", roleId: "finance-approver", password: "Basel4@HDFC2026" },
    { userId: "HDFC-MGR-6001", fullName: "Kavita Krishnan", email: "kavita.krishnan@hdfcbank.com", department: "Regulatory Reporting Leadership", roleId: "reporting-manager", password: "Basel4@HDFC2026" },
    { userId: "HDFC-CMP-7009", fullName: "Arjun Malhotra", email: "arjun.malhotra@hdfcbank.com", department: "Compliance & RBI Affairs", roleId: "compliance-officer", password: "Basel4@HDFC2026" },
    { userId: "HDFC-AUD-8014", fullName: "Priya Chatterjee", email: "priya.chatterjee@hdfcbank.com", department: "Internal Audit & Assurance", roleId: "auditor", password: "Basel4@HDFC2026" },
    { userId: "HDFC-ADM-9001", fullName: "Deepak Verma", email: "deepak.verma@hdfcbank.com", department: "Banking Platform Admin", roleId: "reg-admin", password: "Basel4@HDFC2026" },
    { userId: "HDFC-IT-0001", fullName: "Suresh Subramanian", email: "suresh.subramanian@hdfcbank.com", department: "IT Infrastructure & Identity Access", roleId: "super-admin", password: "Basel4@HDFC2026" },
    { userId: "RBI-DOS-4410", fullName: "Dr. S. Raghuraman", email: "s.raghuraman@rbi.org.in", department: "Reserve Bank of India · DoS", roleId: "rbi-supervisor", password: "Basel4@HDFC2026" }
  ];

  const DEFAULT_RBAC = [
    {
      moduleId: "data-ingestion",
      moduleName: "Data Ingestion (Bulk Excel Paste, CSV, Feeds, API)",
      perms: {
        "data-ops-analyst": "R, W, X",
        "data-quality-analyst": "R",
        "reporting-analyst": "-",
        "risk-analyst": "-",
        "finance-approver": "-",
        "reporting-manager": "-",
        "compliance-officer": "-",
        "auditor": "-",
        "reg-admin": "R",
        "super-admin": "R, W",
        "rbi-supervisor": "-"
      }
    },
    {
      moduleId: "quality",
      moduleName: "Data Quality & Exception Workbench",
      perms: {
        "data-ops-analyst": "R",
        "data-quality-analyst": "R, W, X",
        "reporting-analyst": "-",
        "risk-analyst": "-",
        "finance-approver": "-",
        "reporting-manager": "-",
        "compliance-officer": "-",
        "auditor": "R",
        "reg-admin": "-",
        "super-admin": "-",
        "rbi-supervisor": "-"
      }
    },
    {
      moduleId: "basel",
      moduleName: "Basel IV RWA, Output Floor & Liquidity Engine",
      perms: {
        "data-ops-analyst": "-",
        "data-quality-analyst": "-",
        "reporting-analyst": "R",
        "risk-analyst": "R, W, X",
        "finance-approver": "R",
        "reporting-manager": "-",
        "compliance-officer": "-",
        "auditor": "R",
        "reg-admin": "-",
        "super-admin": "-",
        "rbi-supervisor": "-"
      }
    },
    {
      moduleId: "reconciliation",
      moduleName: "3-Way Risk vs Oracle OFSAA GL Reconciliation",
      perms: {
        "data-ops-analyst": "-",
        "data-quality-analyst": "-",
        "reporting-analyst": "-",
        "risk-analyst": "R",
        "finance-approver": "R, W, X",
        "reporting-manager": "R",
        "compliance-officer": "-",
        "auditor": "R",
        "reg-admin": "-",
        "super-admin": "-",
        "rbi-supervisor": "-"
      }
    },
    {
      moduleId: "approvals",
      moduleName: "5-Stage Maker-Checker Approval Workflow",
      perms: {
        "data-ops-analyst": "-",
        "data-quality-analyst": "-",
        "reporting-analyst": "R, X",
        "risk-analyst": "R, X",
        "finance-approver": "R, X",
        "reporting-manager": "R, X",
        "compliance-officer": "R, X",
        "auditor": "R",
        "reg-admin": "-",
        "super-admin": "-",
        "rbi-supervisor": "-"
      }
    },
    {
      moduleId: "reports",
      moduleName: "Report Management & Signed-Off Print-to-PDF",
      perms: {
        "data-ops-analyst": "-",
        "data-quality-analyst": "-",
        "reporting-analyst": "R, W",
        "risk-analyst": "-",
        "finance-approver": "-",
        "reporting-manager": "R",
        "compliance-officer": "R, W, X",
        "auditor": "R",
        "reg-admin": "-",
        "super-admin": "-",
        "rbi-supervisor": "R"
      }
    },
    {
      moduleId: "rbi-portal",
      moduleName: "RBI Supervisory Portal & Query Governance",
      perms: {
        "data-ops-analyst": "-",
        "data-quality-analyst": "-",
        "reporting-analyst": "-",
        "risk-analyst": "-",
        "finance-approver": "-",
        "reporting-manager": "-",
        "compliance-officer": "R, W, X",
        "auditor": "-",
        "reg-admin": "-",
        "super-admin": "-",
        "rbi-supervisor": "R, W, X"
      }
    },
    {
      moduleId: "audit-config",
      moduleName: "RBAC Governance, User Access, Config & Audit Trail",
      perms: {
        "data-ops-analyst": "-",
        "data-quality-analyst": "-",
        "reporting-analyst": "-",
        "risk-analyst": "-",
        "finance-approver": "-",
        "reporting-manager": "-",
        "compliance-officer": "-",
        "auditor": "R",
        "reg-admin": "R, W, X",
        "super-admin": "R, W, X",
        "rbi-supervisor": "-"
      }
    }
  ];

  function createInitialData() {
    return {
      config: {
        reportingDate: "2026-11-14",
        minCet1Pct: 8.0,
        minCrarPct: 11.5,
        outputFloorPct: 72.5,
        minLcrPct: 100.0,
        slaCutoffIst: "09:30 IST"
      },
      capital: {
        cet1Cr: 37810,
        at1Cr: 3940,
        tier2Cr: 6550,
        leverageExposureCr: 516950,
        hqlaCr: 84890,
        netCashOutflowsCr: 65960,
        asfCr: 392400,
        rsfCr: 323000
      },
      portfolios: [
        { id: "PF-CORP", name: "Corporate & Infrastructure Advances", exposureCr: 184200, stdRwPct: 82.0, irbRwPct: 68.5 },
        { id: "PF-RETAIL", name: "Retail & Residential Mortgages", exposureCr: 126500, stdRwPct: 45.0, irbRwPct: 31.2 },
        { id: "PF-MSME", name: "MSME & Priority Sector Lending", exposureCr: 68400, stdRwPct: 75.0, irbRwPct: 58.0 },
        { id: "PF-TREAS", name: "Treasury, G-Secs & Sovereign", exposureCr: 74900, stdRwPct: 12.0, irbRwPct: 9.4 },
        { id: "PF-DERIV", name: "Derivatives & Market Risk (FRTB)", exposureCr: 31200, stdRwPct: 110.0, irbRwPct: 89.0 }
      ],
      rules: [
        { id: "DQ-01", name: "Mandatory PAN / LEI Counterparty Identifier", source: "Finacle Core Banking (CBS)", severity: "Critical", passedPct: 99.94, status: "Passed" },
        { id: "DQ-02", name: "Collateral Valuation Expiry <= 365 Days", source: "CERSAI & Collateral Vault", severity: "Warning", passedPct: 98.4, status: "Break Open" },
        { id: "DQ-03", name: "Derivatives MTM vs Kondor+ Settlement Match", source: "Kondor+ Treasury", severity: "Critical", passedPct: 97.1, status: "Break Open" },
        { id: "DQ-04", name: "CRILC >= Rs 5 Cr Borrower Aggregation", source: "CreditLens Risk Engine", severity: "Info", passedPct: 100.0, status: "Passed" }
      ],
      exceptions: [
        { id: "EX-401", ruleId: "DQ-02", title: "14 Commercial Real Estate collaterals awaiting Q4 re-valuation", impactCr: 412, severity: "Warning", owner: "Rohan Kulkarni", status: "Open", resolutionNote: "" },
        { id: "EX-402", ruleId: "DQ-03", title: "Kondor+ FX Swap MTM timing delta vs GL Suspense", impactCr: 186, severity: "Critical", owner: "Rohan Kulkarni", status: "Open", resolutionNote: "" }
      ],
      reconciliation: [
        { id: "REC-01", item: "Corporate & MSME Advances (Gross)", riskSys: "CreditLens Risk Engine", riskBal: 252600, glCode: "GL-110200", glBal: 252600, repBal: 252600, tol: 1, status: "Matched", note: "Zero variance" },
        { id: "REC-02", item: "Retail & Mortgage Book", riskSys: "Finacle CBS", riskBal: 126500, glCode: "GL-110450", glBal: 126500, repBal: 126500, tol: 1, status: "Matched", note: "Zero variance" },
        { id: "REC-03", item: "FX & Interest Rate Derivatives MTM", riskSys: "Kondor+ Treasury", riskBal: 31200, glCode: "GL-204910", glBal: 31014, repBal: 31200, tol: 5, status: "Variance Break", note: "Pending T+1 FX revaluation cut-off" }
      ],
      approvalStages: [
        { stage: 1, title: "Stage 1 · Maker Prepare & Submit", requiredRoleId: "reporting-analyst", requiredRoleTitle: "Regulatory Reporting Analyst", status: "Approved", actor: "Ananya Deshmukh", timestamp: "2026-11-14 · 07:45 IST", note: "Daily Basel IV run package prepared & validated." },
        { stage: 2, title: "Stage 2 · Integrated Risk Validation", requiredRoleId: "risk-analyst", requiredRoleTitle: "Risk Analyst", status: "Approved", actor: "Meera Iyer", timestamp: "2026-11-14 · 08:12 IST", note: "72.5% Output Floor & CRAR verified." },
        { stage: 3, title: "Stage 3 · Finance GL Certification", requiredRoleId: "finance-approver", requiredRoleTitle: "Finance Approver", status: "Pending", actor: "", timestamp: "", note: "Awaiting Kondor+ GL variance clearance." },
        { stage: 4, title: "Stage 4 · Reporting Manager Review", requiredRoleId: "reporting-manager", requiredRoleTitle: "Reporting Manager", status: "Pending", actor: "", timestamp: "", note: "" },
        { stage: 5, title: "Stage 5 · Compliance Final Publish to RBI", requiredRoleId: "compliance-officer", requiredRoleTitle: "Compliance Officer", status: "Pending", actor: "", timestamp: "", note: "" }
      ],
      reports: [
        { id: "REP-RCA3-LIVE", code: "RBI-RCA3-B4", title: "HDFC Bank Basel IV Capital Adequacy & 72.5% Output Floor Return", date: "2026-11-14", version: "v1.4", status: "Pending", owner: "Ananya Deshmukh", summary: "CRAR 17.44% · CET1 13.65% · Floor Binding RWA Rs 2,76,983 Cr", hash: "SHA256-HDFC-20261114-RCA3" },
        { id: "REP-BLR1-LIVE", code: "RBI-BLR1-LCR", title: "HDFC Bank Daily Liquidity Coverage (LCR) & NSFR Return", date: "2026-11-14", version: "v1.4", status: "Generated", owner: "Ananya Deshmukh", summary: "LCR 128.69% (RBI Min 100.00%) · NSFR 121.48%", hash: "SHA256-HDFC-20261114-BLR1" },
        { id: "REP-RCA3-PREV", code: "RBI-RCA3-B4", title: "HDFC Bank Basel IV Capital Adequacy Return (Certified)", date: "2026-11-13", version: "v1.2 (Final)", status: "Published to RBI", owner: "Arjun Malhotra (Compliance Officer)", summary: "CRAR 17.39% · CET1 13.61% · Certified Filing", hash: "SHA256-HDFC-20261113-RCA3" },
        { id: "REP-LR1-PREV", code: "RBI-LR1-LEV", title: "HDFC Bank Basel IV Leverage Ratio Statement (Certified)", date: "2026-11-13", version: "v1.2 (Final)", status: "Approved", owner: "Arjun Malhotra (Compliance Officer)", summary: "Leverage Ratio 8.08% (RBI Min 3.50%)", hash: "SHA256-HDFC-20261113-LR1" }
      ],
      queries: [
        { id: "RBI-Q-882", reportCode: "RBI-RCA3-B4", subject: "Corporate & Infrastructure Risk Weight Bucketing", question: "Confirm standardized vs IRB output floor split for Rs 1,84,200 Cr corporate advances.", raisedBy: "Dr. S. Raghuraman (RBI DoS)", raisedAt: "2026-11-14 · 08:30 IST", priority: "High", status: "Open", response: "" },
        { id: "RBI-Q-879", reportCode: "RBI-BLR1-LCR", subject: "Level 1 HQLA G-Sec Buffer Movement", question: "Provide NDS-OM settlement confirmation for Rs 1,250 Cr GOI Treasury increase.", raisedBy: "Dr. S. Raghuraman (RBI DoS)", raisedAt: "2026-11-12 · 15:20 IST", priority: "Standard", status: "Closed", response: "Confirmed via RBI NDS-OM trade reference #NDS-20261112-8841." }
      ],
      auditEvents: [
        { id: "AUD-905", timestamp: "08:12:10 IST", actor: "Meera Iyer", role: "Risk Analyst", action: "Stage 2 Sign-Off", summary: "Validated Basel IV 72.5% Output Floor & CRAR calculations", ref: "REP-RCA3-LIVE" },
        { id: "AUD-904", timestamp: "07:45:00 IST", actor: "Ananya Deshmukh", role: "Regulatory Reporting Analyst", action: "Maker Submit", summary: "Submitted daily RCA3 return pack for Risk & Finance review", ref: "REP-RCA3-LIVE" },
        { id: "AUD-903", timestamp: "06:55:22 IST", actor: "Vikram Nair", role: "Data Operations Analyst", action: "Data Ingestion", summary: "Completed CBS & Treasury morning feeds (73,12,690 records)", ref: "FD001-FD005" },
        { id: "AUD-902", timestamp: "09:14:00 IST", actor: "Arjun Malhotra", role: "Compliance Officer", action: "Publish to RBI", summary: "Certified & published prior-day RCA3 and LR1 filings to RBI", ref: "REP-RCA3-PREV" }
      ]
    };
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return fallback;
  }

  function writeJson(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
  }

  function getAccounts() {
    const saved = readJson(KEYS.ACCOUNTS, null);
    if (Array.isArray(saved) && saved.length) {
      const missing = DEFAULT_ACCOUNTS.filter(d => !saved.some(s => s.userId === d.userId));
      if (missing.length) {
        const merged = [...saved, ...missing];
        writeJson(KEYS.ACCOUNTS, merged);
        return merged;
      }
      return saved;
    }
    writeJson(KEYS.ACCOUNTS, DEFAULT_ACCOUNTS);
    return JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
  }

  function saveAccounts(list) { writeJson(KEYS.ACCOUNTS, list); }

  function getSession() {
    return readJson(KEYS.SESSION, null);
  }

  function setSession(sess) {
    if (!sess) {
      try { localStorage.removeItem(KEYS.SESSION); } catch (e) { /* ignore */ }
    } else {
      writeJson(KEYS.SESSION, sess);
    }
  }

  function getRbac() {
    const saved = readJson(KEYS.RBAC, null);
    if (Array.isArray(saved) && saved.length) return saved;
    const copy = JSON.parse(JSON.stringify(DEFAULT_RBAC));
    writeJson(KEYS.RBAC, copy);
    return copy;
  }

  function saveRbac(matrix) { writeJson(KEYS.RBAC, matrix); }

  function resetRbac() {
    const copy = JSON.parse(JSON.stringify(DEFAULT_RBAC));
    writeJson(KEYS.RBAC, copy);
    return copy;
  }

  function getRoleFlags(roleId, moduleId) {
    const row = getRbac().find(r => r.moduleId === moduleId);
    return row ? (row.perms[roleId] || "-") : "-";
  }

  function hasFlag(roleId, moduleId, flag) {
    return getRoleFlags(roleId, moduleId).split(",").map(s => s.trim()).includes(flag);
  }

  function getData() {
    const saved = readJson(KEYS.DATA, null);
    if (saved && saved.config && saved.portfolios && saved.reports) return saved;
    const init = createInitialData();
    writeJson(KEYS.DATA, init);
    return init;
  }

  function saveData(data) { writeJson(KEYS.DATA, data); }

  function getRoleById(roleId) {
    return ROLES.find(r => r.id === roleId) || ROLES[0];
  }

  function computeBaselMetrics(data) {
    const d = data || getData();
    const totalExp = d.portfolios.reduce((s, p) => s + Number(p.exposureCr || 0), 0);
    const stdRwa = d.portfolios.reduce((s, p) => s + Number(p.exposureCr || 0) * (Number(p.stdRwPct || 0) / 100), 0);
    const irbRwa = d.portfolios.reduce((s, p) => s + Number(p.exposureCr || 0) * (Number(p.irbRwPct || 0) / 100), 0);
    const floorRatio = Number(d.config.outputFloorPct || 72.5) / 100;
    const floorRwa = stdRwa * floorRatio;
    const bindingRwa = Math.max(irbRwa, floorRwa);
    const floorActive = floorRwa >= irbRwa;

    const cet1 = Number(d.capital.cet1Cr || 0);
    const tier1 = cet1 + Number(d.capital.at1Cr || 0);
    const totalCap = tier1 + Number(d.capital.tier2Cr || 0);

    const cet1Pct = bindingRwa > 0 ? (cet1 / bindingRwa) * 100 : 0;
    const tier1Pct = bindingRwa > 0 ? (tier1 / bindingRwa) * 100 : 0;
    const crarPct = bindingRwa > 0 ? (totalCap / bindingRwa) * 100 : 0;
    const levPct = Number(d.capital.leverageExposureCr || 0) > 0 ? (tier1 / Number(d.capital.leverageExposureCr)) * 100 : 0;
    const lcrPct = Number(d.capital.netCashOutflowsCr || 0) > 0 ? (Number(d.capital.hqlaCr || 0) / Number(d.capital.netCashOutflowsCr)) * 100 : 0;
    const nsfrPct = Number(d.capital.rsfCr || 0) > 0 ? (Number(d.capital.asfCr || 0) / Number(d.capital.rsfCr)) * 100 : 0;

    return {
      totalExp,
      stdRwa,
      irbRwa,
      floorRwa,
      bindingRwa,
      floorActive,
      cet1,
      tier1,
      totalCap,
      cet1Pct,
      tier1Pct,
      crarPct,
      levPct,
      lcrPct,
      nsfrPct
    };
  }

  function isSignedOffReport(report) {
    return report && (report.status === "Approved" || report.status === "Published to RBI");
  }

  function nowIst() {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()) + " IST";
  }

  function appendAudit(action, summary, ref, actorName, roleTitle) {
    const data = getData();
    const sess = getSession();
    data.auditEvents.unshift({
      id: "AUD-" + (902 + data.auditEvents.length),
      timestamp: nowIst(),
      actor: actorName || (sess ? sess.fullName : "System"),
      role: roleTitle || (sess ? sess.roleTitle : "System"),
      action,
      summary,
      ref: ref || "-"
    });
    saveData(data);
  }

  function hydrateLogos() {
    document.querySelectorAll(".hdfc-logo").forEach(el => {
      if (!el.innerHTML.trim()) el.innerHTML = LOGO_SVG;
    });
  }

  function fmtInr(n) {
    return "Rs " + Math.round(Number(n || 0)).toLocaleString("en-IN") + " Cr";
  }

  function fmtPct(n) {
    return Number(n || 0).toFixed(2) + "%";
  }

  global.HDFCStore = {
    KEYS,
    ROLES,
    LOGO_SVG,
    getAccounts,
    saveAccounts,
    getSession,
    setSession,
    getRbac,
    saveRbac,
    resetRbac,
    getRoleFlags,
    hasFlag,
    getData,
    saveData,
    getRoleById,
    computeBaselMetrics,
    isSignedOffReport,
    appendAudit,
    hydrateLogos,
    fmtInr,
    fmtPct
  };
})(window);
