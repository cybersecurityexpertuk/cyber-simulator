document.addEventListener("DOMContentLoaded", function () {
  var SIM_ENDPOINT = "https://cyber-simulator-eight.vercel.app/api/simulate";
  var SHARE_ENDPOINT = "https://cyber-simulator-eight.vercel.app/api/share-simulation";

  var simForm = document.getElementById("sim-form");
  var simSubmit = document.getElementById("sim-submit");
  var simReset = document.getElementById("sim-reset");
  var simFeedback = document.getElementById("sim-feedback");
  var shareResultEl = document.getElementById("sim-share-result");

  var scenarioEl = document.getElementById("scenario");
  var environmentEl = document.getElementById("environment");
  var sectorEl = document.getElementById("sector");
  var criticalServiceEl = document.getElementById("critical-service");
  var organisationSizeEl = document.getElementById("organisation-size");
  var currencyEl = document.getElementById("currency");
  var turnstileTokenEl = document.getElementById("sim-turnstile-token");

  var summaryWrap = document.getElementById("sim-results-summary");
  var reportWrap = document.getElementById("sim-report-print");

  var copyBtn = document.getElementById("sim-copy-summary");
  var printBtn = document.getElementById("sim-print-report-top");
  var shareBtn = document.getElementById("sim-share-report");
  var runAnotherBtn = document.getElementById("sim-run-another-top");

  var latestSimulationData = null;
  var latestReportId = null;

  var simProgressInterval = null;
  var simProgressValue = 8;
  var simulationRunning = false;

  var mitreNames = {
    "T1078": "Valid Accounts",
    "T1098": "Account Manipulation",
    "T1021": "Remote Services",
    "T1021.001": "Remote Desktop Protocol",
    "T1021.002": "SMB / Windows Admin Shares",
    "T1059": "Command and Scripting Interpreter",
    "T1003": "Credential Dumping",
    "T1566": "Phishing",
    "T1110": "Brute Force",
    "T1499": "Endpoint Denial of Service",
    "T1105": "Ingress Tool Transfer",
    "T1567": "Exfiltration Over Web Service",
    "T1567.002": "Exfiltration to Cloud Storage",
    "T1530": "Data from Cloud Storage Object",
    "T1195": "Supply Chain Compromise",
    "T1604": "Drive-by Compromise",
    "T1056": "Input Capture",
    "T1041": "Exfiltration Over C2 Channel"
  };

  function safeText(value, fallback) {
    if (fallback === undefined) fallback = "-";
    if (value === null || value === undefined || value === "") return fallback;
    return String(value);
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function escapeHtml(value) {
    return safeText(value, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normaliseEncoding(value) {
    return safeText(value, "")
      .replace(/Â£/g, "£")
      .replace(/â€”/g, "—");
  }

  function getSelectedText(selectEl) {
    if (!selectEl || !selectEl.value) return "-";
    var option = selectEl.options[selectEl.selectedIndex];
    return option ? option.text : String(selectEl.value);
  }

  function getTurnstileToken() {
    var cfTokenEl = document.querySelector('[name="cf-turnstile-response"]');

    if (cfTokenEl && cfTokenEl.value) {
      return cfTokenEl.value;
    }

    if (turnstileTokenEl && turnstileTokenEl.value) {
      return turnstileTokenEl.value;
    }

    return "";
  }

  function isVerified() {
    return !!getTurnstileToken();
  }

  function resetTurnstileWidget() {
    if (turnstileTokenEl) {
      turnstileTokenEl.value = "";
    }

    var cfTokenEl = document.querySelector('[name="cf-turnstile-response"]');
    if (cfTokenEl) {
      cfTokenEl.value = "";
    }

    if (window.turnstile && document.getElementById("sim-turnstile")) {
      try {
        window.turnstile.reset(document.getElementById("sim-turnstile"));
      } catch (e) {}
    }
  }

  function listToHtml(list, mode) {
    if (!list || !list.length) return "";
    var html = "";

    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item) continue;

      if (mode === "attack-path" && typeof item === "object") {
        var mitreId = safeText(item.mitre, "");
        var mitreUrl = mitreId
          ? "https://attack.mitre.org/techniques/" + encodeURIComponent(mitreId) + "/"
          : "";
        var mitreName = mitreNames[mitreId] || "";
        var badgeText = mitreId
          ? "MITRE " + mitreId + (mitreName ? " (" + mitreName + ")" : "")
          : "";

        html +=
          "<li><strong>" +
          escapeHtml(safeText(item.phase, "")) +
          ":</strong> " +
          escapeHtml(safeText(item.step, "")) +
          (mitreId
            ? "<br><a class='sim-mitre-tag' href='" +
              mitreUrl +
              "' target='_blank' rel='noopener noreferrer'>" +
              escapeHtml(badgeText) +
              "</a>"
            : "") +
          "</li>";
      } else {
        html += "<li>" + escapeHtml(item) + "</li>";
      }
    }

    return html;
  }

  function fillList(id, list, fallbackItems, mode) {
    var el = document.getElementById(id);
    if (!el) return;
    var items = (list && list.length) ? list : (fallbackItems || []);
    el.innerHTML = listToHtml(items, mode);
  }

  function clearResults() {
    if (summaryWrap) summaryWrap.classList.add("sim-hidden");
    if (reportWrap) reportWrap.classList.add("sim-hidden");
  }

  function clearShareResult() {
    if (shareResultEl) {
      shareResultEl.innerHTML = "";
    }
  }

  function setButtonDisplay(el, show) {
    if (!el) return;
    el.style.display = show ? "" : "none";
  }

  function setButtonDisabled(el, disabled) {
    if (!el) return;
    el.disabled = !!disabled;
  }

  function updateActionButtons() {
    var hasResults = !!latestSimulationData;

    if (simulationRunning) {
      setButtonDisplay(simSubmit, false);
      setButtonDisplay(simReset, false);

      setButtonDisabled(copyBtn, true);
      setButtonDisabled(printBtn, true);
      setButtonDisabled(shareBtn, true);
      setButtonDisabled(runAnotherBtn, true);
      return;
    }

    setButtonDisplay(simSubmit, true);
    setButtonDisplay(simReset, true);

    setButtonDisabled(simSubmit, false);
    setButtonDisabled(simReset, false);
    setButtonDisabled(copyBtn, !hasResults);
    setButtonDisabled(printBtn, !hasResults);
    setButtonDisabled(shareBtn, !hasResults);
    setButtonDisabled(runAnotherBtn, !hasResults);
  }

  function setRunningState(isRunning) {
    simulationRunning = !!isRunning;
    updateActionButtons();
  }

  function showError(message) {
    clearInterval(simProgressInterval);
    setRunningState(false);

    if (simFeedback) {
      simFeedback.innerHTML =
        '<div class="sim-error"><strong>Unable to run simulation.</strong><br>' +
        escapeHtml(message) +
        "</div>";
    }
  }

  function showSuccess(message) {
    if (simFeedback) {
      simFeedback.innerHTML =
        '<div class="sim-success"><strong>Success.</strong><br>' +
        escapeHtml(message) +
        "</div>";
    }
  }

  function createStatusBox() {
    if (!simFeedback) return;

    simFeedback.innerHTML =
      '<div class="sim-status">' +
      '<div><strong id="sim-status-title">Preparing simulation...</strong></div>' +
      '<div class="sim-progress"><div id="sim-progress-bar" class="sim-progress-bar"></div></div>' +
      '<div id="sim-status-copy">Validating scenario inputs and preparing the simulation request.</div>' +
      '<div id="sim-step-1" class="sim-step active">1. Validating scenario inputs</div>' +
      '<div id="sim-step-2" class="sim-step">2. Building attack path</div>' +
      '<div id="sim-step-3" class="sim-step">3. Estimating business impact</div>' +
      '<div id="sim-step-4" class="sim-step">4. Generating assurance insights</div>' +
      '<div id="sim-step-5" class="sim-step">5. Formatting report</div>' +
      "</div>";
  }

  function updateProgress(step, title, copy, width) {
    var titleEl = document.getElementById("sim-status-title");
    var copyEl = document.getElementById("sim-status-copy");
    var barEl = document.getElementById("sim-progress-bar");

    if (titleEl) titleEl.textContent = title;
    if (copyEl) copyEl.textContent = copy;
    if (barEl) barEl.style.width = width + "%";

    for (var i = 1; i <= 5; i++) {
      var stepEl = document.getElementById("sim-step-" + i);
      if (stepEl) {
        stepEl.className = "sim-step";
        if (i < step) stepEl.className = "sim-step done";
        if (i === step) stepEl.className = "sim-step active";
      }
    }
  }

  function startFakeProgress() {
    clearInterval(simProgressInterval);
    simProgressValue = 8;
    createStatusBox();
    updateProgress(
      1,
      "Running simulation...",
      "Validating scenario inputs and preparing the simulation request.",
      8
    );

    simProgressInterval = setInterval(function () {
      simProgressValue += Math.random() * 6;

      if (simProgressValue < 22) {
        updateProgress(
          1,
          "Running simulation...",
          "Validating scenario inputs and preparing the simulation request.",
          simProgressValue
        );
      } else if (simProgressValue < 44) {
        updateProgress(
          2,
          "Building attack path...",
          "Mapping realistic attacker steps and control breakdowns.",
          simProgressValue
        );
      } else if (simProgressValue < 64) {
        updateProgress(
          3,
          "Estimating business impact...",
          "Assessing likely operational, financial and regulatory consequences.",
          simProgressValue
        );
      } else if (simProgressValue < 84) {
        updateProgress(
          4,
          "Generating assurance insights...",
          "Producing control-focused observations and assurance questions.",
          simProgressValue
        );
      } else {
        updateProgress(
          5,
          "Formatting report...",
          "Preparing the browser summary and print-friendly report.",
          Math.min(simProgressValue, 96)
        );
      }

      if (simProgressValue >= 96) {
        clearInterval(simProgressInterval);
      }
    }, 1400);
  }

  function stopFakeProgressSuccess() {
    clearInterval(simProgressInterval);
    updateProgress(5, "Simulation complete", "Your summary and report are ready.", 100);

    setTimeout(function () {
      if (simFeedback) {
        simFeedback.innerHTML =
          '<div class="sim-success"><strong>Simulation complete.</strong> Summary and report generated successfully.</div>';
      }
    }, 500);
  }

  function buildImpactText(data) {
    return (
      data.business_impact ||
      "Potential disruption to critical services, financial loss, regulatory exposure and reputational impact should be assumed until the control failures are contained and independently validated."
    );
  }

  function buildImpactKpi(data) {
    if (data.financial_impact && data.financial_impact.total_estimated_impact) {
      return normaliseEncoding(data.financial_impact.total_estimated_impact);
    }
    return "Contextual estimate";
  }

  function formatDowntime(value) {
    var text = safeText(value, "-");
    if (text === "-") return text;
    if (text.toLowerCase().indexOf("hour") !== -1) return text;
    return text + " hours";
  }

  function deriveSeverity(data) {
    if (data.severity) return data.severity;
    var impact = (buildImpactKpi(data) || "").toLowerCase();
    if (
      impact.indexOf("critical") !== -1 ||
      impact.indexOf("10m") !== -1 ||
      impact.indexOf("6.5m") !== -1
    ) {
      return "Critical";
    }
    if (impact.indexOf("m") !== -1) return "High";
    return "Moderate";
  }

  function deriveFrameworkReferences(data, scenarioText, environmentText) {
    var refs = data.control_framework_references || {};
    var cis = safeArray(refs.cis_controls_v8);
    var nist = safeArray(refs.nist_csf_2_0);
    var iso = safeArray(refs.iso_iec_27002_2022);

    if (!cis.length) {
      cis = ["CIS Control 5", "CIS Control 6", "CIS Control 8"];
      if ((scenarioText + " " + environmentText).toLowerCase().indexOf("cloud") !== -1) {
        cis.push("CIS Control 4");
      }
    }

    if (!nist.length) {
      nist = ["PR.AA", "DE.CM", "RS.AN"];
      if (
        (scenarioText + " " + environmentText).toLowerCase().indexOf("third-party") !== -1 ||
        environmentText.toLowerCase().indexOf("saas") !== -1
      ) {
        nist.push("GV.SC");
      }
    }

    if (!iso.length) {
      iso = [
        "5.15 Access control",
        "8.15 Logging",
        "5.23 Information security for use of cloud services"
      ];
    }

    return {
      cis: cis,
      nist: nist,
      iso: iso
    };
  }

  function deriveEvidence(data, scenarioText, environmentText, sectorText, criticalServiceText) {
    if (Array.isArray(data.evidence_to_request) && data.evidence_to_request.length) {
      return data.evidence_to_request;
    }

    var service =
      criticalServiceText && criticalServiceText !== "-"
        ? criticalServiceText.toLowerCase()
        : "affected service";

    return [
      "Privileged access review evidence for " + service + " and any administrator roles in scope",
      "IAM, audit log and sign-in log extracts covering the affected timeframe for " + environmentText.toLowerCase(),
      "MFA and conditional access policy evidence, including exported settings or screenshots showing enforcement",
      "Service account, API key, token or third-party identity inventory relevant to the incident chain",
      "Incident timeline, containment records and decision logs for the " + scenarioText.toLowerCase() + " scenario in " + sectorText.toLowerCase(),
      "SIEM alert rule evidence or detection logic showing how abnormal behaviour would have been detected"
    ];
  }

  function setTextById(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setHtmlById(id, value) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = value;
  }

  function renderReport(data) {
    var scenarioText = getSelectedText(scenarioEl);
    var environmentText = getSelectedText(environmentEl);
    var sectorText = getSelectedText(sectorEl);
    var serviceText = getSelectedText(criticalServiceEl);
    var orgSizeText = getSelectedText(organisationSizeEl);
    var currencyText = getSelectedText(currencyEl);

    var now = new Date();
    var generatedAt = now.toLocaleString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    var reportId =
      "CCFS-" +
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      "-" +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      "-" +
      Math.floor(Math.random() * 900 + 100);

    latestReportId = reportId;

    var executiveSummary =
      data.summary ||
      "A realistic cyber scenario has been generated based on the selected context, highlighting how weak or failed controls may escalate into operational disruption, business loss and assurance concerns.";

    var boardBrief =
      data.board_brief ||
      "This scenario should be treated as a material control-effectiveness discussion point for leadership, with focus on service impact, control gaps and rapid containment readiness.";

    var boardRiskStatement =
      data.board_risk_statement ||
      "This scenario represents a plausible route to material operational disruption, customer harm and regulatory scrutiny if control weaknesses remain unresolved.";

    var attackPath = safeArray(data.attack_path);
    if (!attackPath.length) {
      attackPath = [
        { phase: "Initial Access", step: "An initiating control weakness created an exploitable opportunity.", mitre: "T1078" },
        { phase: "Privilege Misuse", step: "The attacker or insider moved through weak access controls.", mitre: "T1098" },
        { phase: "Lateral Movement", step: "The incident chain progressed due to weak monitoring or segmentation.", mitre: "T1021" },
        { phase: "Impact", step: "Business-critical services or data became exposed to operational and regulatory risk.", mitre: "T1499" }
      ];
    }

    var weakSignals = safeArray(data.weak_signals);
    if (!weakSignals.length) {
      weakSignals = [
        "Unusual authentication events involving third-party or service identities.",
        "Anomalous API activity or audit log patterns.",
        "Unexpected data export, access or privilege changes."
      ];
    }

    var controlGaps = safeArray(data.key_controls);
    if (!controlGaps.length) {
      controlGaps = [
        "Control gaps require validation against live evidence.",
        "Assurance should focus on failed preventive and detective controls.",
        "Independent verification is recommended for high-impact services."
      ];
    }

    var immediateActions = safeArray(data.priority_actions);
    if (!immediateActions.length) {
      immediateActions = [
        "Contain the affected identities, accounts, endpoints or workloads.",
        "Validate whether privileged access and monitoring controls failed as designed.",
        "Confirm service impact, data exposure and recovery readiness."
      ];
    }

    var assuranceQuestions = safeArray(data.assurance_questions);
    if (!assuranceQuestions.length) {
      assuranceQuestions = [
        "Which failed controls were assumed to be operating but had not been independently validated?",
        "What fresh evidence exists to prove containment, access revocation and recovery effectiveness?",
        "Which critical services remain exposed to repeat exploitation?"
      ];
    }

    var timeline = safeArray(data.timeline);
    if (!timeline.length) {
      timeline = [
        "Day 0 - Initial access achieved",
        "Day 1 - Privileges expanded",
        "Day 3 - Data accessed or systems affected",
        "Day 6 - Incident discovered"
      ];
    }

    var assuranceInsight =
      data.assurance_insight ||
      "This simulation suggests the greatest risk is not simply the initiating event, but the absence of fresh, corroborated evidence proving that key controls were working at the point of failure.";

    var confidence = data.confidence_rating || "Moderate";
    var severity = deriveSeverity(data);
    var likelihood = data.likelihood || "Moderate";
    var detectionOpportunity =
      data.detection_opportunity ||
      "Earlier detection would likely have depended on stronger monitoring of identity, audit, API and abnormal access patterns.";
    var detectionTime = data.detection_time || "6-24 hours depending on monitoring maturity";
    var conclusion =
      data.conclusion ||
      "Immediate containment, validation of control failures, and independently verified remediation will materially reduce residual risk and improve confidence in the organisation’s response.";

    var financial = data.financial_impact || {};
    var framework = deriveFrameworkReferences(data, scenarioText, environmentText);
    var evidenceList = deriveEvidence(data, scenarioText, environmentText, sectorText, serviceText);

    latestSimulationData = {
      report_id: reportId,
      generated_at: generatedAt,
      scenario_text: scenarioText,
      environment_text: environmentText,
      sector_text: sectorText,
      critical_service_text: serviceText,
      organisation_size_text: orgSizeText,
      currency_text: currencyText,
      severity: severity,
      likelihood: likelihood,
      confidence: confidence,
      financial_impact: financial,
      board_risk_statement: boardRiskStatement,
      board_brief: boardBrief,
      summary: executiveSummary,
      attack_path: attackPath,
      weak_signals: weakSignals,
      business_impact: buildImpactText(data),
      control_framework_references: framework,
      priority_actions: immediateActions,
      evidence_to_request: evidenceList,
      timeline: timeline,
      detection_opportunity: detectionOpportunity,
      detection_time: detectionTime,
      assurance_questions: assuranceQuestions,
      assurance_insight: assuranceInsight,
      conclusion: conclusion,
      raw: data
    };

    setTextById("sim-kpi-scenario", scenarioText);
    setTextById("sim-kpi-environment", environmentText);
    setTextById("sim-kpi-severity", severity);
    setTextById("sim-kpi-confidence", confidence);
    setTextById("sim-kpi-impact", buildImpactKpi(data));
    setTextById("sim-kpi-likelihood", likelihood);

    setTextById("sim-board-risk-statement", boardRiskStatement);
    setTextById("sim-board-brief", boardBrief);
    setTextById("sim-summary-text", executiveSummary);
    setTextById("sim-detection-opportunity", detectionOpportunity);

    setTextById("sim-financial-downtime", formatDowntime(financial.downtime_hours));
    setTextById("sim-financial-response", normaliseEncoding(safeText(financial.response_cost)));
    setTextById("sim-financial-revenue", normaliseEncoding(safeText(financial.lost_revenue)));
    setTextById("sim-financial-regulatory", normaliseEncoding(safeText(financial.regulatory_exposure)));
    setTextById("sim-financial-customer", normaliseEncoding(safeText(financial.customer_remediation_cost)));
    setTextById("sim-financial-total", normaliseEncoding(safeText(financial.total_estimated_impact)));

    fillList("sim-top-actions", immediateActions.slice(0, 4), []);
    fillList("sim-control-gaps", controlGaps.slice(0, 4), []);
    fillList("sim-attack-chain", attackPath, [], "attack-path");
    fillList("sim-questions", assuranceQuestions.slice(0, 4), []);
    fillList("sim-framework-cis", framework.cis, []);
    fillList("sim-framework-nist", framework.nist, []);
    fillList("sim-framework-iso", framework.iso, []);
    fillList("sim-evidence-list", evidenceList, []);

    setHtmlById(
      "sim-meta-box",
      "<p><strong>Report ID:</strong> " + escapeHtml(reportId) + "</p>" +
      "<p><strong>Generated:</strong> " + escapeHtml(generatedAt) + "</p>" +
      "<p><strong>Scenario:</strong> " + escapeHtml(scenarioText) + "</p>" +
      "<p><strong>Environment:</strong> " + escapeHtml(environmentText) + "</p>" +
      "<p><strong>Sector:</strong> " + escapeHtml(sectorText) + "</p>" +
      "<p><strong>Critical Service:</strong> " + escapeHtml(serviceText) + "</p>" +
      "<p><strong>Organisation Size:</strong> " + escapeHtml(orgSizeText) + "</p>" +
      "<p><strong>Currency:</strong> " + escapeHtml(currencyText) + "</p>"
    );

    setTextById("sim-report-board-risk-statement", boardRiskStatement);
    setTextById("sim-report-board-brief", boardBrief);
    setTextById("sim-report-summary", executiveSummary);
    setTextById("sim-report-severity", severity);

    var financialSummary = "Estimated impact: " + buildImpactKpi(data);
    if (data.financial_impact) {
      financialSummary =
        "Estimated impact: " + normaliseEncoding(safeText(financial.total_estimated_impact, "-")) +
        ". Downtime: " + formatDowntime(financial.downtime_hours) +
        ". Response cost: " + normaliseEncoding(safeText(financial.response_cost, "-")) +
        ". Lost revenue: " + normaliseEncoding(safeText(financial.lost_revenue, "-")) +
        ". Regulatory exposure: " + normaliseEncoding(safeText(financial.regulatory_exposure, "-")) +
        ". Customer remediation: " + normaliseEncoding(safeText(financial.customer_remediation_cost, "-")) + ".";
    }

    setTextById("sim-report-financial-impact", financialSummary);

    fillList("sim-report-attack-path", attackPath, [], "attack-path");
    fillList("sim-report-weak-signals", weakSignals, []);
    setTextById("sim-report-impact", buildImpactText(data));
    fillList("sim-report-controls", controlGaps, []);
    setTextById("sim-report-framework-cis", framework.cis.length ? framework.cis.join(", ") : "-");
    setTextById("sim-report-framework-nist", framework.nist.length ? framework.nist.join(", ") : "-");
    setTextById("sim-report-framework-iso", framework.iso.length ? framework.iso.join(", ") : "-");
    fillList("sim-report-actions", immediateActions, []);
    fillList("sim-report-evidence", evidenceList, []);
    fillList("sim-report-timeline", timeline, []);
    setTextById("sim-report-detection", detectionOpportunity);
    setTextById("sim-report-detection-time", detectionTime);
    fillList("sim-report-questions", assuranceQuestions, []);
    setTextById("sim-report-insight", assuranceInsight);
    setTextById("sim-report-confidence", confidence);
    setTextById("sim-report-conclusion", conclusion);

    if (summaryWrap) summaryWrap.classList.remove("sim-hidden");
    if (reportWrap) reportWrap.classList.remove("sim-hidden");

    updateActionButtons();

    if (summaryWrap && summaryWrap.scrollIntoView) {
      summaryWrap.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function resetFormAndResults() {
    if (simForm) simForm.reset();
    if (simFeedback) simFeedback.innerHTML = "";
    clearShareResult();

    latestSimulationData = null;
    latestReportId = null;

    clearInterval(simProgressInterval);
    simProgressValue = 8;
    setRunningState(false);

    clearResults();
    resetTurnstileWidget();
    updateActionButtons();
  }

  window.onSimTurnstileSuccess = function (token) {
    if (turnstileTokenEl) {
      turnstileTokenEl.value = token || "";
    }
  };

  window.onSimTurnstileExpired = function () {
    if (turnstileTokenEl) {
      turnstileTokenEl.value = "";
    }
  };

  window.onSimTurnstileError = function () {
    if (turnstileTokenEl) {
      turnstileTokenEl.value = "";
    }
  };

  window.applyPreset = function (preset) {
    if (!scenarioEl || !environmentEl || !sectorEl || !criticalServiceEl || !organisationSizeEl || !currencyEl) return;

    if (preset === "identity-cloud-finance") {
      scenarioEl.value = "identity_compromise";
      environmentEl.value = "cloud";
      sectorEl.value = "financial_services";
      criticalServiceEl.value = "identity_platform";
      organisationSizeEl.value = "mid_market";
      currencyEl.value = "GBP";
    }

    if (preset === "ransomware-onprem-health") {
      scenarioEl.value = "ransomware";
      environmentEl.value = "enterprise_network";
      sectorEl.value = "healthcare";
      criticalServiceEl.value = "erp";
      organisationSizeEl.value = "enterprise";
      currencyEl.value = "GBP";
    }

    if (preset === "supplier-saas-retail") {
      scenarioEl.value = "third_party_breach";
      environmentEl.value = "saas_ecosystem";
      sectorEl.value = "retail";
      criticalServiceEl.value = "customer_portal";
      organisationSizeEl.value = "mid_market";
      currencyEl.value = "GBP";
    }

    if (preset === "insider-cloud-tech") {
      scenarioEl.value = "insider_misuse";
      environmentEl.value = "cloud";
      sectorEl.value = "technology";
      criticalServiceEl.value = "data_platform";
      organisationSizeEl.value = "enterprise";
      currencyEl.value = "USD";
    }

    showSuccess("Preset applied. Review the fields, complete verification, then run the simulation.");
  };

  if (simReset) {
    simReset.addEventListener("click", function (e) {
      e.preventDefault();
      if (simulationRunning) return;
      resetFormAndResults();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", function (e) {
      e.preventDefault();

      var textEl = document.getElementById("sim-summary-text");
      var text = textEl ? textEl.textContent || "" : "";

      if (!latestSimulationData || !text) {
        showError("There is no summary available to copy yet.");
        return;
      }

      if (!navigator.clipboard) {
        showError("Copy failed. Please copy the summary manually.");
        return;
      }

      navigator.clipboard.writeText(text).then(function () {
        showSuccess("Executive summary copied to clipboard.");
      }).catch(function () {
        showError("Copy failed. Please copy the summary manually.");
      });
    });
  }

  if (printBtn) {
    printBtn.addEventListener("click", function (e) {
      e.preventDefault();

      if (!latestSimulationData) {
        showError("Please run a simulation first.");
        return;
      }

      window.print();
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener("click", function (e) {
      e.preventDefault();

      if (simulationRunning) return;

      if (!latestSimulationData) {
        if (shareResultEl) {
          shareResultEl.innerHTML =
            '<div class="sim-error"><strong>No simulation to share.</strong><br>Please run a simulation first.</div>';
        }
        return;
      }

      shareBtn.disabled = true;
      shareBtn.textContent = "Creating link...";

      if (shareResultEl) {
        shareResultEl.innerHTML =
          '<div class="sim-status"><strong>Creating share link...</strong></div>';
      }

      var controller = new AbortController();
      var timeoutId = setTimeout(function () {
        controller.abort();
      }, 20000);

      fetch(SHARE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          report_id: latestReportId,
          data: latestSimulationData
        }),
        signal: controller.signal
      })
        .then(function (response) {
          clearTimeout(timeoutId);

          return response.text().then(function (text) {
            var parsed = {};

            try {
              parsed = text ? JSON.parse(text) : {};
            } catch (err) {}

            if (!response.ok) {
              throw new Error(
                parsed.error ||
                parsed.message ||
                text ||
                "Failed to create share link."
              );
            }

            return parsed;
          });
        })
        .then(function (result) {
          var blobUrl =
            result.blob_url ||
            result.url ||
            result.share_url ||
            result.blobUrl ||
            "";

          if (!blobUrl) {
            throw new Error("Share service did not return a blob URL.");
          }

          var shareUrl =
  "https://www.cybersecurityexpert.co.uk/sim-report?url=" +
  encodeURIComponent(blobUrl);

          if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(shareUrl).then(function () {
              if (shareResultEl) {
                shareResultEl.innerHTML =
                  '<div class="sim-success"><strong>Share link created.</strong><br>Link copied to clipboard:<br><a class="sim-share-link" href="' +
                  escapeHtml(shareUrl) +
                  '" target="_blank" rel="noopener noreferrer">' +
                  escapeHtml(shareUrl) +
                  "</a></div>";
              }
            }).catch(function () {
              if (shareResultEl) {
                shareResultEl.innerHTML =
                  '<div class="sim-success"><strong>Share link created.</strong><br><a class="sim-share-link" href="' +
                  escapeHtml(shareUrl) +
                  '" target="_blank" rel="noopener noreferrer">' +
                  escapeHtml(shareUrl) +
                  "</a></div>";
              }
            });
          }

          if (shareResultEl) {
            shareResultEl.innerHTML =
              '<div class="sim-success"><strong>Share link created.</strong><br><a class="sim-share-link" href="' +
              escapeHtml(shareUrl) +
              '" target="_blank" rel="noopener noreferrer">' +
              escapeHtml(shareUrl) +
              "</a></div>";
          }
        })
        .catch(function (error) {
          if (shareResultEl) {
            shareResultEl.innerHTML =
              '<div class="sim-error"><strong>Share link failed.</strong><br>' +
              escapeHtml(error.name === "AbortError" ? "The share request timed out." : (error.message || "Unknown error")) +
              "</div>";
          }
        })
        .finally(function () {
          clearTimeout(timeoutId);
          shareBtn.disabled = false;
          shareBtn.textContent = "Create Share Link";
          updateActionButtons();
        });
    });
  }

  if (runAnotherBtn) {
    runAnotherBtn.addEventListener("click", function (e) {
      e.preventDefault();

      if (simulationRunning) return;

      resetFormAndResults();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (simForm) {
    simForm.addEventListener("submit", function (e) {
      e.preventDefault();

      if (simulationRunning) return;

      clearResults();
      clearShareResult();

      if (!scenarioEl.value || !environmentEl.value || !sectorEl.value) {
        showError("Please select Scenario, Environment, and Sector before running the simulation.");
        return;
      }

      if (!isVerified()) {
        showError("Please complete the Cloudflare verification before running the simulation.");
        return;
      }

      latestSimulationData = null;
      latestReportId = null;
      setRunningState(true);
      startFakeProgress();

      var payload = {
        scenario: scenarioEl.value,
        environment: environmentEl.value,
        sector: sectorEl.value,
        critical_service: criticalServiceEl.value || "",
        organisation_size: organisationSizeEl.value || "",
        currency: currencyEl.value || "",
        turnstileToken: getTurnstileToken()
      };

      fetch(SIM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (!response.ok) {
            return response.text().then(function (text) {
              throw new Error(text || "The simulation service returned an error.");
            });
          }
          return response.json();
        })
        .then(function (data) {
          stopFakeProgressSuccess();
          renderReport(data);
          resetTurnstileWidget();
        })
        .catch(function (error) {
          showError(error.message || "Something went wrong while generating the simulation.");
          resetTurnstileWidget();
        })
        .finally(function () {
          setRunningState(false);
          updateActionButtons();
        });
    });
  }

  clearResults();
  updateActionButtons();
});
