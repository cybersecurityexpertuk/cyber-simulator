(function () {
  var financialChartInstance = null;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normaliseText(value) {
    return String(value || "")
      .replace(/Â£/g, "£")
      .replace(/â€‘/g, "-")
      .replace(/â€“/g, "–")
      .replace(/â€”/g, "—")
      .replace(/â€™/g, "’")
      .replace(/â€œ/g, "“")
      .replace(/â€\x9d/g, "”");
  }

  function safeText(value, fallback) {
    if (fallback === undefined) fallback = "-";
    if (value === null || value === undefined || value === "") return fallback;
    return normaliseText(String(value));
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function parseHourEstimate(value) {
    var text = safeText(value, "").toLowerCase().trim();
    if (!text) return 0;

    var rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
    }

    var numberMatch = text.match(/(\d+(?:\.\d+)?)/);
    if (!numberMatch) return 0;

    var num = parseFloat(numberMatch[1]);
    if (isNaN(num)) return 0;

    if (text.indexOf("day") !== -1) return num * 24;
    if (text.indexOf("week") !== -1) return num * 168;
    return num;
  }

  function formatHoursAsLabel(hours) {
    hours = Math.max(0, Math.round(hours));
    if (hours >= 48) {
      var days = (hours / 24).toFixed(hours % 24 === 0 ? 0 : 1);
      return days + " days";
    }
    return hours + " hours";
  }

  function badgeClass(value) {
    var v = safeText(value, "").toLowerCase();
    if (v === "critical") return "critical";
    if (v === "high") return "high";
    if (v === "moderate") return "moderate";
    if (v === "medium") return "moderate";
    if (v === "low") return "low";
    return "moderate";
  }

  function parseMoney(value) {
    var raw = safeText(value, "");
    if (!raw) return 0;
    var cleaned = raw.replace(/[^0-9.-]/g, "");
    var parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  function confidenceToPercent(value) {
    var v = safeText(value, "").toLowerCase();
    if (v === "critical") return 90;
    if (v === "high") return 78;
    if (v === "moderate" || v === "medium") return 58;
    if (v === "low") return 36;
    var n = parseFloat(v);
    if (!isNaN(n)) return Math.max(0, Math.min(100, n));
    return 60;
  }

  function makeParagraph(value) {
    return "<p>" + escapeHtml(safeText(value)) + "</p>";
  }

  function makeKpi(value, subText) {
    return (
      '<div class="shared-kpi">' + escapeHtml(safeText(value)) + "</div>" +
      (subText ? '<div class="shared-kpi-sub">' + escapeHtml(subText) + "</div>" : "")
    );
  }

  function makeBadge(value) {
    return '<span class="shared-badge ' + badgeClass(value) + '">' + escapeHtml(safeText(value)) + "</span>";
  }

  function renderMitre(item) {
    var mitreText = safeText(item.mitre, "");
    if (!mitreText) return "";
    return '<div class="shared-timeline-mitre">MITRE: ' + escapeHtml(mitreText) + "</div>";
  }

  function listHtml(items) {
    if (!Array.isArray(items) || !items.length) {
      return "<p>-</p>";
    }

    var html = '<ul class="shared-list">';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (typeof item === "object" && item) {
        html += "<li>" + escapeHtml(JSON.stringify(item)) + "</li>";
      } else {
        html += "<li>" + escapeHtml(safeText(item, "")) + "</li>";
      }
    }
    html += "</ul>";
    return html;
  }

  function buildTimelineHtml(items) {
    if (!Array.isArray(items) || !items.length) {
      return "<p>No attack path was generated for this simulation.</p>";
    }

    var html = '<div class="shared-timeline">';
    for (var i = 0; i < items.length; i++) {
      var item = items[i] || {};
      html +=
        '<div class="shared-timeline-step">' +
          '<div class="shared-timeline-phase">' + escapeHtml(safeText(item.phase, "Phase " + (i + 1))) + "</div>" +
          '<div class="shared-timeline-text">' + escapeHtml(safeText(item.step, "")) + "</div>" +
          renderMitre(item) +
        "</div>";
    }
    html += "</div>";
    return html;
  }

  function buildDriftHtml(drift) {
    var detect = parseHourEstimate(drift && drift.detect);
    var contain = parseHourEstimate(drift && drift.contain);
    var recover = parseHourEstimate(drift && drift.recover);
    var verify = parseHourEstimate(drift && drift.verify);

    if (!detect && !contain && !recover && !verify) {
      return "<p>No drift-to-fix estimate was available.</p>";
    }

    var total = detect + contain + recover + verify;

    return (
      '<div class="shared-drift-grid">' +
        '<div class="shared-drift-item"><span>Detect</span><strong>' + escapeHtml(formatHoursAsLabel(detect)) + "</strong></div>" +
        '<div class="shared-drift-item"><span>Contain</span><strong>' + escapeHtml(formatHoursAsLabel(contain)) + "</strong></div>" +
        '<div class="shared-drift-item"><span>Recover</span><strong>' + escapeHtml(formatHoursAsLabel(recover)) + "</strong></div>" +
        '<div class="shared-drift-item"><span>Verify</span><strong>' + escapeHtml(formatHoursAsLabel(verify)) + "</strong></div>" +
      "</div>" +
      '<p class="shared-drift-total"><strong>Estimated Drift-to-Fix:</strong> ' + escapeHtml(formatHoursAsLabel(total)) + "</p>"
    );
  }

  function buildRiskPill(value) {
    var cls = badgeClass(value);
    return '<span class="shared-risk-pill ' + cls + '">' + escapeHtml(safeText(value)) + "</span>";
  }

  function buildWeaknessTable(items) {
    if (!Array.isArray(items) || !items.length) {
      return "<p>No control weakness mapping was generated.</p>";
    }

    var html =
      '<div class="shared-table-wrap">' +
      '<table class="shared-table">' +
      "<thead><tr><th>Control domain</th><th>Weakness</th><th>Risk</th></tr></thead><tbody>";

    for (var i = 0; i < items.length; i++) {
      var item = items[i] || {};
      html +=
        "<tr>" +
          "<td>" + escapeHtml(safeText(item.domain)) + "</td>" +
          "<td>" + escapeHtml(safeText(item.weakness)) + "</td>" +
          "<td>" + buildRiskPill(item.risk) + "</td>" +
        "</tr>";
    }

    html += "</tbody></table></div>";
    return html;
  }

  function buildAdversaryHtml(profile) {
    if (!profile || typeof profile !== "object") {
      return "<p>No adversary profile was generated.</p>";
    }

    return (
      "<p><strong>Likely actor:</strong> " + escapeHtml(safeText(profile.likely_actor)) + "</p>" +
      "<p><strong>Motivation:</strong> " + escapeHtml(safeText(profile.motivation)) + "</p>" +
      "<p><strong>Typical entry methods:</strong></p>" +
      listHtml(safeArray(profile.typical_entry_methods)) +
      "<p><strong>Likely behaviours:</strong></p>" +
      listHtml(safeArray(profile.typical_behaviours))
    );
  }

  function getShareData(data) {
    var pageUrl = window.location.href;
    var scenario = safeText(data.scenario_text, "Cyber incident");
    var environment = safeText(data.environment_text, "Production environment");
    var sector = safeText(data.sector_text, "Organisation");
    var siteName = "Cybersecurity Expert";
    var siteUrl = "https://www.cybersecurityexpert.co.uk/";
    var pageTitle = "Cyber Control Failure Impact Report";
    var shortText =
      "Review this shared " +
      scenario.toLowerCase() +
      " simulation report from " +
      siteName +
      ". Explore the Cyber Control Failure Simulator at " +
      siteUrl;

    var emailBody =
      "I wanted to share this Cyber Control Failure Impact Report with you.\n\n" +
      "Scenario: " + scenario + "\n" +
      "Environment: " + environment + "\n" +
      "Sector: " + sector + "\n\n" +
      "View the report here:\n" + pageUrl + "\n\n" +
      "Created using the Cyber Control Failure Simulator at Cybersecurity Expert:\n" +
      siteUrl;

    return {
      pageUrl: pageUrl,
      pageTitle: pageTitle,
      shareText: shortText,
      emailUrl:
        "mailto:?subject=" +
        encodeURIComponent(pageTitle + " | Cybersecurity Expert") +
        "&body=" +
        encodeURIComponent(emailBody),
      linkedinUrl:
        "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(pageUrl),
      xUrl:
        "https://twitter.com/intent/tweet?text=" +
        encodeURIComponent(shortText) +
        "&url=" +
        encodeURIComponent(pageUrl),
      facebookUrl:
        "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(pageUrl),
      whatsappUrl:
        "https://wa.me/?text=" + encodeURIComponent(shortText + " " + pageUrl)
    };
  }

  function showShareFeedback(message, isError) {
    var feedback = document.getElementById("shared-share-feedback");
    if (!feedback) return;
    feedback.style.display = "block";
    feedback.style.color = isError ? "#9f1239" : "#166534";
    feedback.textContent = message;
  }

  function fallbackCopyText(text) {
    var textarea = document.createElement("textarea");
    textarea.className = "shared-hidden-copy";
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      var successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      return successful;
    } catch (e) {
      document.body.removeChild(textarea);
      return false;
    }
  }

  function setupShareBar(data) {
    var shareBar = document.getElementById("shared-sharebar");
    var copyBtn = document.getElementById("shared-copy-url");
    var nativeBtn = document.getElementById("shared-native-share");
    var emailLink = document.getElementById("shared-email-link");
    var linkedinLink = document.getElementById("shared-linkedin-link");
    var xLink = document.getElementById("shared-x-link");
    var facebookLink = document.getElementById("shared-facebook-link");
    var whatsappLink = document.getElementById("shared-whatsapp-link");

    if (!shareBar) return;

    var share = getShareData(data);

    emailLink.href = share.emailUrl;
    linkedinLink.href = share.linkedinUrl;
    xLink.href = share.xUrl;
    facebookLink.href = share.facebookUrl;
    whatsappLink.href = share.whatsappUrl;

    copyBtn.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(share.pageUrl)
          .then(function () {
            showShareFeedback("Report URL copied. You can now share the report and point people back to Cybersecurity Expert.", false);
          })
          .catch(function () {
            if (fallbackCopyText(share.pageUrl)) {
              showShareFeedback("Report URL copied. You can now share the report and point people back to Cybersecurity Expert.", false);
            } else {
              showShareFeedback("Could not copy automatically. Please copy the URL from your browser address bar.", true);
            }
          });
      } else {
        if (fallbackCopyText(share.pageUrl)) {
          showShareFeedback("Report URL copied. You can now share the report and point people back to Cybersecurity Expert.", false);
        } else {
          showShareFeedback("Could not copy automatically. Please copy the URL from your browser address bar.", true);
        }
      }
    });

    if (navigator.share) {
      nativeBtn.style.display = "inline-flex";
      nativeBtn.addEventListener("click", function () {
        navigator.share({
          title: share.pageTitle,
          text: share.shareText,
          url: share.pageUrl
        }).catch(function () {});
      });
    }

    shareBar.style.display = "flex";
  }

  function renderReport(data) {
    var contentEl = document.getElementById("shared-report-content");
    if (!contentEl) return;

    var financial = data.financial_impact || {};
    var confidencePercent = confidenceToPercent(data.confidence);

    contentEl.innerHTML =
      '<div class="shared-summary-strip">' +
        '<div class="shared-summary-card">' +
          '<div class="shared-summary-label">Estimated Impact</div>' +
          '<div class="shared-summary-value">' + escapeHtml(safeText(financial.total_estimated_impact)) + "</div>" +
          '<div class="shared-summary-sub">Combined estimated financial effect</div>' +
        "</div>" +
        '<div class="shared-summary-card">' +
          '<div class="shared-summary-label">Severity</div>' +
          '<div class="shared-summary-value">' + escapeHtml(safeText(data.severity)) + "</div>" +
          '<div class="shared-summary-sub">Scenario intensity assessment</div>' +
        "</div>" +
        '<div class="shared-summary-card">' +
          '<div class="shared-summary-label">Likelihood</div>' +
          '<div class="shared-summary-value">' + escapeHtml(safeText(data.likelihood)) + "</div>" +
          '<div class="shared-summary-sub">Estimated plausibility in context</div>' +
        "</div>" +
        '<div class="shared-summary-card">' +
          '<div class="shared-summary-label">Detection Time</div>' +
          '<div class="shared-summary-value">' + escapeHtml(safeText(data.detection_time)) + "</div>" +
          '<div class="shared-summary-sub">Estimated time to identify the issue</div>' +
        "</div>" +
      "</div>" +

      '<div class="shared-meta">' +
        '<div class="shared-meta-grid">' +
          '<p><span class="shared-meta-label">Report ID:</span> ' + escapeHtml(safeText(data.report_id)) + "</p>" +
          '<p><span class="shared-meta-label">Generated:</span> ' + escapeHtml(safeText(data.generated_at)) + "</p>" +
          '<p><span class="shared-meta-label">Scenario:</span> ' + escapeHtml(safeText(data.scenario_text)) + "</p>" +
          '<p><span class="shared-meta-label">Environment:</span> ' + escapeHtml(safeText(data.environment_text)) + "</p>" +
          '<p><span class="shared-meta-label">Sector:</span> ' + escapeHtml(safeText(data.sector_text)) + "</p>" +
          '<p><span class="shared-meta-label">Critical Service:</span> ' + escapeHtml(safeText(data.critical_service_text)) + "</p>" +
          '<p><span class="shared-meta-label">Organisation Size:</span> ' + escapeHtml(safeText(data.organisation_size_text)) + "</p>" +
          '<p><span class="shared-meta-label">Currency:</span> ' + escapeHtml(safeText(data.currency_text)) + "</p>" +
        "</div>" +
      "</div>" +

      '<div class="shared-risk">' +
        escapeHtml(safeText(data.board_risk_statement)) +
      "</div>" +

      '<div class="shared-viz-grid">' +
        '<div class="shared-viz-card">' +
          "<h3>Financial Impact Breakdown</h3>" +
          '<div class="shared-chart-wrap"><canvas id="shared-financial-chart"></canvas></div>' +
        "</div>" +
        '<div class="shared-viz-card">' +
          "<h3>Confidence Indicator</h3>" +
          '<div class="shared-meter-label-row">' +
            '<div class="shared-meter-title">Simulation confidence</div>' +
            '<div class="shared-meter-value">' + escapeHtml(safeText(data.confidence)) + " • " + confidencePercent + "%</div>" +
          "</div>" +
          '<div class="shared-meter-track"><div class="shared-meter-fill" style="width:' + confidencePercent + '%;"></div></div>' +
          '<div class="shared-meter-note">This indicates how strongly the generated scenario aligns to the selected context, known attack patterns, and the structured assumptions used in the simulation.</div>' +
        "</div>" +
      "</div>" +

      '<div class="shared-viz-card" style="margin-bottom:18px;">' +
        "<h3>Likely Attack Path</h3>" +
        buildTimelineHtml(data.attack_path) +
      "</div>" +

      '<div class="shared-grid">' +
        '<div class="shared-box"><h3>Board Brief</h3>' + makeParagraph(data.board_brief) + "</div>" +
        '<div class="shared-box"><h3>Executive Summary</h3>' + makeParagraph(data.summary) + "</div>" +

        '<div class="shared-box featured"><h3>Severity</h3><p>' + makeBadge(data.severity) + "</p></div>" +
        '<div class="shared-box featured"><h3>Likelihood</h3><p>' + makeBadge(data.likelihood) + "</p></div>" +
        '<div class="shared-box featured"><h3>Confidence</h3><p>' + makeBadge(data.confidence) + "</p></div>" +
        '<div class="shared-box featured"><h3>Estimated Impact</h3>' + makeKpi(financial.total_estimated_impact) + "</div>" +

        '<div class="shared-box"><h3>Response Cost</h3>' + makeKpi(financial.response_cost) + "</div>" +
        '<div class="shared-box"><h3>Lost Revenue</h3>' + makeKpi(financial.lost_revenue) + "</div>" +
        '<div class="shared-box"><h3>Regulatory Exposure</h3>' + makeKpi(financial.regulatory_exposure) + "</div>" +
        '<div class="shared-box"><h3>Customer Remediation</h3>' + makeKpi(financial.customer_remediation_cost) + "</div>" +
        '<div class="shared-box"><h3>Downtime</h3>' + makeKpi(financial.downtime_hours, "Estimated operational impact window") + "</div>" +
        '<div class="shared-box"><h3>Business Impact</h3>' + makeParagraph(data.business_impact) + "</div>" +

        '<div class="shared-box wide"><h3>Immediate Actions</h3>' + listHtml(data.priority_actions) + "</div>" +
        '<div class="shared-box wide"><h3>Evidence to Request</h3>' + listHtml(data.evidence_to_request) + "</div>" +
        '<div class="shared-box"><h3>Weak Signals and Early Indicators</h3>' + listHtml(data.weak_signals) + "</div>" +
        '<div class="shared-box"><h3>Detection Opportunity</h3>' + makeParagraph(data.detection_opportunity) + "</div>" +
        '<div class="shared-box wide"><h3>Key Assurance Questions</h3>' + listHtml(data.assurance_questions) + "</div>" +
        '<div class="shared-box"><h3>Assurance Insight</h3>' + makeParagraph(data.assurance_insight) + "</div>" +
        '<div class="shared-box"><h3>Adversary Profile</h3>' + buildAdversaryHtml(data.adversary_profile) + "</div>" +
        '<div class="shared-box"><h3>Estimated Drift-to-Fix</h3>' + buildDriftHtml(data.drift_to_fix) + "</div>" +
        '<div class="shared-box wide"><h3>Control Weakness Map</h3>' + buildWeaknessTable(data.control_weakness_map) + "</div>" +
        '<div class="shared-box wide"><h3>Conclusion</h3>' + makeParagraph(data.conclusion) + "</div>" +
      "</div>" +

      '<div class="shared-disclaimer">' +
        "<strong>Generated by the Cyber Control Failure Simulator V1.0</strong><br>" +
        "Cybersecurity Expert • Provable Cyber Resilience • cybersecurityexpert.co.uk<br>" +
        "This simulation is AI-generated for insight and discussion. It is not a substitute for a formal threat model, incident analysis, or assurance review." +
      "</div>";

    renderFinancialChart(financial);
  }

  function renderFinancialChart(financial) {
    var canvas = document.getElementById("shared-financial-chart");
    if (!canvas || typeof Chart === "undefined") return;

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
      financialChartInstance.destroy();
    }

    financialChartInstance = new Chart(canvas, {
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
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    return Promise.race([
      fetch(url, options || {}),
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error("The shared report request timed out."));
        }, timeoutMs || 15000);
      })
    ]);
  }

  var statusEl = document.getElementById("shared-report-status");
  var params = new URLSearchParams(window.location.search);
  var url = params.get("url");

  if (!url) {
    statusEl.className = "shared-error";
    statusEl.innerHTML = "<strong>Missing report link.</strong><br>No report URL was provided.";
    return;
  }

  fetchWithTimeout(url, {}, 15000)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Unable to load the shared report.");
      }
      return response.json();
    })
    .then(function (payload) {
      var data = null;

      if (payload && payload.data && typeof payload.data === "object") {
        data = payload.data;
      } else if (payload && typeof payload === "object") {
        data = payload;
      }

      if (!data) {
        throw new Error("The shared report format is invalid.");
      }

      if (statusEl) {
        statusEl.style.display = "none";
      }

      setupShareBar(data);
      renderReport(data);
    })
    .catch(function (error) {
      if (statusEl) {
        statusEl.className = "shared-error";
        statusEl.style.display = "block";
        statusEl.innerHTML =
          "<strong>Failed to load report.</strong><br>" +
          escapeHtml(error.message || "Unknown error");
      }
    });
})();
