/* HDFC BANK · WORKSPACE CONTROLLER (PURE VANILLA JS, STRICT NON-COLLIDING RBAC, PRINT-TO-PDF, ZERO ROLE LOV) */
(function (global) {
  const S = global.HDFCStore;
  let session = null;
  let roleDef = null;
  let currentView = "overview";

  const ALL_NAV_ITEMS = [
    { id: "overview", group: "Workspace", label: "Overview & Notifications" },
    { id: "data-ingestion", group: "Data Pipeline", label: "Data Ingestion Module" },
    { id: "quality", group: "Data Pipeline", label: "Data Quality & Breaks" },
    { id: "basel", group: "Risk & GL", label: "Basel IV Calculator" },
    { id: "reconciliation", group: "Risk & GL", label: "3-Way GL Reconciliation" },
    { id: "approvals", group: "Governance", label: "5-Stage Approvals" },
    { id: "reports", group: "Governance", label: "Report Management & PDF" },
    { id: "rbi-portal", group: "Regulator", label: "RBI Supervisory Portal" },
    { id: "audit-config", group: "Administration", label: "RBAC, Users, Config & Audit" }
  ];

  function toast(msg, type) {
    const el = document.getElementById("wsToast");
    if (!el) return;
    el.textContent = msg;
    el.className = "toast-box show " + (type || "ok");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.className = "toast-box"; }, 3600);
  }

  function requireSession() {
    session = S.getSession();
    if (!session) {
      window.location.href = "./index.html?auth=1";
      return false;
    }
    roleDef = S.getRoleById(session.roleId);
    return true;
  }

  function allowedViews() {
    return roleDef ? roleDef.allowedViews : ["overview"];
  }

  function canAccess(viewId) {
    return allowedViews().includes(viewId);
  }

  function can(moduleId, flag) {
    return S.hasFlag(session.roleId, moduleId, flag);
  }

  function renderChrome() {
    document.getElementById("sideUserName").textContent = session.fullName;
    document.getElementById("sideUserRole").textContent = roleDef.title;
    document.getElementById("readonlyRoleBadge").textContent = roleDef.title + " · " + session.userId + " (Read-Only Session)";
    renderSidebar();
  }

  function renderSidebar() {
    const nav = document.getElementById("wsNav");
    const allowed = ALL_NAV_ITEMS.filter(item => canAccess(item.id));
    const groups = [...new Set(allowed.map(i => i.group))];
    const data = S.getData();
    const openBreaks = data.exceptions.filter(e => e.status === "Open").length;
    const openQueries = data.queries.filter(q => q.status === "Open").length;

    nav.innerHTML = groups.map(grp => {
      const items = allowed.filter(i => i.group === grp);
      return `<div class="ws-nav-group">${grp}</div>` + items.map(i => {
        let pill = "";
        if (i.id === "quality" && openBreaks > 0) pill = `<span class="ws-nav-pill">${openBreaks}</span>`;
        if (i.id === "rbi-portal" && openQueries > 0) pill = `<span class="ws-nav-pill">${openQueries}</span>`;
        return `<button type="button" class="ws-nav-btn ${currentView === i.id ? "active" : ""}" onclick="HDFCWorkspace.go('${i.id}')"><span>${i.label}</span>${pill}</button>`;
      }).join("");
    }).join("");
  }

  function go(viewId) {
    if (!canAccess(viewId)) {
      const fallback = roleDef.defaultView;
      toast("Access restricted: Sign out & log in with authorized stakeholder credentials for " + viewId + ".", "warn");
      currentView = canAccess(fallback) ? fallback : allowedViews()[0];
    } else {
      currentView = viewId;
    }
    window.location.hash = currentView;
    const item = ALL_NAV_ITEMS.find(i => i.id === currentView);
    document.getElementById("topViewTitle").textContent = item ? item.label : "Workspace";
    document.getElementById("topBreadcrumb").textContent = "HDFC Bank / " + roleDef.title + " / " + (item ? item.label : "");
    renderSidebar();
    renderView();
  }

  function badgeStatus(status) {
    if (["Approved", "Published to RBI", "Passed", "Matched", "Resolved", "Closed", "Connected", "Success"].includes(status)) {
      return `<span class="badge badge-ok">${status}</span>`;
    }
    if (["Rejected", "Returned", "Critical", "Failed", "Variance Break"].includes(status)) {
      return `<span class="badge badge-bad">${status}</span>`;
    }
    if (["Pending", "Break Open", "Open", "Warning", "High"].includes(status)) {
      return `<span class="badge badge-warn">${status}</span>`;
    }
    return `<span class="badge badge-info">${status}</span>`;
  }

  /* ---------------- 1. OVERVIEW ---------------- */
  function renderOverview() {
    const data = S.getData();
    const m = S.computeBaselMetrics(data);
    const pendingStage = data.approvalStages.find(s => s.status !== "Approved");
    const openBreaks = data.exceptions.filter(e => e.status === "Open").length;
    const certifiedCount = data.reports.filter(r => S.isSignedOffReport(r)).length;

    return `
      <div class="alert-box alert-blue">
        <div>
          <strong>Signed in as ${session.fullName} (${roleDef.title})</strong>
          <div class="text-xs" style="margin-top:3px;">${roleDef.plain}</div>
        </div>
        <span class="badge badge-info">Zero In-Dashboard LOV · Strict RBAC</span>
      </div>

      <div class="grid grid-4">
        <div class="card">
          <div class="text-xs muted">Total CRAR</div>
          <div class="mono" style="font-size:24px; font-weight:700; margin:6px 0;">${S.fmtPct(m.crarPct)}</div>
          <div class="text-xs" style="color:var(--green);">RBI Min ${S.fmtPct(data.config.minCrarPct)}</div>
        </div>
        <div class="card">
          <div class="text-xs muted">CET1 Capital Ratio</div>
          <div class="mono" style="font-size:24px; font-weight:700; margin:6px 0;">${S.fmtPct(m.cet1Pct)}</div>
          <div class="text-xs" style="color:var(--green);">RBI Min ${S.fmtPct(data.config.minCet1Pct)}</div>
        </div>
        <div class="card">
          <div class="text-xs muted">Liquidity Coverage (LCR)</div>
          <div class="mono" style="font-size:24px; font-weight:700; margin:6px 0;">${S.fmtPct(m.lcrPct)}</div>
          <div class="text-xs" style="color:var(--green);">RBI Min ${S.fmtPct(data.config.minLcrPct)}</div>
        </div>
        <div class="card">
          <div class="text-xs muted">72.5% Output Floor RWA</div>
          <div class="mono" style="font-size:22px; font-weight:700; margin:6px 0;">${S.fmtInr(m.bindingRwa)}</div>
          <div class="text-xs muted">${m.floorActive ? "Standardized Floor Binding" : "IRB RWA Active"}</div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <h3 style="font-size:16px; margin-bottom:12px;">Role-Scoped Action Queue</h3>
          <div style="display:grid; gap:10px;">
            ${canAccess("data-ingestion") ? `<div class="alert-box alert-ok"><div><strong>Data Ingestion Gateway</strong><div class="text-xs">Bulk Excel Copy-Paste &amp; CSV Template ready (${S.getRoleFlags(session.roleId, "data-ingestion")}).</div></div><button type="button" class="btn btn-sm btn-primary" onclick="HDFCWorkspace.go('data-ingestion')">Open &rarr;</button></div>` : ""}
            ${canAccess("quality") ? `<div class="alert-box alert-warn"><div><strong>Data Quality Exceptions</strong><div class="text-xs">${openBreaks} open break(s) requiring DQ review.</div></div><button type="button" class="btn btn-sm btn-primary" onclick="HDFCWorkspace.go('quality')">Inspect &rarr;</button></div>` : ""}
            ${canAccess("approvals") ? `<div class="alert-box alert-blue"><div><strong>Current Approval Gate</strong><div class="text-xs">${pendingStage ? pendingStage.title + " (" + pendingStage.requiredRoleTitle + ")" : "All 5 Stages Certified & Published"}</div></div><button type="button" class="btn btn-sm btn-primary" onclick="HDFCWorkspace.go('approvals')">Open &rarr;</button></div>` : ""}
            ${canAccess("reports") ? `<div class="alert-box alert-ok"><div><strong>Regulatory Report Vault</strong><div class="text-xs">${certifiedCount} signed-off filing(s) ready for Print-to-PDF.</div></div><button type="button" class="btn btn-sm btn-primary" onclick="HDFCWorkspace.go('reports')">Reports &rarr;</button></div>` : ""}
          </div>
        </div>

        <div class="card">
          <h3 style="font-size:16px; margin-bottom:12px;">5-Stage Filing Chain Snapshot</h3>
          <div style="display:grid; gap:8px;">
            ${data.approvalStages.map(st => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border:1px solid var(--border); border-radius:8px;">
                <div>
                  <div style="font-size:12px; font-weight:600;">${st.title}</div>
                  <div class="text-xs subtle">${st.requiredRoleTitle}${st.actor ? " · " + st.actor : ""}</div>
                </div>
                ${badgeStatus(st.status)}
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  /* ---------------- 2. DATA INGESTION (EMBEDDED MODULE) ---------------- */
  function renderDataIngestion() {
    return `
      <div class="alert-box alert-blue">
        <div>
          <strong>Data Ingestion Module (Access: ${S.getRoleFlags(session.roleId, "data-ingestion")})</strong>
          <div class="text-xs" style="margin-top:2px;">You can also open <code>data-ingestion.html</code> directly in Chrome from File Explorer.</div>
        </div>
        <a href="./data-ingestion.html" target="_self" class="btn btn-outline btn-sm">Open Standalone Full-Screen &rarr;</a>
      </div>
      <iframe src="./data-ingestion.html?embed=1" class="ingestion-frame" title="HDFC Bank Data Ingestion Module"></iframe>
    `;
  }

  /* ---------------- 3. DATA QUALITY & BREAKS ---------------- */
  function renderQuality() {
    const data = S.getData();
    const canEdit = can("quality", "W") || can("quality", "X");
    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="font-size:17px;">Automated Data Quality Validation Rules</h3>
            <p class="text-xs muted">Daily checks prior to Basel IV RWA calculation.</p>
          </div>
          <button type="button" class="btn btn-blue btn-sm" ${canEdit ? "" : "disabled"} onclick="HDFCWorkspace.runDqChecks()">Run All DQ Checks</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Rule ID</th><th>Validation Rule</th><th>Source System</th><th>Severity</th><th>Pass Rate</th><th>Status</th></tr></thead>
            <tbody>
              ${data.rules.map(r => `
                <tr>
                  <td class="mono"><strong>${r.id}</strong></td>
                  <td>${r.name}</td>
                  <td>${r.source}</td>
                  <td>${badgeStatus(r.severity)}</td>
                  <td class="mono">${r.passedPct.toFixed(2)}%</td>
                  <td>${badgeStatus(r.status)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:17px; margin-bottom:12px;">Exception &amp; Break Workbench</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Break ID</th><th>Rule</th><th>Description</th><th>Exposure Impact</th><th>Severity</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              ${data.exceptions.map(ex => `
                <tr>
                  <td class="mono"><strong>${ex.id}</strong></td>
                  <td class="mono">${ex.ruleId}</td>
                  <td>${ex.title}${ex.resolutionNote ? `<div class="text-xs muted">Note: ${ex.resolutionNote}</div>` : ""}</td>
                  <td class="mono">${S.fmtInr(ex.impactCr)}</td>
                  <td>${badgeStatus(ex.severity)}</td>
                  <td>${badgeStatus(ex.status)}</td>
                  <td>
                    ${ex.status === "Open" && canEdit ? `<button type="button" class="btn btn-sm btn-green" onclick="HDFCWorkspace.resolveException('${ex.id}')">Resolve</button>` : `<span class="text-xs subtle">${ex.status === "Open" ? "Requires DQ Analyst (R, W, X)" : "Cleared"}</span>`}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* ---------------- 4. BASEL IV ENGINE ---------------- */
  function renderBasel() {
    const data = S.getData();
    const m = S.computeBaselMetrics(data);
    const canEdit = can("basel", "W");

    return `
      <div class="grid grid-4">
        <div class="card"><div class="text-xs muted">Standardized RWA</div><div class="mono" style="font-size:20px; font-weight:700; margin-top:4px;">${S.fmtInr(m.stdRwa)}</div></div>
        <div class="card"><div class="text-xs muted">72.5% Output Floor</div><div class="mono" style="font-size:20px; font-weight:700; margin-top:4px;">${S.fmtInr(m.floorRwa)}</div></div>
        <div class="card"><div class="text-xs muted">Internal IRB RWA</div><div class="mono" style="font-size:20px; font-weight:700; margin-top:4px;">${S.fmtInr(m.irbRwa)}</div></div>
        <div class="card"><div class="text-xs muted">CRAR / CET1</div><div class="mono" style="font-size:20px; font-weight:700; margin-top:4px;">${S.fmtPct(m.crarPct)} / ${S.fmtPct(m.cet1Pct)}</div></div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="font-size:17px;">Portfolio Exposure &amp; Basel IV Risk Weight Engine</h3>
            <p class="text-xs muted">${canEdit ? "Edit Standardized / IRB risk weights and save to recompute bank-wide capital ratios." : "Read-only view (Risk Analyst holds R, W, X edit access)."}</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="HDFCWorkspace.exportBaselCsv()">Export CSV</button>
            ${canEdit ? `<button type="button" class="btn btn-primary btn-sm" onclick="HDFCWorkspace.saveBaselInputs()">Save &amp; Recalculate</button>` : ""}
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Portfolio</th><th>Exposure (Rs Cr)</th><th>Std RW %</th><th>IRB RW %</th><th>Std RWA</th><th>IRB RWA</th></tr></thead>
            <tbody>
              ${data.portfolios.map((p, idx) => `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td><input type="number" step="100" id="pfExp_${idx}" value="${p.exposureCr}" ${canEdit ? "" : "disabled"} style="width:130px;" /></td>
                  <td><input type="number" step="0.5" id="pfStd_${idx}" value="${p.stdRwPct}" ${canEdit ? "" : "disabled"} style="width:95px;" /></td>
                  <td><input type="number" step="0.5" id="pfIrb_${idx}" value="${p.irbRwPct}" ${canEdit ? "" : "disabled"} style="width:95px;" /></td>
                  <td class="mono">${S.fmtInr(p.exposureCr * (p.stdRwPct / 100))}</td>
                  <td class="mono">${S.fmtInr(p.exposureCr * (p.irbRwPct / 100))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:16px; margin-bottom:12px;">Capital &amp; Liquidity Metrics</h3>
        <div class="grid grid-3">
          <div class="alert-box alert-ok"><div><strong>Tier 1 Ratio</strong><div class="text-xs">CET1 + AT1</div></div><strong class="mono">${S.fmtPct(m.tier1Pct)}</strong></div>
          <div class="alert-box alert-blue"><div><strong>Leverage Ratio</strong><div class="text-xs">RBI Min 3.50%</div></div><strong class="mono">${S.fmtPct(m.levPct)}</strong></div>
          <div class="alert-box alert-ok"><div><strong>LCR / NSFR</strong><div class="text-xs">RBI Min 100%</div></div><strong class="mono">${S.fmtPct(m.lcrPct)} / ${S.fmtPct(m.nsfrPct)}</strong></div>
        </div>
      </div>
    `;
  }

  /* ---------------- 5. GL RECONCILIATION ---------------- */
  function renderReconciliation() {
    const data = S.getData();
    const canApprove = session.roleId === "finance-approver" && can("reconciliation", "X");
    return `
      <div class="card">
        <div style="margin-bottom:14px;">
          <h3 style="font-size:17px;">3-Way Risk Engine vs Oracle OFSAA GL vs Regulatory Return</h3>
          <p class="text-xs muted">Only Finance Approver can sign off GL variance breaks.</p>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Book / Ledger Item</th><th>Risk System</th><th>Risk Bal (Cr)</th><th>GL Bal (Cr)</th><th>Variance</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              ${data.reconciliation.map(r => {
                const diff = r.riskBal - r.glBal;
                return `
                  <tr>
                    <td class="mono"><strong>${r.id}</strong></td>
                    <td><strong>${r.item}</strong><div class="text-xs subtle">${r.glCode} · ${r.note}</div></td>
                    <td>${r.riskSys}</td>
                    <td class="mono">${r.riskBal.toLocaleString("en-IN")}</td>
                    <td class="mono">${r.glBal.toLocaleString("en-IN")}</td>
                    <td class="mono">${diff === 0 ? "0" : diff.toLocaleString("en-IN")}</td>
                    <td>${badgeStatus(r.status)}</td>
                    <td>
                      ${r.status !== "Matched" ? (canApprove ? `<button type="button" class="btn btn-sm btn-green" onclick="HDFCWorkspace.approveRecon('${r.id}')">Approve &amp; Match</button>` : `<span class="text-xs subtle">Requires Finance Approver</span>`) : `<span class="text-xs subtle">Reconciled</span>`}
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* ---------------- 6. 5-STAGE APPROVALS (NON-COLLIDING) ---------------- */
  function renderApprovals() {
    const data = S.getData();
    const openCritical = data.exceptions.filter(e => e.status === "Open" && e.severity === "Critical").length;

    return `
      <div class="alert-box ${openCritical > 0 ? "alert-warn" : "alert-ok"}">
        <div>
          <strong>Segregation of Duties Enforced (No In-Page Role Switcher)</strong>
          <div class="text-xs" style="margin-top:2px;">
            ${openCritical > 0 ? `${openCritical} critical DQ break(s) remain open; Stage 5 Final RBI Publish is gated until resolved.` : "All critical DQ checks cleared. Each stage must be signed in sequentially by its designated HDFC Bank stakeholder."}
          </div>
        </div>
        <span class="badge badge-info">Maker != Checker</span>
      </div>

      <div style="display:grid; gap:14px;">
        ${data.approvalStages.map((st, idx) => {
          const prevDone = idx === 0 || data.approvalStages[idx - 1].status === "Approved";
          const isActorMatch = session.roleId === st.requiredRoleId;
          const canAct = st.status !== "Approved" && prevDone && isActorMatch && !(st.stage === 5 && openCritical > 0);
          return `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap;">
              <div>
                <div style="display:flex; align-items:center; gap:10px;">
                  <strong style="font-size:15px;">${st.title}</strong>
                  ${badgeStatus(st.status)}
                </div>
                <div class="text-xs muted" style="margin-top:4px;">Required Signer: <strong>${st.requiredRoleTitle}</strong></div>
                ${st.actor ? `<div class="text-xs subtle" style="margin-top:4px;">Signed by ${st.actor} (${st.timestamp}) · ${st.note}</div>` : ""}
              </div>
              <div style="display:flex; gap:8px; align-items:center;">
                ${st.status === "Approved"
                  ? `<span class="badge badge-ok">Certified</span>`
                  : canAct
                    ? `<button type="button" class="btn btn-green btn-sm" onclick="HDFCWorkspace.approveStage(${st.stage})">Sign Off Stage ${st.stage}</button>
                       <button type="button" class="btn btn-danger-outline btn-sm" onclick="HDFCWorkspace.rejectStage(${st.stage})">Return</button>`
                    : `<span class="text-xs subtle">${!prevDone ? "Awaiting prior stage" : `Requires sign-in as ${st.requiredRoleTitle} (Sign Out to switch user)`}</span>`
                }
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  /* ---------------- 7. REPORT MANAGEMENT & SIGNED-OFF PRINT-TO-PDF ---------------- */
  function renderReports() {
    const data = S.getData();
    const isRegulator = session.roleId === "rbi-supervisor";
    const isMaker = session.roleId === "reporting-analyst";
    const isChecker = session.roleId === "compliance-officer" || session.roleId === "reporting-manager";
    const visibleReports = isRegulator ? data.reports.filter(r => S.isSignedOffReport(r)) : data.reports;

    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="font-size:17px;">Regulatory Report Management &amp; Print-to-PDF</h3>
            <p class="text-xs muted">
              ${isRegulator
                ? "RBI Supervisory Scope: Only certified Approved / Published to RBI reports are visible."
                : "Download Report as PDF triggers the browser Print-to-PDF dialog strictly for signed-off (Approved / Published to RBI) reports."}
            </p>
          </div>
          ${isMaker ? `<button type="button" class="btn btn-primary btn-sm" onclick="HDFCWorkspace.openNewReportModal()">+ Create Regulatory Report</button>` : ""}
        </div>

        <div class="table-wrap">
          <table>
            <thead><tr><th>Report ID</th><th>Code</th><th>Title</th><th>Date</th><th>Status</th><th>Summary</th><th>Actions</th></tr></thead>
            <tbody>
              ${visibleReports.map(r => {
                const signed = S.isSignedOffReport(r);
                return `
                  <tr>
                    <td class="mono"><strong>${r.id}</strong></td>
                    <td class="mono">${r.code}</td>
                    <td><strong>${r.title}</strong><div class="text-xs subtle">Owner: ${r.owner}</div></td>
                    <td class="mono">${r.date}</td>
                    <td>${badgeStatus(r.status)}</td>
                    <td class="text-xs">${r.summary}</td>
                    <td>
                      <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        ${signed ? `<button type="button" class="btn btn-primary btn-sm" onclick="HDFCWorkspace.printReportPdf('${r.id}')">Download Report as PDF</button>` : `<span class="text-xs subtle">PDF locked until Signed Off</span>`}
                        ${isMaker && r.status === "Generated" ? `<button type="button" class="btn btn-outline btn-sm" onclick="HDFCWorkspace.submitReport('${r.id}')">Submit</button>` : ""}
                        ${isChecker && r.status === "Pending" ? `<button type="button" class="btn btn-green btn-sm" onclick="HDFCWorkspace.approveReport('${r.id}')">Approve &amp; Sign Off</button>` : ""}
                        <button type="button" class="btn btn-outline btn-sm" onclick="HDFCWorkspace.exportReportCsv('${r.id}')">CSV</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* ---------------- 8. RBI SUPERVISORY PORTAL ---------------- */
  function renderRbiPortal() {
    const data = S.getData();
    const certified = data.reports.filter(r => S.isSignedOffReport(r));
    const canRaiseOrClose = session.roleId === "rbi-supervisor" || session.roleId === "compliance-officer";

    return `
      <div class="card-dark">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div class="text-xs" style="color:#93c5fd; font-weight:700; text-transform:uppercase;">Reserve Bank of India (RBI) · Department of Supervision</div>
            <h3 style="font-size:20px; margin-top:4px;">Certified HDFC Bank Regulatory Filings Vault</h3>
            <p class="text-xs" style="color:#cbd5e1; margin-top:4px;">Only Stage 5 signed-off (Approved / Published to RBI) returns appear here. Internal drafts and raw ingestion feeds are isolated.</p>
          </div>
          <span class="badge badge-ok">${certified.length} Certified Filings</span>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:16px; margin-bottom:12px;">Certified Filings</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Report ID</th><th>RBI Code</th><th>Title</th><th>Date</th><th>Status</th><th>Audit Hash</th><th>PDF</th></tr></thead>
            <tbody>
              ${certified.map(r => `
                <tr>
                  <td class="mono"><strong>${r.id}</strong></td>
                  <td class="mono">${r.code}</td>
                  <td>${r.title}</td>
                  <td class="mono">${r.date}</td>
                  <td>${badgeStatus(r.status)}</td>
                  <td class="mono text-xs">${r.hash}</td>
                  <td><button type="button" class="btn btn-primary btn-sm" onclick="HDFCWorkspace.printReportPdf('${r.id}')">Download Report as PDF</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
          <h3 style="font-size:16px;">RBI Supervisory Queries</h3>
          ${canRaiseOrClose ? `<button type="button" class="btn btn-blue btn-sm" onclick="HDFCWorkspace.openRaiseQueryModal()">+ Raise Supervisory Query</button>` : ""}
        </div>
        <div style="display:grid; gap:12px;">
          ${data.queries.map(q => `
            <div style="border:1px solid var(--border); border-radius:10px; padding:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                <div><strong class="mono">${q.id}</strong> &middot; <strong>${q.subject}</strong> <span class="text-xs subtle">(${q.reportCode})</span></div>
                <div style="display:flex; gap:6px;">${badgeStatus(q.priority)} ${badgeStatus(q.status)}</div>
              </div>
              <p class="text-sm" style="margin-top:8px;">${q.question}</p>
              <div class="text-xs subtle" style="margin-top:4px;">Raised by ${q.raisedBy} · ${q.raisedAt}</div>
              ${q.response ? `<div class="alert-box alert-ok" style="margin-top:10px; font-size:12px;"><div><strong>HDFC Bank Response:</strong> ${q.response}</div></div>` : ""}
              ${q.status === "Open" && session.roleId === "compliance-officer" ? `
                <div style="display:flex; gap:8px; margin-top:10px;">
                  <input type="text" id="qryResp_${q.id}" placeholder="Enter official compliance response..." />
                  <button type="button" class="btn btn-green btn-sm" onclick="HDFCWorkspace.respondAndCloseQuery('${q.id}')">Respond &amp; Close</button>
                </div>
              ` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  /* ---------------- 9. RBAC, USERS, CONFIG & AUDIT TRAIL ---------------- */
  function renderAuditConfig() {
    const data = S.getData();
    const rbac = S.getRbac();
    const accounts = S.getAccounts();
    const isAdmin = session.roleId === "super-admin" || session.roleId === "reg-admin";

    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="font-size:17px;">Regulatory Thresholds &amp; Configuration</h3>
            <p class="text-xs muted">${isAdmin ? "Edit HDFC Bank / RBI Basel IV regulatory limits." : "Read-only Audit View (Only Admin can modify configuration)."}</p>
          </div>
          ${isAdmin ? `<button type="button" class="btn btn-primary btn-sm" onclick="HDFCWorkspace.saveConfig()">Save Config</button>` : ""}
        </div>
        <div class="grid grid-4">
          <div><label class="fl">Reporting Date</label><input type="text" id="cfgDate" value="${data.config.reportingDate}" ${isAdmin ? "" : "disabled"} /></div>
          <div><label class="fl">Min CRAR (%)</label><input type="number" step="0.1" id="cfgCrar" value="${data.config.minCrarPct}" ${isAdmin ? "" : "disabled"} /></div>
          <div><label class="fl">Output Floor (%)</label><input type="number" step="0.5" id="cfgFloor" value="${data.config.outputFloorPct}" ${isAdmin ? "" : "disabled"} /></div>
          <div><label class="fl">Daily SLA Cutoff</label><input type="text" id="cfgSla" value="${data.config.slaCutoffIst}" ${isAdmin ? "" : "disabled"} /></div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="font-size:17px;">Non-Colliding RBAC Matrix (R, W, X)</h3>
            <p class="text-xs muted">Segregation of Duties enforced across all HDFC Bank &amp; RBI roles.</p>
          </div>
          ${isAdmin ? `<button type="button" class="btn btn-outline btn-sm" onclick="HDFCWorkspace.resetRbacMatrix()">Reset Strict Defaults</button>` : ""}
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Module</th>
                ${S.ROLES.map(r => `<th>${r.title}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rbac.map(row => `
                <tr>
                  <td><strong>${row.moduleName}</strong></td>
                  ${S.ROLES.map(r => {
                    const flags = row.perms[r.id] || "-";
                    if (!isAdmin) return `<td class="mono text-xs">${flags}</td>`;
                    return `
                      <td>
                        <div style="display:flex; gap:3px;">
                          ${["R", "W", "X"].map(f => {
                            const active = flags.split(",").map(s => s.trim()).includes(f);
                            return `<button type="button" class="btn btn-sm" style="padding:2px 6px; font-size:10px; background:${active ? "#1d4ed8" : "#f1f5f9"}; color:${active ? "#fff" : "#64748b"};" onclick="HDFCWorkspace.toggleRbac('${row.moduleId}','${r.id}','${f}')">${f}</button>`;
                          }).join("")}
                        </div>
                      </td>
                    `;
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="font-size:17px;">Registered Stakeholders (${accounts.length})</h3>
          ${isAdmin ? `<button type="button" class="btn btn-blue btn-sm" onclick="HDFCWorkspace.openAddUserModal()">+ Add User</button>` : ""}
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>User ID</th><th>Full Name</th><th>Official Email</th><th>Role</th><th>Department</th></tr></thead>
            <tbody>
              ${accounts.map(a => `
                <tr>
                  <td class="mono"><strong>${a.userId}</strong></td>
                  <td>${a.fullName}</td>
                  <td class="mono text-xs">${a.email}</td>
                  <td>${S.getRoleById(a.roleId).title}</td>
                  <td>${a.department}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="font-size:17px;">Immutable Audit Trail</h3>
          <button type="button" class="btn btn-outline btn-sm" onclick="HDFCWorkspace.exportAuditCsv()">Export Audit CSV</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Event ID</th><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Summary</th><th>Ref</th></tr></thead>
            <tbody>
              ${data.auditEvents.map(a => `
                <tr>
                  <td class="mono"><strong>${a.id}</strong></td>
                  <td class="mono text-xs">${a.timestamp}</td>
                  <td>${a.actor}</td>
                  <td class="text-xs">${a.role}</td>
                  <td>${badgeStatus(a.action)}</td>
                  <td>${a.summary}</td>
                  <td class="mono text-xs">${a.ref}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderView() {
    const root = document.getElementById("wsContent");
    if (!root) return;
    if (currentView === "overview") root.innerHTML = renderOverview();
    else if (currentView === "data-ingestion") root.innerHTML = renderDataIngestion();
    else if (currentView === "quality") root.innerHTML = renderQuality();
    else if (currentView === "basel") root.innerHTML = renderBasel();
    else if (currentView === "reconciliation") root.innerHTML = renderReconciliation();
    else if (currentView === "approvals") root.innerHTML = renderApprovals();
    else if (currentView === "reports") root.innerHTML = renderReports();
    else if (currentView === "rbi-portal") root.innerHTML = renderRbiPortal();
    else if (currentView === "audit-config") root.innerHTML = renderAuditConfig();
  }

  /* ---------------- ACTION HANDLERS ---------------- */
  function downloadBlob(name, content, type) {
    const blob = new Blob([content], { type: type || "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const API = {
    go,
    signOut() {
      S.appendAudit("Auth Sign-Out", "User signed out of workspace", session.userId, session.fullName, roleDef.title);
      S.setSession(null);
      window.location.href = "./index.html?auth=1";
    },
    openPasswordModal() {
      document.getElementById("wsPwdMsg").classList.add("hidden");
      document.getElementById("pwdModal").classList.add("show");
    },
    closePasswordModal() { document.getElementById("pwdModal").classList.remove("show"); },
    savePasswordChange(e) {
      e.preventDefault();
      const curr = document.getElementById("wsCurrPwd").value || "";
      const n1 = document.getElementById("wsNewPwd").value || "";
      const n2 = document.getElementById("wsNewPwd2").value || "";
      const msg = document.getElementById("wsPwdMsg");
      const list = S.getAccounts();
      const idx = list.findIndex(a => a.userId === session.userId);
      if (idx === -1 || list[idx].password !== curr) {
        msg.className = "alert-box alert-red"; msg.textContent = "Current password verification failed."; msg.classList.remove("hidden"); return;
      }
      if (n1.length < 8 || n1 !== n2) {
        msg.className = "alert-box alert-red"; msg.textContent = "New password must be at least 8 characters and match confirmation."; msg.classList.remove("hidden"); return;
      }
      list[idx].password = n1;
      S.saveAccounts(list);
      S.appendAudit("Password Update", "Changed password inside workspace", session.userId);
      this.closePasswordModal();
      toast("Password updated securely.", "ok");
    },
    closeActionModal() { document.getElementById("actionModal").classList.remove("show"); },

    runDqChecks() {
      const data = S.getData();
      data.rules.forEach(r => { if (r.severity !== "Critical") { r.status = "Passed"; r.passedPct = 100.0; } });
      S.saveData(data);
      S.appendAudit("DQ Run", "Executed full automated DQ validation ruleset", "DQ-RUN");
      renderView();
      toast("Data Quality rules executed.", "ok");
    },
    resolveException(id) {
      const data = S.getData();
      const ex = data.exceptions.find(e => e.id === id);
      if (!ex) return;
      ex.status = "Resolved";
      ex.resolutionNote = "Verified & cleared by " + session.fullName;
      const rule = data.rules.find(r => r.id === ex.ruleId);
      if (rule) { rule.status = "Passed"; rule.passedPct = 100.0; }
      S.saveData(data);
      S.appendAudit("Break Resolved", "Resolved DQ break " + id, id);
      renderSidebar();
      renderView();
      toast("Exception " + id + " resolved.", "ok");
    },
    saveBaselInputs() {
      const data = S.getData();
      data.portfolios.forEach((p, idx) => {
        p.exposureCr = Math.max(0, Number(document.getElementById("pfExp_" + idx).value) || 0);
        p.stdRwPct = Math.max(0, Number(document.getElementById("pfStd_" + idx).value) || 0);
        p.irbRwPct = Math.max(0, Number(document.getElementById("pfIrb_" + idx).value) || 0);
      });
      S.saveData(data);
      S.appendAudit("Basel IV Recalc", "Updated portfolio risk weights & recalculated CRAR / 72.5% Output Floor", "BASEL-CALC");
      renderView();
      toast("Basel IV ratios recalculated.", "ok");
    },
    exportBaselCsv() {
      const data = S.getData();
      const rows = ["Portfolio,Exposure_Cr,Std_RW_Pct,IRB_RW_Pct", ...data.portfolios.map(p => `"${p.name}",${p.exposureCr},${p.stdRwPct},${p.irbRwPct}`)];
      downloadBlob("HDFC_Basel4_Portfolios_" + data.config.reportingDate + ".csv", "\uFEFF" + rows.join("\n"), "text/csv;charset=utf-8;");
      toast("Exported Basel IV portfolio CSV.", "ok");
    },
    approveRecon(id) {
      if (session.roleId !== "finance-approver") { toast("Only Finance Approver can certify GL reconciliation breaks.", "warn"); return; }
      const data = S.getData();
      const row = data.reconciliation.find(r => r.id === id);
      if (!row) return;
      row.glBal = row.riskBal;
      row.status = "Matched";
      row.note = "Certified & matched by " + session.fullName;
      S.saveData(data);
      S.appendAudit("GL Certification", "Cleared 3-way GL variance on " + id, id);
      renderView();
      toast(id + " reconciled and certified.", "ok");
    },
    approveStage(stageNum) {
      const data = S.getData();
      const st = data.approvalStages.find(s => s.stage === stageNum);
      if (!st || session.roleId !== st.requiredRoleId) return;
      st.status = "Approved";
      st.actor = session.fullName;
      st.timestamp = data.config.reportingDate + " · " + new Date().toLocaleTimeString("en-IN");
      st.note = "Approved by " + session.fullName;
      if (stageNum === 5) {
        data.reports.forEach(r => { if (r.status === "Pending" || r.status === "Generated") r.status = "Published to RBI"; });
      }
      S.saveData(data);
      S.appendAudit("Approval Sign-Off", "Signed off " + st.title, "STAGE-" + stageNum);
      renderView();
      toast(st.title + " signed off.", "ok");
    },
    rejectStage(stageNum) {
      const data = S.getData();
      const st = data.approvalStages.find(s => s.stage === stageNum);
      if (!st || session.roleId !== st.requiredRoleId) return;
      st.status = "Returned";
      st.actor = session.fullName;
      st.note = "Returned for Maker correction";
      S.saveData(data);
      S.appendAudit("Approval Returned", "Returned " + st.title, "STAGE-" + stageNum);
      renderView();
      toast(st.title + " returned.", "warn");
    },
    openNewReportModal() {
      if (session.roleId !== "reporting-analyst") return;
      document.getElementById("actionModalTitle").textContent = "Create Consolidated Regulatory Report";
      document.getElementById("actionModalBody").innerHTML = `
        <form onsubmit="HDFCWorkspace.createReport(event)" style="display:grid; gap:12px;">
          <div><label class="fl">Report Code</label><select id="nrCode"><option value="RBI-RCA3-B4">RBI-RCA3-B4 (Capital Adequacy)</option><option value="RBI-BLR1-LCR">RBI-BLR1-LCR (Liquidity LCR/NSFR)</option><option value="RBI-LR1-LEV">RBI-LR1-LEV (Leverage Ratio)</option></select></div>
          <div><label class="fl">Report Title</label><input type="text" id="nrTitle" placeholder="e.g. HDFC Bank Daily Basel IV Return" required /></div>
          <div style="display:flex; justify-content:flex-end; gap:8px;"><button type="button" class="btn btn-outline" onclick="HDFCWorkspace.closeActionModal()">Cancel</button><button type="submit" class="btn btn-primary">Create Draft</button></div>
        </form>
      `;
      document.getElementById("actionModal").classList.add("show");
    },
    createReport(e) {
      e.preventDefault();
      const data = S.getData();
      const m = S.computeBaselMetrics(data);
      const code = document.getElementById("nrCode").value;
      const title = document.getElementById("nrTitle").value.trim();
      const id = "REP-HDFC-" + (100 + data.reports.length + 1);
      data.reports.unshift({
        id,
        code,
        title,
        date: data.config.reportingDate,
        version: "v1.0",
        status: "Generated",
        owner: session.fullName,
        summary: `CRAR ${S.fmtPct(m.crarPct)} · CET1 ${S.fmtPct(m.cet1Pct)} · LCR ${S.fmtPct(m.lcrPct)}`,
        hash: "SHA256-HDFC-" + id
      });
      S.saveData(data);
      S.appendAudit("Report Created", "Created Maker draft report " + id, id);
      this.closeActionModal();
      renderView();
      toast("Draft report " + id + " created.", "ok");
    },
    submitReport(id) {
      if (session.roleId !== "reporting-analyst") return;
      const data = S.getData();
      const r = data.reports.find(x => x.id === id);
      if (!r) return;
      r.status = "Pending";
      S.saveData(data);
      S.appendAudit("Report Submitted", "Submitted " + id + " for Checker sign-off", id);
      renderView();
      toast("Report " + id + " submitted for Checker sign-off.", "ok");
    },
    approveReport(id) {
      if (session.roleId !== "compliance-officer" && session.roleId !== "reporting-manager") return;
      const data = S.getData();
      const r = data.reports.find(x => x.id === id);
      if (!r) return;
      r.status = session.roleId === "compliance-officer" ? "Published to RBI" : "Approved";
      r.owner = session.fullName + " (" + roleDef.title + ")";
      S.saveData(data);
      S.appendAudit("Report Sign-Off", "Signed off " + id + " -> " + r.status, id);
      renderView();
      toast("Report " + id + " signed off (" + r.status + "). Print-to-PDF is now unlocked.", "ok");
    },
    printReportPdf(id) {
      const data = S.getData();
      const r = data.reports.find(x => x.id === id);
      if (!r || !S.isSignedOffReport(r)) {
        toast("Print-to-PDF is strictly restricted to signed-off (Approved / Published to RBI) reports.", "warn");
        return;
      }
      const m = S.computeBaselMetrics(data);
      const sheet = document.getElementById("printReportSheet");
      sheet.innerHTML = `
        <div class="prs-header">
          <div>
            <div style="font-size:11px; font-weight:700; color:#1d4ed8; text-transform:uppercase;">HDFC Bank · Reserve Bank of India (RBI) Regulatory Filing Pack</div>
            <h1 style="font-size:20px; margin-top:4px;">${r.title}</h1>
            <div style="font-size:12px; color:#475569; margin-top:2px;">Report ID: ${r.id} &middot; Form Code: ${r.code} &middot; Status: ${r.status}</div>
          </div>
          <div style="text-align:right; font-size:11px; color:#475569;">
            <div>Reporting Date: ${r.date}</div>
            <div>Certified By: ${r.owner}</div>
            <div>Integrity Hash: ${r.hash}</div>
          </div>
        </div>
        <div class="prs-meta">
          <div><strong>Total CRAR:</strong> ${S.fmtPct(m.crarPct)} (RBI Min ${S.fmtPct(data.config.minCrarPct)})</div>
          <div><strong>CET1 Capital Ratio:</strong> ${S.fmtPct(m.cet1Pct)} (RBI Min ${S.fmtPct(data.config.minCet1Pct)})</div>
          <div><strong>72.5% Floor Binding RWA:</strong> ${S.fmtInr(m.bindingRwa)}</div>
          <div><strong>Liquidity Coverage (LCR):</strong> ${S.fmtPct(m.lcrPct)} &middot; NSFR: ${S.fmtPct(m.nsfrPct)}</div>
        </div>
        <p style="margin-bottom:10px;"><strong>Executive Summary:</strong> ${r.summary}</p>
        <table>
          <thead><tr><th>Portfolio Book</th><th>Exposure (Rs Cr)</th><th>Std RW %</th><th>IRB RW %</th><th>Std RWA</th><th>IRB RWA</th></tr></thead>
          <tbody>
            ${data.portfolios.map(p => `<tr><td>${p.name}</td><td>${p.exposureCr.toLocaleString("en-IN")}</td><td>${p.stdRwPct}%</td><td>${p.irbRwPct}%</td><td>${S.fmtInr(p.exposureCr * p.stdRwPct / 100)}</td><td>${S.fmtInr(p.exposureCr * p.irbRwPct / 100)}</td></tr>`).join("")}
          </tbody>
        </table>
        <div style="margin-top:20px; font-size:11px; color:#64748b;">Generated offline from HDFC Bank Basel IV &amp; RBI Regulatory Reporting Hub on ${new Date().toLocaleString("en-IN")}</div>
      `;
      const prevTitle = document.title;
      document.title = `HDFC_Bank_${r.id}_SignedOff`;
      S.appendAudit("PDF Print", "Triggered browser Print-to-PDF for signed-off report " + r.id, r.id);
      window.print();
      setTimeout(() => { document.title = prevTitle; }, 1000);
    },
    exportReportCsv(id) {
      const r = S.getData().reports.find(x => x.id === id);
      if (!r) return;
      const csv = `Report_ID,Code,Title,Date,Status,Owner,Summary,Hash\n"${r.id}","${r.code}","${r.title}","${r.date}","${r.status}","${r.owner}","${r.summary}","${r.hash}"`;
      downloadBlob(`HDFC_${r.id}.csv`, "\uFEFF" + csv, "text/csv;charset=utf-8;");
      toast("Exported " + r.id + " CSV.", "ok");
    },
    openRaiseQueryModal() {
      document.getElementById("actionModalTitle").textContent = "Raise RBI Supervisory Query";
      document.getElementById("actionModalBody").innerHTML = `
        <form onsubmit="HDFCWorkspace.saveNewQuery(event)" style="display:grid; gap:12px;">
          <div><label class="fl">RBI Form Code</label><select id="nqCode"><option>RBI-RCA3-B4</option><option>RBI-BLR1-LCR</option><option>RBI-LR1-LEV</option></select></div>
          <div><label class="fl">Subject</label><input type="text" id="nqSubj" required /></div>
          <div><label class="fl">Priority</label><select id="nqPrio"><option>High</option><option>Standard</option></select></div>
          <div><label class="fl">Supervisory Question</label><textarea id="nqText" rows="3" required></textarea></div>
          <div style="display:flex; justify-content:flex-end; gap:8px;"><button type="button" class="btn btn-outline" onclick="HDFCWorkspace.closeActionModal()">Cancel</button><button type="submit" class="btn btn-primary">Submit Query</button></div>
        </form>
      `;
      document.getElementById("actionModal").classList.add("show");
    },
    saveNewQuery(e) {
      e.preventDefault();
      const data = S.getData();
      const qId = "RBI-Q-" + (883 + data.queries.length);
      data.queries.unshift({
        id: qId,
        reportCode: document.getElementById("nqCode").value,
        subject: document.getElementById("nqSubj").value.trim(),
        priority: document.getElementById("nqPrio").value,
        question: document.getElementById("nqText").value.trim(),
        raisedBy: session.fullName + " (" + roleDef.title + ")",
        raisedAt: data.config.reportingDate + " · " + new Date().toLocaleTimeString("en-IN"),
        status: "Open",
        response: ""
      });
      S.saveData(data);
      S.appendAudit("Query Raised", "Raised RBI query " + qId, qId);
      this.closeActionModal();
      renderSidebar();
      renderView();
      toast("Supervisory query " + qId + " logged.", "ok");
    },
    respondAndCloseQuery(id) {
      if (session.roleId !== "compliance-officer") return;
      const txt = (document.getElementById("qryResp_" + id).value || "").trim();
      if (!txt) { toast("Enter a response before closing the query.", "warn"); return; }
      const data = S.getData();
      const q = data.queries.find(x => x.id === id);
      if (!q) return;
      q.response = txt;
      q.status = "Closed";
      S.saveData(data);
      S.appendAudit("Query Closed", "Responded and closed RBI query " + id, id);
      renderSidebar();
      renderView();
      toast("Query " + id + " responded and closed.", "ok");
    },
    saveConfig() {
      const data = S.getData();
      data.config.reportingDate = document.getElementById("cfgDate").value.trim() || data.config.reportingDate;
      data.config.minCrarPct = Number(document.getElementById("cfgCrar").value) || data.config.minCrarPct;
      data.config.outputFloorPct = Number(document.getElementById("cfgFloor").value) || data.config.outputFloorPct;
      data.config.slaCutoffIst = document.getElementById("cfgSla").value.trim() || data.config.slaCutoffIst;
      S.saveData(data);
      S.appendAudit("Config Updated", "Updated regulatory thresholds & SLA cutoff", "CFG-SYS");
      toast("Configuration saved.", "ok");
    },
    toggleRbac(modId, rId, flag) {
      const matrix = S.getRbac();
      const row = matrix.find(m => m.moduleId === modId);
      if (!row) return;
      const curr = (row.perms[rId] || "").split(",").map(s => s.trim()).filter(s => s === "R" || s === "W" || s === "X");
      const exists = curr.includes(flag);
      const next = exists ? curr.filter(f => f !== flag) : ["R", "W", "X"].filter(f => curr.includes(f) || f === flag);
      row.perms[rId] = next.length ? next.join(", ") : "-";
      S.saveRbac(matrix);
      S.appendAudit("RBAC Matrix", `Toggled ${flag} on ${modId} for ${rId}`, modId);
      renderView();
    },
    resetRbacMatrix() {
      S.resetRbac();
      S.appendAudit("RBAC Reset", "Restored strict non-colliding RBAC defaults", "RBAC-RESET");
      renderView();
      toast("Restored strict non-colliding RBAC defaults.", "ok");
    },
    openAddUserModal() {
      document.getElementById("actionModalTitle").textContent = "Add HDFC Bank / RBI User";
      document.getElementById("actionModalBody").innerHTML = `
        <form onsubmit="HDFCWorkspace.saveNewUser(event)" style="display:grid; gap:10px;">
          <div><label class="fl">User ID</label><input type="text" id="auId" class="mono" placeholder="HDFC-DQA-2099" required /></div>
          <div><label class="fl">Full Name</label><input type="text" id="auName" required /></div>
          <div><label class="fl">Official Email</label><input type="email" id="auEmail" placeholder="name@hdfcbank.com" required /></div>
          <div><label class="fl">Role</label><select id="auRole">${S.ROLES.map(r => `<option value="${r.id}">${r.title}</option>`).join("")}</select></div>
          <div><label class="fl">Initial Password (min 8 chars)</label><input type="password" id="auPwd" required /></div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:6px;"><button type="button" class="btn btn-outline" onclick="HDFCWorkspace.closeActionModal()">Cancel</button><button type="submit" class="btn btn-primary">Create User</button></div>
        </form>
      `;
      document.getElementById("actionModal").classList.add("show");
    },
    saveNewUser(e) {
      e.preventDefault();
      const userId = document.getElementById("auId").value.trim().toUpperCase();
      const fullName = document.getElementById("auName").value.trim();
      const email = document.getElementById("auEmail").value.trim().toLowerCase();
      const roleId = document.getElementById("auRole").value;
      const password = document.getElementById("auPwd").value || "";
      if (password.length < 8) { toast("Password must be at least 8 characters.", "warn"); return; }
      const list = S.getAccounts();
      if (list.some(a => a.userId === userId || a.email === email)) { toast("User ID or Email already exists.", "warn"); return; }
      const rDef = S.getRoleById(roleId);
      list.push({ userId, fullName, email, department: rDef.department, roleId, password });
      S.saveAccounts(list);
      S.appendAudit("User Added", "Provisioned " + userId + " (" + rDef.title + ")", userId);
      this.closeActionModal();
      renderView();
      toast("Added user " + userId + ".", "ok");
    },
    exportAuditCsv() {
      const data = S.getData();
      const rows = ["ID,Timestamp,Actor,Role,Action,Summary,Ref", ...data.auditEvents.map(a => `"${a.id}","${a.timestamp}","${a.actor}","${a.role}","${a.action}","${a.summary}","${a.ref}"`)];
      downloadBlob("HDFC_Audit_Trail_" + data.config.reportingDate + ".csv", "\uFEFF" + rows.join("\n"), "text/csv;charset=utf-8;");
      toast("Exported immutable audit trail CSV.", "ok");
    }
  };

  global.HDFCWorkspace = API;

  document.addEventListener("DOMContentLoaded", function () {
    S.hydrateLogos();
    if (!requireSession()) return;
    renderChrome();
    const hash = (window.location.hash || "").replace(/^#/, "");
    go(hash && canAccess(hash) ? hash : roleDef.defaultView);
    window.addEventListener("hashchange", function () {
      const next = (window.location.hash || "").replace(/^#/, "");
      if (next && next !== currentView) go(next);
    });
  });
})(window);
