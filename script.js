/* Extracted script from excel-analytics-platform.html */
(function (window, document) {
  // Global variables
  let currentData = [];
  let currentChart = null;
  let uploadHistory = JSON.parse(localStorage.getItem("uploadHistory") || "[]");
  let analytics = JSON.parse(
    localStorage.getItem("analytics") ||
      '{"files": 0, "charts": 0, "rows": 0, "insights": 0}'
  );

  // Initialize the application
  document.addEventListener("DOMContentLoaded", function () {
    setupEventListeners();
    updateDashboard();
    updateHistory();
  });

  function setupEventListeners() {
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("fileInput");

    if (!uploadArea || !fileInput) return;

    // Drag and drop functionality
    uploadArea.addEventListener("dragover", handleDragOver);
    uploadArea.addEventListener("dragleave", handleDragLeave);
    uploadArea.addEventListener("drop", handleDrop);
    uploadArea.addEventListener("click", () => fileInput.click());

    // File input change
    fileInput.addEventListener("change", handleFileSelect);

    // New: wire buttons that previously used inline onclick attributes
    const btnChooseFiles = document.getElementById("btnChooseFiles");
    if (btnChooseFiles)
      btnChooseFiles.addEventListener("click", () => fileInput.click());

    const tabUpload = document.getElementById("tabUpload");
    const tabDashboard = document.getElementById("tabDashboard");
    const tabHistory = document.getElementById("tabHistory");
    const tabAdmin = document.getElementById("tabAdmin");
    if (tabUpload)
      tabUpload.addEventListener("click", (e) => switchTab("upload", e));
    if (tabDashboard)
      tabDashboard.addEventListener("click", (e) => switchTab("dashboard", e));
    if (tabHistory)
      tabHistory.addEventListener("click", (e) => switchTab("history", e));
    if (tabAdmin)
      tabAdmin.addEventListener("click", (e) => switchTab("admin", e));

    const btnGenerateChart = document.getElementById("btnGenerateChart");
    const btnAIInsights = document.getElementById("btnAIInsights");
    const btnDownloadChart = document.getElementById("btnDownloadChart");
    const btnSaveAnalysis = document.getElementById("btnSaveAnalysis");
    if (btnGenerateChart)
      btnGenerateChart.addEventListener("click", generateChart);
    if (btnAIInsights)
      btnAIInsights.addEventListener("click", generateAIInsights);
    if (btnDownloadChart)
      btnDownloadChart.addEventListener("click", downloadChart);
    if (btnSaveAnalysis)
      btnSaveAnalysis.addEventListener("click", saveAnalysis);

    const btnSignIn = document.getElementById("btnSignIn");
    const btnRegister = document.getElementById("btnRegister");
    const authClose = document.getElementById("authClose");
    if (btnSignIn) btnSignIn.addEventListener("click", () => showAuth("login"));
    if (btnRegister)
      btnRegister.addEventListener("click", () => showAuth("register"));
    if (authClose) authClose.addEventListener("click", hideAuth);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add("dragover");
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
  }

  function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    const files = e.dataTransfer.files;
    processFiles(files);
  }

  function handleFileSelect(e) {
    const files = e.target.files;
    processFiles(files);
  }

  function processFiles(files) {
    if (!files || files.length === 0) return;

    const loadingEl = document.getElementById("loading");
    if (loadingEl) loadingEl.style.display = "block";

    Array.from(files).forEach((file) => {
      if (
        file.type.includes("sheet") ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls")
      ) {
        readExcelFile(file);
      } else {
        alert("Please upload only Excel files (.xls, .xlsx)");
      }
    });
  }

  function readExcelFile(file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        currentData = jsonData;
        displayDataPreview(jsonData, file.name);
        setupChartControls(jsonData);

        // Save to history
        const historyEntry = {
          id: Date.now(),
          fileName: file.name,
          uploadDate: new Date().toISOString(),
          rowCount: jsonData.length,
          columns: Object.keys(jsonData[0] || {}),
        };

        uploadHistory.unshift(historyEntry);
        localStorage.setItem("uploadHistory", JSON.stringify(uploadHistory));

        // If authenticated, persist upload metadata to server
        const token = localStorage.getItem("auth_token");
        if (token) {
          fetch("http://localhost:3000/api/uploads", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
            body: JSON.stringify({
              fileName: historyEntry.fileName,
              uploadDate: historyEntry.uploadDate,
              rowCount: historyEntry.rowCount,
              columns: historyEntry.columns,
            }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data && data.upload && data.upload._id) {
                // attach server id so analyses can be saved against it
                uploadHistory[0].serverId = data.upload._id;
                localStorage.setItem(
                  "uploadHistory",
                  JSON.stringify(uploadHistory)
                );
                updateDashboard();
              }
            })
            .catch((err) => console.warn("Upload persist failed", err));
        }

        // Update analytics
        analytics.files++;
        analytics.rows += jsonData.length;
        localStorage.setItem("analytics", JSON.stringify(analytics));

        updateDashboard();
        updateHistory();
      } catch (error) {
        alert("Error reading Excel file: " + error.message);
      } finally {
        const loadingEl = document.getElementById("loading");
        if (loadingEl) loadingEl.style.display = "none";
      }
    };

    reader.readAsArrayBuffer(file);
  }

  function displayDataPreview(data, fileName) {
    const previewDiv = document.getElementById("previewContent");
    const preview = document.getElementById("dataPreview");

    if (!previewDiv || !preview) return;

    if (data.length === 0) {
      previewDiv.innerHTML = "<p>No data found in the file.</p>";
      preview.style.display = "block";
      return;
    }

    const columns = Object.keys(data[0]);
    const previewData = data.slice(0, 10); // Show first 10 rows

    let html = `
            <h3>📁 ${fileName}</h3>
            <p><strong>Total Rows:</strong> ${
              data.length
            } | <strong>Columns:</strong> ${columns.length}</p>
            <div class="data-preview">
                <table class="data-table">
                    <thead>
                        <tr>${columns
                          .map((col) => `<th>${col}</th>`)
                          .join("")}</tr>
                    </thead>
                    <tbody>
                        ${previewData
                          .map(
                            (row) =>
                              `<tr>${columns
                                .map((col) => `<td>${row[col] || ""}</td>`)
                                .join("")}</tr>`
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
            ${
              data.length > 10
                ? `<p><em>Showing first 10 rows of ${data.length} total rows</em></p>`
                : ""
            }
        `;

    previewDiv.innerHTML = html;
    preview.style.display = "block";
  }

  function setupChartControls(data) {
    if (!data || data.length === 0) return;

    const columns = Object.keys(data[0]);
    const xAxisSelect = document.getElementById("xAxis");
    const yAxisSelect = document.getElementById("yAxis");

    if (!xAxisSelect || !yAxisSelect) return;

    // Clear previous options
    xAxisSelect.innerHTML = "";
    yAxisSelect.innerHTML = "";

    columns.forEach((column) => {
      xAxisSelect.innerHTML += `<option value="${column}">${column}</option>`;
      yAxisSelect.innerHTML += `<option value="${column}">${column}</option>`;
    });

    // Set default selections
    if (columns.length > 1) {
      yAxisSelect.selectedIndex = 1;
    }

    const controls = document.getElementById("chartControls");
    if (controls) controls.style.display = "block";
  }

  function generateChart() {
    const xAxis = document.getElementById("xAxis").value;
    const yAxis = document.getElementById("yAxis").value;
    const chartType = document.getElementById("chartType").value;

    if (!xAxis || !yAxis || currentData.length === 0) {
      alert("Please select X and Y axes and ensure data is loaded.");
      return;
    }

    const chartDisplay = document.getElementById("chartDisplay");
    if (chartDisplay) chartDisplay.style.display = "block";

    if (chartType.startsWith("3d")) {
      generate3DChart(xAxis, yAxis, chartType);
    } else {
      generate2DChart(xAxis, yAxis, chartType);
    }

    // Update analytics
    analytics.charts++;
    localStorage.setItem("analytics", JSON.stringify(analytics));
    updateDashboard();
  }

  function generate2DChart(xAxis, yAxis, chartType) {
    const canvas = document.getElementById("myChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const plotlyDiv = document.getElementById("plotlyChart");
    if (plotlyDiv) plotlyDiv.style.display = "none";
    canvas.style.display = "block";

    // Destroy existing chart
    if (currentChart) {
      currentChart.destroy();
    }

    // Prepare data
    const labels = currentData.map((row) => row[xAxis]);
    const values = currentData.map((row) => parseFloat(row[yAxis]) || 0);

    const chartConfig = {
      type: chartType === "area" ? "line" : chartType,
      data: {
        labels: labels,
        datasets: [
          {
            label: `${yAxis} vs ${xAxis}`,
            data: values,
            backgroundColor:
              chartType === "pie"
                ? generateColors(values.length)
                : "rgba(102, 126, 234, 0.2)",
            borderColor: "rgba(102, 126, 234, 1)",
            borderWidth: 2,
            fill: chartType === "area",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `${yAxis} vs ${xAxis}`,
          },
          legend: {
            display: chartType === "pie",
          },
        },
        scales:
          chartType !== "pie"
            ? {
                y: { beginAtZero: true },
              }
            : undefined,
      },
    };

    currentChart = new Chart(ctx, chartConfig);
  }

  function generate3DChart(xAxis, yAxis, chartType) {
    const canvas = document.getElementById("myChart");
    if (canvas) canvas.style.display = "none";
    const plotlyDiv = document.getElementById("plotlyChart");
    if (!plotlyDiv) return;
    plotlyDiv.style.display = "block";

    const xValues = currentData.map((row) => row[xAxis]);
    const yValues = currentData.map((row) => parseFloat(row[yAxis]) || 0);
    const zValues = currentData.map((row, index) => index); // Use index as Z for demo

    let trace, layout;

    if (chartType === "3d-scatter") {
      trace = {
        x: xValues,
        y: yValues,
        z: zValues,
        mode: "markers",
        marker: { size: 8, color: yValues, colorscale: "Viridis" },
        type: "scatter3d",
      };

      layout = {
        title: `3D Scatter: ${yAxis} vs ${xAxis}`,
        scene: {
          xaxis: { title: xAxis },
          yaxis: { title: yAxis },
          zaxis: { title: "Index" },
        },
      };
    } else if (chartType === "3d-surface") {
      const size = Math.min(10, Math.sqrt(currentData.length));
      const x = [],
        y = [],
        z = [];

      for (let i = 0; i < size; i++) {
        x.push(i);
        y.push(i);
        z.push([]);
        for (let j = 0; j < size; j++) {
          const index = i * size + j;
          z[i].push(index < yValues.length ? yValues[index] : 0);
        }
      }

      trace = { x: x, y: y, z: z, type: "surface", colorscale: "Viridis" };

      layout = {
        title: `3D Surface: ${yAxis} Distribution`,
        scene: {
          xaxis: { title: "X Grid" },
          yaxis: { title: "Y Grid" },
          zaxis: { title: yAxis },
        },
      };
    }

    Plotly.newPlot(plotlyDiv, [trace], layout);
  }

  function generateColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = ((i * 360) / count) % 360;
      colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    return colors;
  }

  function generateAIInsights() {
    const insightsDiv = document.getElementById("aiInsights");
    const contentDiv = document.getElementById("insightsContent");

    if (!insightsDiv || !contentDiv) return;

    // Simulate AI analysis (in real implementation, this would call an AI API)
    const insights = analyzeData(currentData);

    contentDiv.innerHTML = `
            <h3>🔍 Data Analysis Summary</h3>
            ${insights.map((insight) => `<p>• ${insight}</p>`).join("")}
            <p><em>💡 These insights are generated using statistical analysis. In a production environment, this would integrate with AI APIs like OpenAI GPT or Google's Vertex AI for more sophisticated analysis.</em></p>
        `;

    insightsDiv.style.display = "block";

    // Update analytics
    analytics.insights++;
    localStorage.setItem("analytics", JSON.stringify(analytics));
    updateDashboard();
  }

  function analyzeData(data) {
    if (!data || data.length === 0) return ["No data available for analysis."];

    const insights = [];
    const columns = Object.keys(data[0]);

    insights.push(
      `Dataset contains ${data.length} rows and ${columns.length} columns.`
    );

    // Analyze numeric columns
    const numericColumns = columns.filter((col) => {
      return data.some((row) => !isNaN(parseFloat(row[col])));
    });

    if (numericColumns.length > 0) {
      insights.push(
        `Found ${numericColumns.length} numeric columns: ${numericColumns.join(
          ", "
        )}.`
      );

      numericColumns.forEach((col) => {
        const values = data
          .map((row) => parseFloat(row[col]))
          .filter((v) => !isNaN(v));
        if (values.length > 0) {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          const max = Math.max(...values);
          const min = Math.min(...values);
          insights.push(
            `${col}: Average = ${avg.toFixed(2)}, Range = ${min} to ${max}.`
          );
        }
      });
    }

    // Analyze categorical columns
    const categoricalColumns = columns.filter(
      (col) => !numericColumns.includes(col)
    );
    if (categoricalColumns.length > 0) {
      insights.push(
        `Found ${categoricalColumns.length} categorical columns with unique values distributions.`
      );
    }

    return insights;
  }

  function downloadChart() {
    if (currentChart) {
      const link = document.createElement("a");
      link.download = "chart.png";
      link.href = currentChart.toBase64Image();
      link.click();
    } else if (
      document.getElementById("plotlyChart") &&
      document.getElementById("plotlyChart").style.display !== "none"
    ) {
      // Download Plotly chart
      Plotly.downloadImage("plotlyChart", {
        format: "png",
        width: 800,
        height: 600,
        filename: "chart",
      });
    }
  }

  function saveAnalysis() {
    const xAxis = document.getElementById("xAxis").value;
    const yAxis = document.getElementById("yAxis").value;
    const chartType = document.getElementById("chartType").value;

    const analysis = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      xAxis,
      yAxis,
      chartType,
      dataPoints: currentData.length,
    };

    // Find the most recent upload and add this analysis to it
    if (uploadHistory.length > 0) {
      const latest = uploadHistory[0];
      // If this upload was persisted to server, save analysis there
      const token = localStorage.getItem("auth_token");
      if (token && latest.serverId) {
        fetch(`http://localhost:3000/api/uploads/${latest.serverId}/analysis`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify(analysis),
        })
          .then((r) => r.json())
          .then((data) => {
            // Also keep local copy
            if (!latest.analyses) latest.analyses = [];
            latest.analyses.push(analysis);
            localStorage.setItem(
              "uploadHistory",
              JSON.stringify(uploadHistory)
            );
            updateHistory();
            alert("Analysis saved to server successfully!");
          })
          .catch((err) => {
            console.warn("Failed to save analysis to server", err);
            if (!latest.analyses) latest.analyses = [];
            latest.analyses.push(analysis);
            localStorage.setItem(
              "uploadHistory",
              JSON.stringify(uploadHistory)
            );
            updateHistory();
            alert("Analysis saved locally (server failed).");
          });
      } else {
        if (!latest.analyses) latest.analyses = [];
        latest.analyses.push(analysis);
        localStorage.setItem("uploadHistory", JSON.stringify(uploadHistory));
        updateHistory();
        alert("Analysis saved locally. Sign in to persist to server.");
      }
    }
  }

  function updateDashboard() {
    const totalFilesEl = document.getElementById("totalFiles");
    const totalChartsEl = document.getElementById("totalCharts");
    const totalRowsEl = document.getElementById("totalRows");
    const totalInsightsEl = document.getElementById("totalInsights");

    if (totalFilesEl) totalFilesEl.textContent = analytics.files;
    if (totalChartsEl) totalChartsEl.textContent = analytics.charts;
    if (totalRowsEl) totalRowsEl.textContent = analytics.rows.toLocaleString();
    if (totalInsightsEl) totalInsightsEl.textContent = analytics.insights;

    // Update recent activity
    const recentDiv = document.getElementById("recentActivity");
    const recentItems = uploadHistory.slice(0, 5);

    if (!recentDiv) return;

    if (recentItems.length === 0) {
      recentDiv.innerHTML =
        "<p>No recent activity. Upload your first Excel file to get started!</p>";
      return;
    }

    recentDiv.innerHTML = recentItems
      .map(
        (item) => `
            <div class="history-item">
                <h4>📁 ${item.fileName}</h4>
                <p>Uploaded: ${new Date(item.uploadDate).toLocaleString()}</p>
                <p>Rows: ${item.rowCount} | Columns: ${item.columns.length}</p>
                ${item.analyses ? `<p>Charts: ${item.analyses.length}</p>` : ""}
            </div>
        `
      )
      .join("");
  }

  function updateHistory() {
    const historyDiv = document.getElementById("historyList");

    if (!historyDiv) return;

    if (uploadHistory.length === 0) {
      historyDiv.innerHTML =
        "<p>No upload history yet. Start by uploading an Excel file!</p>";
      return;
    }

    historyDiv.innerHTML = uploadHistory
      .map(
        (item) => `
            <div class="history-item">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h3>📁 ${item.fileName}</h3>
                        <p><strong>Upload Date:</strong> ${new Date(
                          item.uploadDate
                        ).toLocaleString()}</p>
                        <p><strong>Data:</strong> ${item.rowCount} rows, ${
          item.columns.length
        } columns</p>
                        <p><strong>Columns:</strong> ${item.columns.join(
                          ", "
                        )}</p>
                        ${
                          item.analyses
                            ? `
                            <div style="margin-top: 15px;">
                                <h4>📊 Generated Charts (${
                                  item.analyses.length
                                }):</h4>
                                ${item.analyses
                                  .map(
                                    (analysis) => `
                                    <div style="background: rgba(102, 126, 234, 0.1); padding: 10px; margin: 5px 0; border-radius: 8px;">
                                        <strong>${
                                          analysis.chartType
                                        }</strong>: ${analysis.yAxis} vs ${
                                      analysis.xAxis
                                    }
                                        <br><small>Created: ${new Date(
                                          analysis.timestamp
                                        ).toLocaleString()}</small>
                                    </div>
                                `
                                  )
                                  .join("")}
                            </div>
                        `
                            : ""
                        }
                    </div>
                    <div>
                        <button class="btn btn-secondary delete-history-btn" data-id="${
                          item.id
                        }">🗑️ Delete</button>
                    </div>
                </div>
            </div>
        `
      )
      .join("");

    // attach delete listeners
    historyDiv.querySelectorAll(".delete-history-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        deleteHistoryItem(Number(id));
      });
    });
  }

  function deleteHistoryItem(id) {
    if (confirm("Are you sure you want to delete this history item?")) {
      uploadHistory = uploadHistory.filter((item) => item.id !== id);
      localStorage.setItem("uploadHistory", JSON.stringify(uploadHistory));
      updateHistory();
      updateDashboard();
    }
  }

  function switchTab(tabName, event) {
    // Hide all tab contents
    document
      .querySelectorAll(".tab-content")
      .forEach((tab) => tab.classList.remove("active"));

    // Remove active class from all tab buttons
    document
      .querySelectorAll(".tab-btn")
      .forEach((btn) => btn.classList.remove("active"));

    // Show selected tab content
    const sel = document.getElementById(tabName);
    if (sel) sel.classList.add("active");

    // Add active class to clicked tab button
    if (event && event.target) event.target.classList.add("active");

    // Update data when switching to dashboard or admin
    if (tabName === "dashboard") updateDashboard();
    else if (tabName === "admin") updateAdminPanel();
    else if (tabName === "history") updateHistory();
  }

  function updateAdminPanel() {
    const totalStorage = uploadHistory.reduce(
      (total, item) => total + item.rowCount * 0.001,
      0
    );
    const totalUsersEl = document.getElementById("totalUsers");
    const totalStorageEl = document.getElementById("totalStorage");
    const activeUsersEl = document.getElementById("activeUsers");
    const apiCallsEl = document.getElementById("apiCalls");

    if (totalUsersEl) totalUsersEl.textContent = "1";
    if (totalStorageEl) totalStorageEl.textContent = totalStorage.toFixed(2);
    if (activeUsersEl) activeUsersEl.textContent = "1";
    if (apiCallsEl) apiCallsEl.textContent = analytics.insights;

    // If current user is admin, fetch list of users for management
    const token = localStorage.getItem("auth_token");
    if (token) {
      fetch("http://localhost:3000/api/auth/profile", {
        headers: { Authorization: "Bearer " + token },
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.user && json.user.role === "admin") {
            fetchUsers();
          }
        })
        .catch(() => {});
    }
  }

  // Admin: fetch users and render
  function fetchUsers() {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    fetch("http://localhost:3000/api/admin/users", {
      headers: { Authorization: "Bearer " + token },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.users) renderUsers(data.users);
      })
      .catch((err) => console.warn("fetchUsers failed", err));
  }

  function renderUsers(users) {
    const usersList = document.getElementById("usersList");
    if (!usersList) return;
    usersList.innerHTML = users
      .map(
        (u) => `
      <div class="user-card" data-userid="${u._id}">
        <div>
          <strong>${u.name}</strong><br><small>${u.email}</small>
        </div>
        <div>
          <span class="btn ${
            u.role === "admin" ? "btn-success" : "btn-secondary"
          }">${u.role}</span>
          ${
            u.role !== "admin"
              ? `<button class="btn btn-primary promote-btn" data-userid="${u._id}" style="margin-left:10px;">Promote</button>`
              : ""
          }
        </div>
      </div>
    `
      )
      .join("");

    // attach listeners for promote
    usersList.querySelectorAll(".promote-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-userid");
        promoteUser(id);
      });
    });
  }

  function promoteUser(id) {
    const token = localStorage.getItem("auth_token");
    if (!token) return alert("Not authorized");
    fetch(`http://localhost:3000/api/admin/users/${id}/promote`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
    })
      .then((r) => r.json())
      .then((data) => {
        alert("User promoted");
        fetchUsers();
      })
      .catch((err) => {
        console.warn(err);
        alert("Promote failed");
      });
  }

  // Utility function to clear all data (for demo purposes)
  function clearAllData() {
    if (
      confirm("This will clear all uploaded data and history. Are you sure?")
    ) {
      uploadHistory = [];
      analytics = { files: 0, charts: 0, rows: 0, insights: 0 };
      localStorage.setItem("uploadHistory", JSON.stringify(uploadHistory));
      localStorage.setItem("analytics", JSON.stringify(analytics));

      // Hide analysis sections
      const preview = document.getElementById("dataPreview");
      if (preview) preview.style.display = "none";
      const controls = document.getElementById("chartControls");
      if (controls) controls.style.display = "none";
      const display = document.getElementById("chartDisplay");
      if (display) display.style.display = "none";
      const insights = document.getElementById("aiInsights");
      if (insights) insights.style.display = "none";

      updateDashboard();
      updateHistory();

      alert("All data cleared successfully!");
    }
  }

  // Sample data generator for demo purposes
  function generateSampleData() {
    const sampleData = [
      { Month: "Jan", Sales: 12000, Expenses: 8000, Profit: 4000 },
      { Month: "Feb", Sales: 15000, Expenses: 9000, Profit: 6000 },
      { Month: "Mar", Sales: 18000, Expenses: 11000, Profit: 7000 },
      { Month: "Apr", Sales: 14000, Expenses: 8500, Profit: 5500 },
      { Month: "May", Sales: 20000, Expenses: 12000, Profit: 8000 },
      { Month: "Jun", Sales: 22000, Expenses: 13000, Profit: 9000 },
      { Month: "Jul", Sales: 25000, Expenses: 15000, Profit: 10000 },
      { Month: "Aug", Sales: 23000, Expenses: 14000, Profit: 9000 },
      { Month: "Sep", Sales: 21000, Expenses: 13500, Profit: 7500 },
      { Month: "Oct", Sales: 19000, Expenses: 12000, Profit: 7000 },
      { Month: "Nov", Sales: 24000, Expenses: 14500, Profit: 9500 },
      { Month: "Dec", Sales: 28000, Expenses: 16000, Profit: 12000 },
    ];

    currentData = sampleData;
    displayDataPreview(sampleData, "Sample_Business_Data.xlsx");
    setupChartControls(sampleData);

    // Add to history
    const historyEntry = {
      id: Date.now(),
      fileName: "Sample_Business_Data.xlsx",
      uploadDate: new Date().toISOString(),
      rowCount: sampleData.length,
      columns: Object.keys(sampleData[0]),
    };

    uploadHistory.unshift(historyEntry);
    localStorage.setItem("uploadHistory", JSON.stringify(uploadHistory));

    analytics.files++;
    analytics.rows += sampleData.length;
    localStorage.setItem("analytics", JSON.stringify(analytics));

    updateDashboard();
    updateHistory();
  }

  // Add keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "1":
          e.preventDefault();
          switchTab("upload");
          break;
        case "2":
          e.preventDefault();
          switchTab("dashboard");
          break;
        case "3":
          e.preventDefault();
          switchTab("history");
          break;
        case "4":
          e.preventDefault();
          switchTab("admin");
          break;
      }
    }
  });

  // Add some sample data button for demo
  setTimeout(() => {
    const uploadArea = document.getElementById("uploadArea");
    if (!uploadArea) return;
    uploadArea.innerHTML += `
      <div style="margin-top: 20px; padding-top: 20px; border-top: 2px dashed #dee2e6;">
        <button class="btn btn-secondary" id="loadSampleBtn" style="margin-right: 10px;">📊 Load Sample Data</button>
        <button class="btn btn-secondary" id="clearAllBtn">🗑️ Clear All Data</button>
      </div>
    `;

    // attach listeners
    const loadBtn = document.getElementById("loadSampleBtn");
    const clearBtn = document.getElementById("clearAllBtn");
    if (loadBtn) loadBtn.addEventListener("click", generateSampleData);
    if (clearBtn) clearBtn.addEventListener("click", clearAllData);
  }, 1000);

  // Auto-save feature
  setInterval(() => {
    localStorage.setItem("uploadHistory", JSON.stringify(uploadHistory));
    localStorage.setItem("analytics", JSON.stringify(analytics));
  }, 30000); // Save every 30 seconds

  // Welcome message for first-time users
  if (uploadHistory.length === 0 && analytics.files === 0) {
    setTimeout(() => {
      alert(
        '🎉 Welcome to Excel Analytics Platform!\n\n✨ Features:\n• Upload Excel files (.xls/.xlsx)\n• Generate 2D & 3D charts\n• AI-powered insights\n• Download & save analyses\n• Track upload history\n\n🚀 Try the "Load Sample Data" button to see it in action!'
      );
    }, 2000);
  }

  // Expose functions needed by inline onclicks
  window.generateChart = generateChart;
  window.generateAIInsights = generateAIInsights;
  window.downloadChart = downloadChart;
  window.saveAnalysis = saveAnalysis;
  window.switchTab = switchTab;
  window.deleteHistoryItem = deleteHistoryItem;
  window.clearAllData = clearAllData;
  window.generateSampleData = generateSampleData;
})(window, document);

/* -------------------- Authentication (frontend) -------------------- */
(function (window, document) {
  const AUTH_BASE = "http://localhost:3000/api/auth";

  function getToken() {
    return localStorage.getItem("auth_token");
  }

  function setToken(token) {
    if (token) localStorage.setItem("auth_token", token);
    else localStorage.removeItem("auth_token");
    updateAuthUI();
  }

  function authFetch(path, opts = {}) {
    opts.headers = opts.headers || {};
    const token = getToken();
    if (token) opts.headers["Authorization"] = "Bearer " + token;
    return fetch(AUTH_BASE + path, opts).then((r) => r.json());
  }

  function showAuth(mode) {
    const modal = document.getElementById("authModal");
    const content = document.getElementById("authContent");
    if (!modal || !content) return;
    if (mode === "login") renderLoginForm(content);
    else renderRegisterForm(content);
    modal.style.display = "flex";
  }

  function hideAuth() {
    const modal = document.getElementById("authModal");
    if (modal) modal.style.display = "none";
  }

  function renderLoginForm(container) {
    container.innerHTML = `
      <h3>Sign In</h3>
      <div class="form-group"><label>Email</label><input id="loginEmail" class="form-control" type="email"></div>
      <div class="form-group"><label>Password</label><input id="loginPassword" class="form-control" type="password"></div>
      <div style="text-align:right;"><button class="btn btn-primary" id="btnModalLogin">Sign In</button></div>
    `;
    const btn = container.querySelector("#btnModalLogin");
    if (btn) btn.addEventListener("click", login);
  }

  function renderRegisterForm(container) {
    container.innerHTML = `
      <h3>Register</h3>
      <div class="form-group"><label>Name</label><input id="regName" class="form-control" type="text"></div>
      <div class="form-group"><label>Email</label><input id="regEmail" class="form-control" type="email"></div>
      <div class="form-group"><label>Password</label><input id="regPassword" class="form-control" type="password"></div>
      <div style="text-align:right;"><button class="btn btn-primary" id="btnModalRegister">Create Account</button></div>
    `;
    const btn = container.querySelector("#btnModalRegister");
    if (btn) btn.addEventListener("click", register);
  }

  async function register() {
    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    try {
      const res = await fetch(AUTH_BASE + "/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        alert("Registered successfully");
        hideAuth();
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (e) {
      alert("Registration error: " + e.message);
    }
  }

  async function login() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    try {
      const res = await fetch(AUTH_BASE + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        alert("Signed in successfully");
        hideAuth();
      } else {
        alert(data.message || "Login failed");
      }
    } catch (e) {
      alert("Login error: " + e.message);
    }
  }

  function logout() {
    setToken(null);
    alert("Signed out");
  }

  async function updateAuthUI() {
    const token = getToken();
    const btnSignIn = document.getElementById("btnSignIn");
    const btnRegister = document.getElementById("btnRegister");
    if (token) {
      // fetch profile to show name
      try {
        const res = await fetch(AUTH_BASE + "/profile", {
          headers: { Authorization: "Bearer " + token },
        });
        if (res.ok) {
          const json = await res.json();
          const user = json.user;
          if (btnSignIn) btnSignIn.textContent = user.name || "User";
          if (btnRegister) {
            btnRegister.textContent = "Sign Out";
            btnRegister.onclick = logout;
          }
        } else {
          if (btnSignIn) btnSignIn.textContent = "User";
        }
      } catch (e) {
        console.warn("profile fetch failed", e);
      }
    } else {
      if (btnSignIn) btnSignIn.textContent = "Sign In";
      if (btnRegister) {
        btnRegister.textContent = "Register";
        btnRegister.onclick = () => showAuth("register");
      }
    }
  }

  // Expose auth functions
  window.showAuth = showAuth;
  window.hideAuth = hideAuth;
  window.login = login;
  window.register = register;
  window.logout = logout;

  // Run once on load
  document.addEventListener("DOMContentLoaded", updateAuthUI);
})(window, document);
