
/* REG VISION - DATA INGESTION MODULE */

/* DEMONSTRATION DATA */

let sources = [
  { id: "SRC001", name: "Core Banking System", category: "Core Banking", connection: "Database", status: "Connected" },
  { id: "SRC002", name: "Loan Management System", category: "Loans", connection: "API", status: "Connected" },
  { id: "SRC003", name: "Treasury Management", category: "Treasury", connection: "SFTP", status: "Connected" },
  { id: "SRC004", name: "Finance System", category: "Finance", connection: "Database", status: "Disconnected" }
];

let feeds = [
  { id: "FD001", name: "Customer Data Feed", source: "Core Banking System", format: "CSV", frequency: "Daily", lastRun: "14 Nov 2026, 02:00 AM", records: 45000, status: "Success" },
  { id: "FD002", name: "Loan Exposure Feed", source: "Loan Management System", format: "JSON", frequency: "Daily", lastRun: "14 Nov 2026, 02:15 AM", records: 32000, status: "Success" },
  { id: "FD003", name: "Treasury Position Feed", source: "Treasury Management", format: "XML", frequency: "Daily", lastRun: "14 Nov 2026, 02:30 AM", records: 18580, status: "Success" },
  { id: "FD004", name: "Financial Balances Feed", source: "Finance System", format: "CSV", frequency: "Daily", lastRun: "14 Nov 2026, 03:00 AM", records: 0, status: "Failed" },
  { id: "FD005", name: "Risk Exposure Feed", source: "Core Banking System", format: "CSV", frequency: "Weekly", lastRun: "14 Nov 2026, 03:30 AM", records: 29000, status: "Success" }
];

let activities = [
  { title: "Customer Data Feed executed", detail: "45,000 records received · Successful" },
  { title: "Loan Exposure Feed executed", detail: "32,000 records received · Successful" },
  { title: "Treasury Position Feed executed", detail: "18,580 records received · Successful" },
  { title: "Financial Balances Feed failed", detail: "Source connection unavailable · Failed" }
];

/* HELPERS */

function badge(status) {
  let type = "neutral";

  if (status === "Success" || status === "Connected") {
    type = "success";
  } else if (status === "Failed" || status === "Disconnected") {
    type = "failed";
  } else if (status === "Delayed" || status === "In Progress") {
    type = "warning";
  }

  return `<span class="badge ${type}">${status}</span>`;
}

function addActivity(title, detail) {
  activities.unshift({ title, detail });
  activities = activities.slice(0, 8);
  renderDashboard();
}

/* SOURCE SYSTEM REGISTRATION */

function renderSources() {
  document.getElementById("sourceTable").innerHTML = sources.map(source => `
    <tr>
      <td><strong>${source.id}</strong></td>
      <td>${source.name}</td>
      <td>${source.category}</td>
      <td>${source.connection}</td>
      <td>${badge(source.status)}</td>
      <td>
        <button class="table-action" onclick="toggleSource('${source.id}')">
          ${source.status === "Connected" ? "Disconnect" : "Connect"}
        </button>
      </td>
    </tr>
  `).join("");

  document.getElementById("sourceCount").textContent = sources.length;
  populateSourceDropdowns();
}

function openSourceModal() {
  document.getElementById("sourceModal").classList.add("show");
}

function registerSource() {
  const name = document.getElementById("newSourceName").value.trim();
  const category = document.getElementById("newSourceCategory").value;
  const connection = document.getElementById("newSourceConnection").value;

  if (!name) {
    alert("Please enter a source system name.");
    return;
  }

  const id = "SRC" + String(sources.length + 1).padStart(3, "0");

  sources.push({
    id,
    name,
    category,
    connection,
    status: "Connected"
  });

  renderSources();
  closeModal("sourceModal");

  document.getElementById("newSourceName").value = "";

  addActivity("New source registered", name);
  alert("Source system registered successfully.");
}

function toggleSource(id) {
  const source = sources.find(s => s.id === id);

  if (!source) return;

  source.status = source.status === "Connected" ? "Disconnected" : "Connected";

  renderSources();
  addActivity("Source connection updated", source.name + " · " + source.status);
}

/* DATA FEED MANAGEMENT */

function renderFeeds() {
  document.getElementById("feedTable").innerHTML = feeds.map(feed => `
    <tr>
      <td><strong>${feed.id}</strong></td>
      <td>${feed.name}</td>
      <td>${feed.source}</td>
      <td>${feed.format}</td>
      <td>${feed.frequency}</td>
      <td>${badge(feed.status)}</td>
    </tr>
  `).join("");

  document.getElementById("feedCount").textContent = feeds.length;
  populateFeedDropdowns();
}

function openFeedModal() {
  populateSourceDropdowns();
  document.getElementById("feedModal").classList.add("show");
}

function createFeed() {
  const name = document.getElementById("newFeedName").value.trim();
  const source = document.getElementById("newFeedSource").value;
  const format = document.getElementById("newFeedFormat").value;
  const frequency = document.getElementById("newFeedFrequency").value;

  if (!name || !source) {
    alert("Enter a feed name and select a source.");
    return;
  }

  const id = "FD" + String(feeds.length + 1).padStart(3, "0");

  feeds.push({
    id,
    name,
    source,
    format,
    frequency,
    lastRun: "Not executed",
    records: 0,
    status: "In Progress"
  });

  renderFeeds();
  renderMonitoring();
  closeModal("feedModal");

  document.getElementById("newFeedName").value = "";

  addActivity("New data feed created", name);
  alert("Data feed created successfully.");
}

/* DROPDOWNS */

function populateSourceDropdowns() {
  const options = sources.map(source =>
    `<option value="${source.name}">${source.name}</option>`
  ).join("");

  document.getElementById("newFeedSource").innerHTML = options;
}

function populateFeedDropdowns() {
  const options = feeds.map(feed =>
    `<option value="${feed.id}">${feed.id} - ${feed.name}</option>`
  ).join("");

  document.getElementById("scheduleFeed").innerHTML = options;
}

/* SCHEDULED INGESTION */

function saveSchedule() {
  const feedId = document.getElementById("scheduleFeed").value;
  const frequency = document.getElementById("scheduleFrequency").value;

  const feed = feeds.find(f => f.id === feedId);

  if (!feed) {
    alert("Please create a feed first.");
    return;
  }

  feed.frequency = frequency;

  renderFeeds();

  document.getElementById("scheduleMessage").textContent =
    "Schedule updated successfully for " + feed.name + ".";

  addActivity("Ingestion schedule updated", feed.name + " · " + frequency);
}

/* FILE UPLOAD */

function uploadFile() {
  const fileInput = document.getElementById("dataFile");
  const file = fileInput.files[0];
  const message = document.getElementById("uploadMessage");

  if (!file) {
    message.textContent = "Please select a CSV file.";
    return;
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    message.textContent = "Only CSV files are supported in this demo.";
    return;
  }

  const reader = new FileReader();

  reader.onload = function(event) {
    const content = event.target.result.trim();
    const rows = content ? content.split(/\r?\n/).length - 1 : 0;

    document.getElementById("recordCount").textContent =
      (Number(document.getElementById("recordCount").textContent.replace(/,/g, "")) + Math.max(rows, 0)).toLocaleString("en-IN");

    message.textContent =
      "File processed in demo mode. Approximate data rows: " + Math.max(rows, 0);

    addActivity("CSV file uploaded", file.name + " · " + Math.max(rows, 0) + " data rows");
  };

  reader.readAsText(file);
}

/* API CONNECTION TEST */

function testAPI() {
  alert("Demo Mode: API configuration is not connected to a real external system.");
}

/* FEED MONITORING */

function renderMonitoring() {
  document.getElementById("monitorTable").innerHTML = feeds.map(feed => `
    <tr>
      <td><strong>${feed.id}</strong></td>
      <td>${feed.source}</td>
      <td>${feed.lastRun}</td>
      <td>${feed.records.toLocaleString("en-IN")}</td>
      <td>${badge(feed.status)}</td>
      <td>
        <button class="table-action" onclick="runFeed('${feed.id}')">Run Feed</button>
      </td>
    </tr>
  `).join("");

  updateHealth();
}

function runFeed(id) {
  const feed = feeds.find(f => f.id === id);

  if (!feed) return;

  const source = sources.find(s => s.name === feed.source);

  if (!source || source.status !== "Connected") {
    feed.status = "Failed";
    feed.lastRun = "Connection unavailable";
    feed.records = 0;

    addActivity("Feed execution failed", feed.name + " · Source unavailable");
    renderAll();

    alert("Feed failed. Please check the source system connection.");
    return;
  }

  feed.status = "Success";
  feed.lastRun = new Date().toLocaleString("en-IN");
  feed.records = Math.floor(Math.random() * 10000) + 1000;

  addActivity("Feed executed successfully", feed.name + " · " + feed.records.toLocaleString("en-IN") + " records");

  renderAll();
  alert("Feed execution simulated successfully.");
}

function refreshFeeds() {
  renderAll();
}

/* FEED STATUS DASHBOARD */

function renderDashboard() {
  const success = feeds.filter(f => f.status === "Success").length;
  const failed = feeds.filter(f => f.status === "Failed").length;
  const pending = feeds.filter(f => f.status === "In Progress" || f.status === "Delayed").length;
  const total = feeds.length || 1;

  const statuses = [
    { name: "Successful", count: success },
    { name: "Failed", count: failed },
    { name: "Pending / Delayed", count: pending }
  ];

  document.getElementById("statusDistribution").innerHTML =
    statuses.map(item => `
      <div class="distribution-row">
        <div class="distribution-label">
          <span>${item.name}</span>
          <strong>${item.count}</strong>
        </div>
        <div class="progress">
          <span style="width:${item.count / total * 100}%"></span>
        </div>
      </div>
    `).join("");

  document.getElementById("recentActivity").innerHTML =
    activities.map(item => `
      <div class="activity-item">
        <strong>${item.title}</strong>
        <small>${item.detail}</small>
      </div>
    `).join("");

  updateHealth();
}

function updateHealth() {
  const total = feeds.length;
  const successful = feeds.filter(f => f.status === "Success").length;
  const health = total ? Math.round(successful / total * 100) : 0;

  document.getElementById("healthValue").textContent = health + "%";
}

/* MODAL */

function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

/* SIDEBAR NAVIGATION */

document.querySelectorAll(".nav-item").forEach(link => {
  link.addEventListener("click", function() {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });

    this.classList.add("active");
  });
});

/* RENDER ALL */

function renderAll() {
  renderSources();
  renderFeeds();
  renderMonitoring();
  renderDashboard();
}

/* INITIALIZATION */

renderAll();
