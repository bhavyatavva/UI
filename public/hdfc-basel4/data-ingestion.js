/* HDFC BANK · DATA INGESTION MODULE (PURE VANILLA JS, CHROME FILE:// READY) */
const INGESTION_STORAGE_KEY = "hdfc_basel4_ingestion_v1";
const SESSION_STORAGE_KEY = "hdfc_basel4_session_v1";
const RBAC_STORAGE_KEY = "hdfc_basel4_rbac_v1";

const SAMPLE_EXCEL_TSV = [
  "HDFC-LN-90412\tReliance Retail Infra Ltd\tCorporate & Infrastructure\t450.50\t75",
  "HDFC-LN-90413\tMumbai Metro Phase III SPV\tCorporate & Infrastructure\t820.00\t100",
  "HDFC-LN-90414\tBharat Precision MSME\tMSME & Priority Sector\t115.25\t75",
  "HDFC-LN-90415\tSovereign GOI 2036 G-Sec\tTreasury & Sovereign\t1250.00\t0"
].join("\n");

const DEFAULT_INGESTION_STATE = {
  totalRecords: 7312690,
  sources: [
    { id: "SRC001", name: "Finacle Core Banking (CBS)", category: "Core Banking", connection: "Database", status: "Connected" },
    { id: "SRC002", name: "CreditLens Risk Engine", category: "Loans", connection: "API", status: "Connected" },
    { id: "SRC003", name: "Kondor+ Treasury & Derivatives", category: "Treasury", connection: "SFTP", status: "Connected" },
    { id: "SRC004", name: "Oracle OFSAA General Ledger", category: "Finance", connection: "Database", status: "Connected" },
    { id: "SRC005", name: "CERSAI & Collateral Vault", category: "Risk Management", connection: "API", status: "Disconnected" }
  ],
  feeds: [
    { id: "FD001", name: "Customer & Retail Ledger Feed", source: "Finacle Core Banking (CBS)", format: "CSV", frequency: "Daily", lastRun: "14 Nov 2026, 06:12 IST", records: 2845000, status: "Success" },
    { id: "FD002", name: "Corporate Credit Exposure Feed", source: "CreditLens Risk Engine", format: "JSON", frequency: "Daily", lastRun: "14 Nov 2026, 06:44 IST", records: 1920000, status: "Success" },
    { id: "FD003", name: "Treasury & Derivatives MTM Feed", source: "Kondor+ Treasury & Derivatives", format: "XML", frequency: "Daily", lastRun: "14 Nov 2026, 07:05 IST", records: 1142690, status: "Success" },
    { id: "FD004", name: "General Ledger Balances Feed", source: "Oracle OFSAA General Ledger", format: "CSV", frequency: "Daily", lastRun: "14 Nov 2026, 07:18 IST", records: 1405000, status: "Success" },
    { id: "FD005", name: "CERSAI Collateral Valuation Feed", source: "CERSAI & Collateral Vault", format: "CSV", frequency: "Daily", lastRun: "14 Nov 2026, 07:22 IST", records: 0, status: "Failed" }
  ],
  activities: [
    { title: "General Ledger Balances Feed executed", detail: "14,05,000 records received · Successful" },
    { title: "Treasury & Derivatives MTM Feed executed", detail: "11,42,690 records received · Successful" },
    { title: "Corporate Credit Exposure Feed executed", detail: "19,20,000 records received · Successful" },
    { title: "CERSAI Collateral Feed failed", detail: "Vault connection disconnected · Awaiting reconnect" }
  ]
};

function loadState() {
  try {
    const raw = localStorage.getItem(INGESTION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.sources) && Array.isArray(parsed.feeds)) return parsed;
    }
  } catch (e) { /* ignore */ }
  saveState(DEFAULT_INGESTION_STATE);
  return JSON.parse(JSON.stringify(DEFAULT_INGESTION_STATE));
}

function saveState(st) {
  try { localStorage.setItem(INGESTION_STORAGE_KEY, JSON.stringify(st)); } catch (e) { /* ignore */ }
}

let state = loadState();
let session = null;
let permFlags = ["R", "W", "X"];

function readAuthAndPerms() {
  try {
    const rawSess = localStorage.getItem(SESSION_STORAGE_KEY);
    session = rawSess ? JSON.parse(rawSess) : null;
  } catch (e) { session = null; }

  const isEmbed = new URLSearchParams(window.location.search).get("embed") === "1";
  if (isEmbed) {
    document.getElementById("ingestionApp").classList.add("embedded");
  } else if (!session) {
    window.location.href = "./index.html?auth=1";
    return;
  }

  let flagsStr = "R, W, X";
  if (session) {
    try {
      const rawRbac = localStorage.getItem(RBAC_STORAGE_KEY);
      if (rawRbac) {
        const rows = JSON.parse(rawRbac);
        const row = rows.find(r => r.moduleId === "data-ingestion");
        if (row && row.perms && row.perms[session.roleId]) {
          flagsStr = row.perms[session.roleId];
        }
      } else {
        flagsStr = session.roleId === "data-ops-analyst" ? "R, W, X" : session.roleId === "super-admin" ? "R, W" : "R";
      }
    } catch (e) { flagsStr = "R"; }
  }
  permFlags = flagsStr.split(",").map(s => s.trim()).filter(s => s === "R" || s === "W" || s === "X");

  const roleTitle = session ? session.roleTitle : "Data Operations Analyst";
  const userId = session ? session.userId : "HDFC-OPS-3005";
  const initials = (session && session.fullName ? session.fullName : "DO")
    .split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();

  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt("diAvatar", initials || "DO");
  setTxt("diSideName", roleTitle);
  setTxt("diSidePerms", "HDFC Bank · " + (flagsStr || "-"));
  setTxt("diUserBadge", roleTitle + " · " + userId);
  setTxt("diPermBadge", "Access: " + (flagsStr || "-"));

  const pBadge = document.getElementById("diPermBadge");
  if (pBadge) pBadge.classList.toggle("readonly", !canExecute());

  const banner = document.getElementById("diPermBanner");
  if (banner) {
    if (!canWrite() && !canExecute()) {
      banner.textContent = "Read-Only Access: Only Data Operations Analyst holds full R, W, X permissions. Sign out and log in as Data Operations Analyst to modify sources, upload CSVs, or run feeds.";
      banner.classList.remove("hidden");
    } else if (!canExecute()) {
      banner.textContent = "Write Access Only (R, W): Feed execution and bulk ingestion execution require Execute (X) rights held by Data Operations Analyst.";
      banner.classList.remove("hidden");
    } else {
      banner.classList.add("hidden");
    }
  }

  ["btnOpenSourceModal", "btnOpenFeedModal", "btnSaveSchedule", "btnUploadFile", "btnLoadSample"].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.disabled = !canWrite();
  });
  const execBtn = document.getElementById("btnExecuteBulkExcel");
  if (execBtn) execBtn.disabled = !canExecute();
}

function canWrite() { return permFlags.includes("W"); }
function canExecute() { return permFlags.includes("X"); }

function notifyToast(msg, type) {
  const el = document.getElementById("diToast");
  if (!el) return;
  el.textContent = msg;
  el.className = "di-toast show " + (type || "ok");
  clearTimeout(notifyToast._t);
  notifyToast._t = setTimeout(() => { el.className = "di-toast"; }, 3400);
}

function badge(status) {
  let type = "neutral";
  if (status === "Success" || status === "Connected") type = "success";
  else if (status === "Failed" || status === "Disconnected") type = "failed";
  else if (status === "Delayed" || status === "In Progress") type = "warning";
  return `<span class="badge ${type}">${status}</span>`;
}

function addActivity(title, detail) {
  state.activities.unshift({ title, detail });
  state.activities = state.activities.slice(0, 8);
  saveState(state);
  renderDashboard();
}

/* 01 SOURCE SYSTEM REGISTRATION */
function renderSources() {
  document.getElementById("sourceTable").innerHTML = state.sources.map(s => `
    <tr>
      <td><strong>${s.id}</strong></td>
      <td>${s.name}</td>
      <td>${s.category}</td>
      <td>${s.connection}</td>
      <td>${badge(s.status)}</td>
      <td>
        <button type="button" class="table-action" ${canWrite() ? "" : "disabled"} onclick="toggleSource('${s.id}')">
          ${s.status === "Connected" ? "Disconnect" : "Connect"}
        </button>
      </td>
    </tr>
  `).join("");
  document.getElementById("sourceCount").textContent = state.sources.length;
  populateSourceDropdowns();
}

function openSourceModal() {
  if (!canWrite()) { notifyToast("Write (W) permission required.", "warn"); return; }
  document.getElementById("sourceModal").classList.add("show");
}

function registerSource() {
  if (!canWrite()) return;
  const name = document.getElementById("newSourceName").value.trim();
  const category = document.getElementById("newSourceCategory").value;
  const connection = document.getElementById("newSourceConnection").value;
  if (!name) { notifyToast("Enter a source system name.", "warn"); return; }
  const id = "SRC" + String(state.sources.length + 1).padStart(3, "0");
  state.sources.push({ id, name, category, connection, status: "Connected" });
  saveState(state);
  renderSources();
  closeModal("sourceModal");
  document.getElementById("newSourceName").value = "";
  addActivity("New source registered", name);
  notifyToast("Source system " + name + " registered.", "ok");
}

function toggleSource(id) {
  if (!canWrite()) return;
  const s = state.sources.find(x => x.id === id);
  if (!s) return;
  s.status = s.status === "Connected" ? "Disconnected" : "Connected";
  saveState(state);
  renderSources();
  addActivity("Source connection updated", s.name + " · " + s.status);
  notifyToast(s.name + " marked " + s.status + ".", "ok");
}

/* 02 DATA FEED MANAGEMENT */
function renderFeeds() {
  document.getElementById("feedTable").innerHTML = state.feeds.map(f => `
    <tr>
      <td><strong>${f.id}</strong></td>
      <td>${f.name}</td>
      <td>${f.source}</td>
      <td>${f.format}</td>
      <td>${f.frequency}</td>
      <td>${badge(f.status)}</td>
    </tr>
  `).join("");
  document.getElementById("feedCount").textContent = state.feeds.length;
  document.getElementById("recordCount").textContent = Number(state.totalRecords).toLocaleString("en-IN");
  populateFeedDropdowns();
}

function openFeedModal() {
  if (!canWrite()) { notifyToast("Write (W) permission required.", "warn"); return; }
  populateSourceDropdowns();
  document.getElementById("feedModal").classList.add("show");
}

function createFeed() {
  if (!canWrite()) return;
  const name = document.getElementById("newFeedName").value.trim();
  const source = document.getElementById("newFeedSource").value;
  const format = document.getElementById("newFeedFormat").value;
  const frequency = document.getElementById("newFeedFrequency").value;
  if (!name || !source) { notifyToast("Enter feed name and select source.", "warn"); return; }
  const id = "FD" + String(state.feeds.length + 1).padStart(3, "0");
  state.feeds.push({ id, name, source, format, frequency, lastRun: "Pending", records: 0, status: "In Progress" });
  saveState(state);
  renderAll();
  closeModal("feedModal");
  document.getElementById("newFeedName").value = "";
  addActivity("New data feed created", name);
  notifyToast("Feed " + id + " created.", "ok");
}

function populateSourceDropdowns() {
  const el = document.getElementById("newFeedSource");
  if (el) el.innerHTML = state.sources.map(s => `<option value="${s.name}">${s.name}</option>`).join("");
}

function populateFeedDropdowns() {
  const opts = state.feeds.map(f => `<option value="${f.id}">${f.id} - ${f.name}</option>`).join("");
  const s1 = document.getElementById("scheduleFeed");
  const s2 = document.getElementById("bulkTargetFeed");
  if (s1) s1.innerHTML = opts;
  if (s2) s2.innerHTML = opts;
}

/* 03 SCHEDULED INGESTION */
function saveSchedule() {
  if (!canWrite()) return;
  const feedId = document.getElementById("scheduleFeed").value;
  const freq = document.getElementById("scheduleFrequency").value;
  const feed = state.feeds.find(f => f.id === feedId);
  if (!feed) return;
  feed.frequency = freq;
  saveState(state);
  renderFeeds();
  document.getElementById("scheduleMessage").textContent = "Schedule updated to " + freq + " for " + feed.name + ".";
  addActivity("Ingestion schedule updated", feed.name + " · " + freq);
  notifyToast("Schedule saved for " + feed.id + ".", "ok");
}

/* 04 DOWNLOAD TEMPLATE + CSV UPLOAD + BULK EXCEL PASTE + API */
function downloadTemplate() {
  const headers = "Account_ID,Borrower_Name,Asset_Class,Exposure_INR_Cr,Risk_Weight_Pct";
  const samples = [
    "HDFC-LN-90101,Tata Steel Infrastructure SPV,Corporate & Infrastructure,450.00,75",
    "HDFC-LN-90102,Apollo Hospitals Group,Corporate & Infrastructure,220.50,85",
    "HDFC-LN-90103,Bharat Agro MSME Pvt Ltd,MSME & Priority Sector,85.25,75"
  ];
  const csv = "\uFEFF" + [headers, ...samples].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hdfc_basel4_bulk_ingestion_template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  addActivity("CSV template downloaded", "hdfc_basel4_bulk_ingestion_template.csv");
  notifyToast("Downloaded hdfc_basel4_bulk_ingestion_template.csv.", "ok");
}

function loadSampleExcel() {
  if (!canWrite()) return;
  document.getElementById("excelPasteInput").value = SAMPLE_EXCEL_TSV;
  renderExcelPreview();
  notifyToast("Loaded sample Excel rows.", "ok");
}

function clearExcelPaste() {
  document.getElementById("excelPasteInput").value = "";
  renderExcelPreview();
}

function parseExcelRows(raw) {
  const lines = String(raw || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const parsed = [];
  lines.forEach((line, idx) => {
    const cols = line.includes("\t") ? line.split("\t") : line.split(",");
    const cleaned = cols.map(c => c.trim().replace(/^"|"$/g, ""));
    if (idx === 0 && (cleaned[0] || "").toLowerCase().includes("account")) return;
    const accountId = cleaned[0] || "";
    const borrower = cleaned[1] || "";
    const assetClass = cleaned[2] || "Corporate & Infrastructure";
    const exposure = Number(cleaned[3]);
    const rw = Number(cleaned[4]);
    let error = "";
    if (!accountId || !borrower) error = "Missing Account ID or Borrower";
    else if (!Number.isFinite(exposure) || exposure <= 0) error = "Invalid Exposure";
    else if (!Number.isFinite(rw) || rw < 0 || rw > 1250) error = "Invalid Risk Weight";
    parsed.push({ accountId, borrower, assetClass, exposure: Number.isFinite(exposure) ? exposure : 0, rw: Number.isFinite(rw) ? rw : 0, valid: !error, error });
  });
  return parsed;
}

function renderExcelPreview() {
  const raw = (document.getElementById("excelPasteInput") || {}).value || "";
  const rows = parseExcelRows(raw);
  const tbody = document.getElementById("excelPreviewBody");
  const summary = document.getElementById("excelSummaryText");
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b;">Paste Excel rows above or click Load Sample Rows.</td></tr>';
    if (summary) summary.textContent = "0 valid rows ready for ingestion";
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${r.accountId || "-"}</strong></td>
      <td>${r.borrower || "-"}</td>
      <td>${r.assetClass}</td>
      <td>${r.exposure.toFixed(2)}</td>
      <td>${r.rw}%</td>
      <td>${r.valid ? '<span class="badge success">Valid</span>' : '<span class="badge failed">' + r.error + '</span>'}</td>
    </tr>
  `).join("");
  const validCount = rows.filter(r => r.valid).length;
  if (summary) summary.textContent = validCount + " valid of " + rows.length + " parsed rows";
}

function executeBulkExcelIngest() {
  if (!canExecute()) {
    notifyToast("Execute (X) permission required. Sign out & log in as Data Operations Analyst.", "warn");
    return;
  }
  const raw = document.getElementById("excelPasteInput").value;
  const rows = parseExcelRows(raw).filter(r => r.valid);
  if (!rows.length) {
    notifyToast("Paste at least one valid row before executing.", "warn");
    return;
  }
  const feedId = document.getElementById("bulkTargetFeed").value || state.feeds[0].id;
  const feed = state.feeds.find(f => f.id === feedId) || state.feeds[0];
  feed.status = "Success";
  feed.lastRun = new Date().toLocaleTimeString("en-IN") + " IST";
  feed.records += rows.length;
  state.totalRecords += rows.length;
  saveState(state);
  document.getElementById("excelPasteInput").value = "";
  renderExcelPreview();
  renderAll();
  addActivity("Bulk Excel ingestion executed", rows.length + " rows ingested into " + feed.id);
  notifyToast("Ingested " + rows.length + " Excel rows into " + feed.name + ".", "ok");
}

function uploadFile() {
  if (!canWrite()) { notifyToast("Write (W) permission required.", "warn"); return; }
  const fileInput = document.getElementById("dataFile");
  const file = fileInput.files[0];
  const msg = document.getElementById("uploadMessage");
  if (!file) { msg.textContent = "Select a CSV file or click Download Template."; return; }
  if (!file.name.toLowerCase().endsWith(".csv")) { msg.textContent = "Only CSV files are supported."; return; }
  const reader = new FileReader();
  reader.onload = function (ev) {
    const lines = String(ev.target.result || "").trim().split(/\r?\n/).filter(Boolean);
    const rows = Math.max(lines.length - 1, 0);
    state.totalRecords += rows;
    saveState(state);
    renderFeeds();
    msg.textContent = "CSV \"" + file.name + "\" ingested (" + rows + " data rows).";
    addActivity("CSV file uploaded", file.name + " · " + rows + " data rows");
    notifyToast("Uploaded " + file.name + " (" + rows + " rows).", "ok");
  };
  reader.readAsText(file);
}

function testAPI() {
  const pill = document.getElementById("apiStatusPill");
  if (pill) pill.textContent = "Gateway OK · 38ms";
  addActivity("API Gateway verified", "HDFC Bank Ingestion REST gateway returned HTTP 200 (38ms)");
  notifyToast("HDFC Bank Ingestion Gateway reachable (HTTP 200 · 38ms).", "ok");
}

/* 05 FEED MONITORING */
function renderMonitoring() {
  document.getElementById("monitorTable").innerHTML = state.feeds.map(f => `
    <tr>
      <td><strong>${f.id}</strong></td>
      <td>${f.source}</td>
      <td>${f.lastRun}</td>
      <td>${Number(f.records).toLocaleString("en-IN")}</td>
      <td>${badge(f.status)}</td>
      <td>
        <button type="button" class="table-action" ${canExecute() ? "" : "disabled"} onclick="runFeed('${f.id}')">Run Feed</button>
      </td>
    </tr>
  `).join("");
  updateHealth();
}

function runFeed(id) {
  if (!canExecute()) { notifyToast("Execute (X) permission required.", "warn"); return; }
  const feed = state.feeds.find(f => f.id === id);
  if (!feed) return;
  const source = state.sources.find(s => s.name === feed.source);
  if (!source || source.status !== "Connected") {
    feed.status = "Failed";
    feed.lastRun = "Connection unavailable";
    saveState(state);
    addActivity("Feed execution failed", feed.name + " · Source disconnected");
    renderAll();
    notifyToast("Feed failed: source " + feed.source + " is disconnected.", "err");
    return;
  }
  const added = Math.floor(Math.random() * 8500) + 1500;
  feed.status = "Success";
  feed.lastRun = new Date().toLocaleTimeString("en-IN") + " IST";
  feed.records += added;
  state.totalRecords += added;
  saveState(state);
  addActivity("Feed executed successfully", feed.name + " · +" + added.toLocaleString("en-IN") + " records");
  renderAll();
  notifyToast(feed.name + " executed (+" + added.toLocaleString("en-IN") + " rows).", "ok");
}

function refreshFeeds() {
  renderAll();
  notifyToast("Monitoring snapshot refreshed.", "ok");
}

/* 06 DASHBOARD & HELPERS */
function renderDashboard() {
  const success = state.feeds.filter(f => f.status === "Success").length;
  const failed = state.feeds.filter(f => f.status === "Failed").length;
  const pending = state.feeds.filter(f => f.status !== "Success" && f.status !== "Failed").length;
  const total = state.feeds.length || 1;
  const items = [
    { name: "Successful", count: success },
    { name: "Failed", count: failed },
    { name: "In Progress / Delayed", count: pending }
  ];
  document.getElementById("statusDistribution").innerHTML = items.map(i => `
    <div class="distribution-row">
      <div class="distribution-label"><span>${i.name}</span><strong>${i.count}</strong></div>
      <div class="progress"><span style="width:${(i.count / total) * 100}%"></span></div>
    </div>
  `).join("");
  document.getElementById("recentActivity").innerHTML = state.activities.map(a => `
    <div class="activity-item"><strong>${a.title}</strong><small>${a.detail}</small></div>
  `).join("");
  updateHealth();
}

function updateHealth() {
  const total = state.feeds.length || 1;
  const ok = state.feeds.filter(f => f.status === "Success").length;
  document.getElementById("healthValue").textContent = Math.round((ok / total) * 100) + "%";
}

function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

document.querySelectorAll(".nav-item").forEach(link => {
  link.addEventListener("click", function () {
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    this.classList.add("active");
  });
});

function renderAll() {
  renderSources();
  renderFeeds();
  renderMonitoring();
  renderDashboard();
  renderExcelPreview();
}

readAuthAndPerms();
renderAll();
