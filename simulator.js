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

  var chartJsLoadPromise = null;
  var financialChartInstance = null;

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

  function safeNumber(value, fallback) {
    var parsed = parseFloat(value);
    return isNaN(parsed) ? (fallback || 0) : parsed;
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
      .replace(/â€‘/g, "-")
      .replace(/â€“/g, "–")
      .replace(/â€”/g, "—")
      .replace(/â€™/g, "’")
      .replace(/â€œ/g, "“")
      .replace(/â€\x9d/g, "”");
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

  function formatTitleCase(value) {
    var text = safeText(value, "");
    if (!text) return "-";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function parseMoney(value) {
    var text = normaliseEncoding(safeText(value, ""));
    if (!text) return 0;
    var cleaned = text.replace(/[^0-9.\-]/g, "");
    var parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  function parseHourEstimate(value) {
    var text = safeText(value, "").toLowerCase().trim();
    if (!text) return 0;

    var rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      return (safeNumber(rangeMatch[1]) + safeNumber(rangeMatch[2])) / 2;
    }

    var numberMatch = text.match(/(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      return safeNumber(numberMatch[1]);
    }

    if (text.indexOf("day") !== -1) return 24;
    if (text.indexOf("week") !== -1) return 168;
    return 0;
  }

  function formatHoursAsLabel(hours) {
    hours = Math.max(0, Math.round(hours));
    if (hours >= 48) {
      var days = (hours / 24).toFixed(hours % 24 === 0 ? 0 : 1);
      return days + " days";
    }
    return hours + " hours";
  }

  function getSeverityClass(value) {
    var v = safeText(value, "").toLowerCase();
    if (v === "critical") return "severity-critical";
    if (v === "high") return "severity-high";
    return "severity-moderate";
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
      } else if (typeof item === "object") {
        html += "<li>" + escapeHtml(JSON.stringify(item)) + "</li>";
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

    var dynamicSummary = document.getElementById("sim-dynamic-visuals");
    if (dynamicSummary) dynamicSummary.remove();

    if (financialChartInstance) {
      try {
        financialChartInstance.destroy();
      } catch (e) {}
      financialChartInstance = null;
    }
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
    if (text.toLowerCase().indexOf("hour") !== -1 || text.toLowerCase().indexOf("day") !== -1) return text;
    return text + " hours";
  }

  function deriveSeverity(data) {
    if (data.severity) return formatTitleCase(data.severity);

    var impact = (buildImpactKpi(data) || "").toLowerCase();
    var downtime = parseHourEstimate(data.financial_impact && data.financial_impact.downtime_hours);

    if (
      impact.indexOf("critical") !== -1 ||
      impact.indexOf("10m") !== -1 ||
      impact.indexOf("6.5m") !== -1 ||
      downtime >= 72
    ) {
      return "Critical";
    }

    if (impact.indexOf("m") !== -1 || downtime >= 24) return "High";
    return "Moderate";
  }

  function deriveLikelihood(data, scenarioValue, environmentValue, sectorValue) {
    if (data.likelihood) return formatTitleCase(data.likelihood);

    if (
      scenarioValue === "identity_compromise" ||
      scenarioValue === "ransomware" ||
      environmentValue === "cloud" ||
      sectorValue === "financial_services"
    ) {
      return "High";
    }

    return "Moderate";
  }

  function deriveConfidence(data) {
    var raw = data.confidence || data.confidence_rating || "";
    if (raw) return formatTitleCase(raw);

    var signalCount = safeArray(data.weak_signals).length;
    var actionCount = safeArray(data.priority_actions).length;
    var attackCount = safeArray(data.attack_path).length;

    if (attackCount >= 4 && signalCount >= 3 && actionCount >= 3) return "High";
    if (attackCount >= 2) return "Moderate";
    return "Low";
  }

  function confidenceToPercent(confidence) {
    var c = safeText(confidence, "").toLowerCase();

    if (c === "critical") return 92;
    if (c === "high") return 78;
    if (c === "moderate" || c === "medium") return 60;
    if (c === "low") return 38;

    var parsed = parseFloat(c);
    if (!isNaN(parsed)) return Math.max(0, Math.min(100, parsed));
    return 60;
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

  function deriveControlWeaknessMap(data, scenarioValue, environmentValue, sectorValue, serviceText) {
    if (Array.isArray(data.control_weakness_map) && data.control_weakness_map.length) {
      return data.control_weakness_map;
    }

    var weaknesses = [];

    if (scenarioValue === "identity_compromise") {
      weaknesses.push(
        { domain: "Identity and Access Management", weakness: "Privileged or user identities could be misused due to weak MFA enforcement, poor access hygiene, or stale roles.", risk: "High" },
        { domain: "Security Logging and Monitoring", weakness: "Anomalous authentication or privilege escalation may not be detected quickly enough.", risk: "High" },
        { domain: "Third-Party and Supply Chain Risk", weakness: "Federated or externally connected identities may extend exposure.", risk: "Moderate" }
      );
    } else if (scenarioValue === "ransomware") {
      weaknesses.push(
        { domain: "Patch Management", weakness: "Exposure may persist due to delayed remediation or unsupported systems.", risk: "High" },
        { domain: "Backup, Retention and Continuity Readiness", weakness: "Recovery confidence depends on tested, isolated and restorable backups.", risk: "Critical" },
        { domain: "Network Security and Segmentation", weakness: "Weak segmentation may allow lateral movement into critical services.", risk: "High" }
      );
    } else if (scenarioValue === "third_party_breach") {
      weaknesses.push(
        { domain: "Third-Party and Supply Chain Risk", weakness: "Dependency assurance may be incomplete for externally hosted or managed services.", risk: "High" },
        { domain: "Data Classification and Protection", weakness: "Data exposure risk depends on what the service can access or store.", risk: "High" },
        { domain: "Incident Response and Recovery", weakness: "Containment may depend on third-party response time and transparency.", risk: "Moderate" }
      );
    } else if (scenarioValue === "insider_misuse") {
      weaknesses.push(
        { domain: "Identity and Access Management", weakness: "Access rights may exceed least privilege or remain active beyond operational need.", risk: "High" },
        { domain: "Security Awareness and Human Behaviour Risk", weakness: "Escalation signals may be missed if behaviour, context or access anomalies are not reviewed.", risk: "Moderate" },
        { domain: "Security Logging and Monitoring", weakness: "Detection may rely on audit trail quality and alert tuning.", risk: "High" }
      );
    } else {
      weaknesses.push(
        { domain: "Identity and Access Management", weakness: "Key access assumptions require independent validation.", risk: "High" },
        { domain: "Security Logging and Monitoring", weakness: "Control effectiveness may be overstated if alert coverage is incomplete.", risk: "Moderate" },
        { domain: "Incident Response and Recovery", weakness: "Containment and recovery readiness should be evidenced, not assumed.", risk: "Moderate" }
      );
    }

    if (environmentValue === "cloud" || environmentValue === "saas_ecosystem") {
      weaknesses.push({
        domain: "Emerging Technology and Platform Risk",
        weakness: "Configuration drift, token exposure, or weak tenant visibility could increase risk in cloud and SaaS environments affecting " + safeText(serviceText, "the service").toLowerCase() + ".",
        risk: "High"
      });
    }

    if (sectorValue === "healthcare" || sectorValue === "financial_services") {
      weaknesses.push({
        domain: "Governance, Risk, and Control Accountability",
        weakness: "Operational and regulatory consequences increase the need for fresh, corroborated assurance evidence.",
        risk: "High"
      });
    }

    return weaknesses.slice(0, 5);
  }

  function deriveAdversaryProfile(data, scenarioValue, environmentValue, sectorValue) {
    if (data.adversary_profile && typeof data.adversary_profile === "object") {
      return data.adversary_profile;
    }

    var profile = {
      likely_actor: "Financially motivated threat actor",
      motivation: "Operational disruption, extortion, data theft, or credential reuse.",
      typical_entry_methods: [],
      typical_behaviours: []
    };

    if (scenarioValue === "identity_compromise") {
      profile.likely_actor = "Credential-focused intrusion actor";
      profile.motivation = "Account takeover, privilege abuse, fraud, or lateral movement into trusted systems.";
      profile.typical_entry_methods = [
        "Credential phishing or token theft",
        "Password spraying or reuse of compromised credentials",
        "Abuse of federated identities, service accounts, or stale privileged access"
      ];
      profile.typical_behaviours = [
        "Privilege escalation following initial access",
        "Use of trusted accounts to avoid early detection",
        "Targeting identity systems, admin consoles, or cloud control planes"
      ];
    } else if (scenarioValue === "ransomware") {
      profile.likely_actor = "Financially motivated ransomware affiliate";
      profile.motivation = "Extortion through encryption, service disruption, and data exposure threats.";
      profile.typical_entry_methods = [
        "Exploitation of unpatched internet-facing systems",
        "Credential access via phishing or infostealers",
        "Reuse of privileged credentials or remote access tooling"
      ];
      profile.typical_behaviours = [
        "Rapid lateral movement after foothold",
        "Targeting backups, identity, and management tooling",
        "Disruption of business-critical systems before encryption or extortion"
      ];
    } else if (scenarioValue === "third_party_breach") {
      profile.likely_actor = "Supply-chain or dependency-focused intrusion actor";
      profile.motivation = "Indirect access to data, services, customers, or trusted pathways.";
      profile.typical_entry_methods = [
        "Compromise of a supplier, SaaS integration, or external support relationship",
        "Abuse of API connections or trust relationships",
        "Credential access inherited from third-party compromise"
      ];
      profile.typical_behaviours = [
        "Use of trusted service pathways",
        "Targeting connected customer or transaction data",
        "Stealthy persistence through external integrations"
      ];
    } else if (scenarioValue === "insider_misuse") {
      profile.likely_actor = "Insider or trusted-user abuse case";
      profile.motivation = "Misuse of legitimate access, policy circumvention, or unauthorised extraction.";
      profile.typical_entry_methods = [
        "Use of legitimate access already granted",
        "Abuse of privileged rights or over-broad access",
        "Use of business-approved tools for unauthorised actions"
      ];
      profile.typical_behaviours = [
        "Actions appear normal unless context is reviewed",
        "Sensitive data access outside expected patterns",
        "Gradual misuse that evades point-in-time assurance"
      ];
    }

    if (environmentValue === "cloud" || environmentValue === "saas_ecosystem") {
      profile.typical_behaviours.push("Preference for cloud identities, API abuse, token misuse, or cross-platform persistence");
    }

    if (sectorValue === "financial_services") {
      profile.typical_behaviours.push("High interest in fraud, transaction systems, and sensitive customer data");
    }

    if (sectorValue === "healthcare") {
      profile.typical_behaviours.push("Potential impact amplification through service disruption and sensitive record access");
    }

    return profile;
  }

  function deriveDriftToFix(data) {
    var source = data.drift_to_fix && typeof data.drift_to_fix === "object"
      ? data.drift_to_fix
      : {};

    var detectHours = parseHourEstimate(source.detect || data.detection_time || "12");
    var containHours = parseHourEstimate(source.contain || "8");
    var recoverHours = parseHourEstimate(
      source.recover || ((data.financial_impact && data.financial_impact.downtime_hours) || "24")
    );
    var verifyHours = parseHourEstimate(source.verify || "12");

    if (!detectHours) detectHours = 12;
    if (!containHours) containHours = Math.max(4, Math.round(detectHours * 0.75));
    if (!recoverHours) recoverHours = 24;
    if (!verifyHours) verifyHours = Math.max(6, Math.round(recoverHours * 0.4));

    var totalHours = detectHours + containHours + recoverHours + verifyHours;

    return {
      detect: detectHours,
      contain: containHours,
      recover: recoverHours,
      verify: verifyHours,
      total: totalHours
    };
  }

  function setTextById(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setHtmlById(id, value) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = value;
  }

  function ensureChartJs() {
    if (window.Chart) {
      return Promise.resolve(window.Chart);
    }

    if (chartJsLoadPromise) {
      return chartJsLoadPromise;
    }

    chartJsLoadPromise = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-sim-chartjs="true"]');
      if (existing) {
        existing.addEventListener("load", function () {
          resolve(window.Chart);
        });
        existing.addEventListener("error", function () {
          reject(new Error("Chart library failed to load."));
        });
        return;
      }

      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
      script.async = true;
      script.setAttribute("data-sim-chartjs", "true");

      script.onload = function () {
        resolve(window.Chart);
      };

      script.onerror = function () {
        reject(new Error("Chart library failed to load."));
      };

      document.head.appendChild(script);
    });

    return chartJsLoadPromise;
  }

  function buildRiskBadge(value) {
    var cls = getSeverityClass(value);
    return "<span class='sim-risk-pill " + cls + "'>" + escapeHtml(value) + "</span>";
  }

  function buildControlWeaknessTable(items) {
    if (!items || !items.length) {
      return "<p>No control weakness mapping was generated.</p>";
    }

    var html =
      "<div class='sim-enh-table-wrap'>" +
      "<table class='sim-enh-table'>" +
      "<thead><tr><th>Control domain</th><th>Weakness</th><th>Risk</th></tr></thead><tbody>";

    for (var i = 0; i < items.length; i++) {
      html +=
        "<tr>" +
        "<td>" + escapeHtml(safeText(items[i].domain, "-")) + "</td>" +
        "<td>" + escapeHtml(safeText(items[i].weakness, "-")) + "</td>" +
        "<td>" + buildRiskBadge(formatTitleCase(safeText(items[i].risk, "Moderate"))) + "</td>" +
        "</tr>";
    }

    html += "</tbody></table></div>";
    return html;
  }

  function buildAdversaryProfileHtml(profile) {
    return (
      "<p><strong>Likely actor:</strong> " + escapeHtml(safeText(profile.likely_actor, "-")) + "</p>" +
      "<p><strong>Motivation:</strong> " + escapeHtml(safeText(profile.motivation, "-")) + "</p>" +
      "<p><strong>Typical entry methods:</strong></p>" +
      "<ul class='sim-enh-list'>" +
      safeArray(profile.typical_entry_methods).map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      }).join("") +
      "</ul>" +
      "<p><strong>Likely behaviours:</strong></p>" +
      "<ul class='sim-enh-list'>" +
      safeArray(profile.typical_behaviours).map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      }).join("") +
      "</ul>"
    );
  }

  function buildAttackTimelineHtml(attackPath) {
    if (!attackPath || !attackPath.length) {
      return "<p>No attack path available.</p>";
    }

    var html = "<div class='sim-attack-timeline'>";
    for (var i = 0; i < attackPath.length; i++) {
      var item = attackPath[i] || {};
      var mitreText = safeText(item.mitre, "");
      var mitreName = mitreText ? (mitreNames[mitreText] || "") : "";

      html +=
        "<div class='sim-attack-step'>" +
          "<div class='sim-attack-phase'>" + escapeHtml(safeText(item.phase, "Phase " + (i + 1))) + "</div>" +
          "<div class='sim-attack-text'>" + escapeHtml(safeText(item.step, "-")) + "</div>" +
          (mitreText
            ? "<div class='sim-attack-mitre'>MITRE " + escapeHtml(mitreText) + (mitreName ? " • " + escapeHtml(mitreName) : "") + "</div>"
            : "") +
        "</div>";
    }
    html += "</div>";

    return html;
  }

  function buildDriftToFixHtml(drift) {
    return (
      "<div class='sim-drift-grid'>" +
        "<div class='sim-drift-item'><span>Detect</span><strong>" + escapeHtml(formatHoursAsLabel(drift.detect)) + "</strong></div>" +
        "<div class='sim-drift-item'><span>Contain</span><strong>" + escapeHtml(formatHoursAsLabel(drift.contain)) + "</strong></div>" +
        "<div class='sim-drift-item'><span>Recover</span><strong>" + escapeHtml(formatHoursAsLabel(drift.recover)) + "</strong></div>" +
        "<div class='sim-drift-item'><span>Verify</span><strong>" + escapeHtml(formatHoursAsLabel(drift.verify)) + "</strong></div>" +
      "</div>" +
      "<p class='sim-drift-total'><strong>Estimated Drift-to-Fix:</strong> " + escapeHtml(formatHoursAsLabel(drift.total)) + "</p>"
    );
  }

  function injectEnhancementStyles() {
    if (document.getElementById("sim-enhancement-styles")) return;

    var style = document.createElement("style");
    style.id = "sim-enhancement-styles";
    style.textContent =
      ".sim-enh-section{margin-top:20px;padding:18px;border:1px solid #dbe2ea;border-radius:14px;background:#fff;}" +
      ".sim-enh-section.featured{background:#f8fbff;border-color:#cfe0ff;}" +
      ".sim-enh-section h3{margin:0 0 12px;font-size:18px;line-height:1.3;font-weight:800;color:#1147d9;}" +
      ".sim-enh-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;margin-top:18px;}" +
      ".sim-enh-list{margin:8px 0 0;padding-left:18px;}" +
      ".sim-enh-list li{margin:0 0 8px;line-height:1.6;color:#1e293b;}" +
      ".sim-enh-table-wrap{overflow:auto;}" +
      ".sim-enh-table{width:100%;border-collapse:collapse;font-size:14px;}" +
      ".sim-enh-table th,.sim-enh-table td{padding:12px;border:1px solid #dbe2ea;text-align:left;vertical-align:top;}" +
      ".sim-enh-table th{background:#f8fbff;color:#0f172a;font-weight:800;}" +
      ".sim-risk-pill{display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:800;line-height:1.2;}" +
      ".sim-risk-pill.severity-critical{background:#fff1f2;color:#9f1239;}" +
      ".sim-risk-pill.severity-high{background:#fff7ed;color:#c2410c;}" +
      ".sim-risk-pill.severity-moderate{background:#eff6ff;color:#1d4ed8;}" +
      ".sim-attack-timeline{display:flex;flex-wrap:wrap;gap:12px;}" +
      ".sim-attack-step{position:relative;flex:1 1 180px;min-width:160px;padding:14px;border:1px solid #dbe2ea;border-radius:12px;background:#f8fbff;}" +
      ".sim-attack-phase{font-size:12px;line-height:1.3;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#64748b;margin-bottom:8px;}" +
      ".sim-attack-text{font-size:14px;line-height:1.6;font-weight:700;color:#0f172a;}" +
      ".sim-attack-mitre{margin-top:8px;font-size:12px;line-height:1.5;color:#475569;}" +
      ".sim-confidence-wrap{margin-top:8px;}" +
      ".sim-confidence-track{height:14px;border-radius:999px;background:#e2e8f0;overflow:hidden;}" +
      ".sim-confidence-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#93c5fd 0%,#1147d9 100%);}" +
      ".sim-confidence-meta{display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;align-items:center;}" +
      ".sim-confidence-meta span{font-size:14px;color:#0f172a;font-weight:700;}" +
      ".sim-confidence-meta strong{font-size:14px;color:#1147d9;font-weight:800;}" +
      ".sim-chart-wrap{position:relative;min-height:280px;}" +
      ".sim-chart-wrap canvas{width:100%!important;height:280px!important;}" +
      ".sim-drift-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:12px;}" +
      ".sim-drift-item{padding:12px;border:1px solid #dbe2ea;border-radius:12px;background:#f8fbff;text-align:center;}" +
      ".sim-drift-item span{display:block;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#64748b;margin-bottom:6px;}" +
      ".sim-drift-item strong{font-size:18px;line-height:1.2;color:#0f172a;}" +
      ".sim-drift-total{margin:0;color:#1e293b;}" +
      "@media (max-width: 991px){.sim-enh-grid,.sim-drift-grid{grid-template-columns:1fr;}.sim-chart-wrap{min-height:240px;}.sim-chart-wrap canvas{height:240px!important;}}";
    document.head.appendChild(style);
  }

  function renderFinancialChart(financial) {
    ensureChartJs().then(function () {
      var canvas = document.getElementById("sim-financial-impact-chart");
      if (!canvas || typeof window.Chart === "undefined") return;

      var responseCost = parseMoney(financial.response_cost);
      var lostRevenue = parseMoney(financial.lost_revenue);
      var regulatoryExposure = parseMoney(financial.regulatory_exposure);
      var customerRemediation = parseMoney(financial.customer_remediation_cost);

      var values = [responseCost, lostRevenue, regulatoryExposure, customerRemediation];
      var labels = ["Response Cost", "Lost Revenue", "Regulatory Exposure", "Customer Remediation"];
      var nonZero = values.some(function (v) { return v > 0; });

      if (!nonZero) {
        values = [1];
        labels = ["No breakdown available"];
      }

      if (financialChartInstance) {
        try {
          financialChartInstance.destroy();
        } catch (e) {}
        financialChartInstance = null;
      }

      financialChartInstance = new window.Chart(canvas, {
        type: "doughnut",
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: nonZero
              ? ["#1147d9", "#60a5fa", "#93c5fd", "#dbeafe"]
              : ["#dbeafe"],
            borderColor: "#ffffff",
            borderWidth: 2,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "62%",
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 14,
                color: "#334155",
                font: {
                  family: "Arial",
                  size: 12,
                  weight: "600"
                }
              }
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  var label = context.label || "";
                  var value = context.raw || 0;
                  if (!nonZero) return label;
                  return label + ": " + value.toLocaleString();
                }
              }
            }
          }
        }
      });
    }).catch(function () {});
  }

  function renderDynamicEnhancements(data) {
    if (!summaryWrap) return;

    injectEnhancementStyles();

    var confidencePercent = confidenceToPercent(data.confidence);
    var controlWeaknessHtml = buildControlWeaknessTable(data.control_weakness_map);
    var adversaryProfileHtml = buildAdversaryProfileHtml(data.adversary_profile);
    var driftHtml = buildDriftToFixHtml(data.drift_to_fix);
    var timelineHtml = buildAttackTimelineHtml(data.attack_path);

    var summaryEnhancementsHtml =
      "<div class='sim-enh-grid'>" +
        "<div class='sim-enh-section featured'>" +
          "<h3>Financial Impact Breakdown</h3>" +
          "<div class='sim-chart-wrap'><canvas id='sim-financial-impact-chart'></canvas></div>" +
        "</div>" +
        "<div class='sim-enh-section featured'>" +
          "<h3>Confidence Indicator</h3>" +
          "<div class='sim-confidence-wrap'>" +
            "<div class='sim-confidence-meta'><span>Simulation confidence</span><strong>" + escapeHtml(safeText(data.confidence)) + " • " + confidencePercent + "%</strong></div>" +
            "<div class='sim-confidence-track'><div class='sim-confidence-fill' style='width:" + confidencePercent + "%;'></div></div>" +
            "<p style='margin:10px 0 0;line-height:1.6;color:#64748b;'>This indicates how strongly the scenario aligns to the selected context, structured assumptions, and known attack patterns.</p>" +
          "</div>" +
        "</div>" +
      "</div>" +
      "<div class='sim-enh-section'>" +
        "<h3>Likely Attack Path Timeline</h3>" +
        timelineHtml +
      "</div>";

    var combinedHtml =
      summaryEnhancementsHtml +
      "<div class='sim-enh-grid'>" +
        "<div class='sim-enh-section'>" +
          "<h3>Adversary Profile</h3>" +
          adversaryProfileHtml +
        "</div>" +
        "<div class='sim-enh-section'>" +
          "<h3>Estimated Drift-to-Fix</h3>" +
          driftHtml +
        "</div>" +
      "</div>" +
      "<div class='sim-enh-section'>" +
        "<h3>Control Weakness Map</h3>" +
        controlWeaknessHtml +
      "</div>";

    var existing = document.getElementById("sim-dynamic-visuals");
    if (existing) {
      existing.innerHTML = combinedHtml;
    } else {
      var container = document.createElement("div");
      container.id = "sim-dynamic-visuals";
      container.className = "sim-dynamic-visuals";
      container.innerHTML = combinedHtml;

      var actionsEl = summaryWrap.querySelector(".sim-actions.sim-no-print");
      if (actionsEl && actionsEl.parentNode) {
        actionsEl.parentNode.insertBefore(container, actionsEl);
      } else {
        summaryWrap.appendChild(container);
      }
    }

    renderFinancialChart(data.financial_impact || {});
  }

  function renderReport(data) {
    var scenarioText = getSelectedText(scenarioEl);
    var environmentText = getSelectedText(environmentEl);
    var sectorText = getSelectedText(sectorEl);
    var serviceText = getSelectedText(criticalServiceEl);
    var orgSizeText = getSelectedText(organisationSizeEl);
    var currencyText = getSelectedText(currencyEl);

    var scenarioValue = safeText(scenarioEl && scenarioEl.value, "");
    var environmentValue = safeText(environmentEl && environmentEl.value, "");
    var sectorValue = safeText(sectorEl && sectorEl.value, "");

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

    var confidence = deriveConfidence(data);
    var severity = deriveSeverity(data);
    var likelihood = deriveLikelihood(data, scenarioValue, environmentValue, sectorValue);

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
    var controlWeaknessMap = deriveControlWeaknessMap(data, scenarioValue, environmentValue, sectorValue, serviceText);
    var adversaryProfile = deriveAdversaryProfile(data, scenarioValue, environmentValue, sectorValue);
    var driftToFix = deriveDriftToFix({
      detection_time: detectionTime,
      financial_impact: financial,
      drift_to_fix: data.drift_to_fix
    });

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
      control_weakness_map: controlWeaknessMap,
      adversary_profile: adversaryProfile,
      drift_to_fix: driftToFix,
      raw: data
    };

    setTextById("sim-kpi-scenario", scenarioText);
    setTextById("sim-kpi-environment", environmentText);
    setTextById("sim-kpi-severity", severity);
    setTextById("sim-kpi-confidence", confidence);
    setTextById("sim-kpi-impact", buildImpactKpi(latestSimulationData));
    setTextById("sim-kpi-likelihood", likelihood);

    var severityEl = document.getElementById("sim-kpi-severity");
    if (severityEl) {
      severityEl.className = "sim-kpi-value " + getSeverityClass(severity);
    }

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
    fillList("sim-control-gaps", controlWeaknessMap.map(function (item) {
      return item.domain + ": " + item.weakness;
    }).slice(0, 4), []);
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

    var financialSummary = "Estimated impact: " + buildImpactKpi(latestSimulationData);
    if (latestSimulationData.financial_impact) {
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
    setTextById("sim-report-impact", buildImpactText(latestSimulationData));
    fillList("sim-report-controls", controlWeaknessMap.map(function (item) {
      return item.domain + ": " + item.weakness + " (" + item.risk + ")";
    }), []);
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

    renderDynamicEnhancements(latestSimulationData);

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

      if (!latestSimulationData) {
        showError("There is no summary available to copy yet.");
        return;
      }

      var summaryParts = [
        "Executive Summary",
        latestSimulationData.summary || "",
        "",
        "Board Risk Statement",
        latestSimulationData.board_risk_statement || "",
        "",
        "Estimated Impact",
        buildImpactKpi(latestSimulationData),
        "",
        "Severity: " + safeText(latestSimulationData.severity, "-"),
        "Likelihood: " + safeText(latestSimulationData.likelihood, "-"),
        "Confidence: " + safeText(latestSimulationData.confidence, "-")
      ];

      var text = summaryParts.join("\n");

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
            result.blobUrl ||
            "";

          var shareUrl =
            result.share_url ||
            (blobUrl
              ? "https://www.cybersecurityexpert.co.uk/sim-report?url=" + encodeURIComponent(blobUrl)
              : "");

          if (!shareUrl) {
            throw new Error("Share service did not return a usable share URL.");
          }

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
