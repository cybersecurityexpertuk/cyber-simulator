<style>
  .sim-wrap {
    width: 100%;
    max-width: 1200px;
    margin: 24px auto 56px;
    padding: 0 20px;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
    color: #0f172a;
  }

  .sim-card,
  .sim-report-shell {
    box-sizing: border-box;
    width: 100%;
  }

  .sim-card {
    background: #ffffff;
    border: 1px solid #dbe2ea;
    border-radius: 14px;
    padding: 24px;
    margin-bottom: 20px;
  }

  .sim-section-title {
    font-size: 22px;
    line-height: 1.2;
    font-weight: 800;
    margin: 0 0 18px;
    color: #0f172a;
  }

  .sim-subtitle {
    font-size: 16px;
    line-height: 1.6;
    color: #334155;
    margin: 0 0 6px;
  }

  .sim-note {
    font-size: 14px;
    line-height: 1.6;
    color: #475569;
    margin: 8px 0 0;
  }

  .sim-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 0 0 18px;
  }

  .sim-preset {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    color: #0f172a;
    padding: 10px 12px;
    border-radius: 999px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
  }

  .sim-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .sim-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .sim-field.full {
    grid-column: 1 / -1;
  }

  .sim-label {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
  }

  .sim-help {
    font-size: 12px;
    line-height: 1.5;
    color: #64748b;
  }

  .sim-select {
    width: 100%;
    min-height: 48px;
    padding: 0 14px;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    background: #fff;
    color: #0f172a;
    font-size: 15px;
    box-sizing: border-box;
  }

  .sim-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-top: 18px;
  }

  .sim-button {
    border: 0;
    background: linear-gradient(180deg, #2b6cf6 0%, #1147d9 100%);
    color: #ffffff;
    padding: 13px 18px;
    font-weight: 700;
    cursor: pointer;
    min-width: 180px;
    border-radius: 10px;
    font-size: 15px;
  }

  .sim-link-button {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #0f172a;
    padding: 12px 16px;
    font-weight: 700;
    cursor: pointer;
    border-radius: 10px;
    font-size: 15px;
  }

  .sim-status,
  .sim-error,
  .sim-success {
    border-radius: 12px;
    padding: 16px 18px;
    font-size: 15px;
    line-height: 1.6;
    margin-top: 18px;
  }

  .sim-status {
    background: #f8fafc;
    border: 1px solid #dbe2ea;
  }

  .sim-error {
    background: #fff1f2;
    border: 1px solid #fecdd3;
    color: #9f1239;
  }

  .sim-success {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #166534;
  }

  .sim-progress {
    height: 10px;
    background: #e2e8f0;
    border-radius: 999px;
    overflow: hidden;
    margin: 14px 0 12px;
  }

  .sim-progress-bar {
    width: 8%;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #1147d9 0%, #3b82f6 100%);
    transition: width 0.6s ease;
  }

  .sim-step {
    font-size: 14px;
    color: #64748b;
    margin: 6px 0;
  }

  .sim-step.active {
    color: #0f172a;
    font-weight: 700;
  }

  .sim-step.done {
    color: #166534;
    font-weight: 700;
  }

  .sim-hidden {
    display: none !important;
  }

  .sim-kpis {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 14px;
    margin: 18px 0 6px;
  }

  .sim-kpi {
    border: 1px solid #dbe2ea;
    background: #f8fafc;
    border-radius: 12px;
    padding: 14px;
  }

  .sim-kpi-label {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 8px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .sim-kpi-value {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
  }

  .sim-risk-statement {
    border-left: 4px solid #1147d9;
    background: #f8fbff;
    padding: 14px 16px;
    border-radius: 10px;
    font-size: 15px;
    line-height: 1.7;
    color: #0f172a;
    margin-top: 18px;
  }

  .sim-financial-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-top: 18px;
  }

  .sim-financial-box {
    border: 1px solid #dbe2ea;
    border-radius: 12px;
    padding: 16px;
    background: #fbfdff;
  }

  .sim-financial-label {
    font-size: 12px;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .sim-financial-value {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.4;
  }

  .sim-framework-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-top: 18px;
  }

  .sim-framework-box {
    border: 1px solid #dbe2ea;
    border-radius: 12px;
    padding: 16px;
    background: #fbfdff;
  }

  .sim-framework-title {
    font-size: 13px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 10px;
    text-transform: uppercase;
  }

  .sim-framework-list {
    margin: 0;
    padding-left: 18px;
  }

  .sim-framework-list li {
    margin: 0 0 8px;
    font-size: 14px;
    line-height: 1.5;
    color: #1e293b;
  }

  .sim-summary-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 18px;
  }

  .sim-box {
    border: 1px solid #dbe2ea;
    background: #ffffff;
    border-radius: 12px;
    padding: 18px;
  }

  .sim-box h3 {
    margin: 0 0 12px;
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
  }

  .sim-box p {
    margin: 0;
    font-size: 15px;
    line-height: 1.7;
    color: #1e293b;
  }

  .sim-list {
    margin: 0;
    padding-left: 18px;
  }

  .sim-list li {
    margin: 0 0 10px;
    font-size: 15px;
    line-height: 1.6;
    color: #1e293b;
  }

  .sim-mitre-tag {
    display: inline-block;
    margin-left: 8px;
    padding: 3px 8px;
    border-radius: 999px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    text-decoration: none;
  }

  .sim-report-shell {
    border: 1px solid #dbe2ea;
    border-radius: 16px;
    padding: 28px;
    background: #ffffff;
  }

  .sim-report-logo-wrap {
    margin-bottom: 14px;
  }

  .sim-report-logo {
    display: block;
    width: 100%;
    max-width: 300px;
    height: auto;
  }

  .sim-brand {
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 4px;
  }

  .sim-brand-sub {
    font-size: 14px;
    color: #475569;
    margin-bottom: 18px;
  }

  .sim-rule {
    height: 2px;
    background: #1147d9;
    border-radius: 999px;
    margin: 12px 0 22px;
  }

  .sim-report-title {
    font-size: 38px;
    line-height: 1.1;
    font-weight: 900;
    color: #1147d9;
    margin: 0 0 18px;
  }

  .sim-meta-box {
    border: 1px solid #dbe2ea;
    border-radius: 12px;
    padding: 18px;
    background: #fbfdff;
    margin-bottom: 20px;
  }

  .sim-meta-box p {
    margin: 0 0 8px;
    font-size: 15px;
    line-height: 1.6;
  }

  .sim-report-section {
    margin: 0 0 22px;
  }

  .sim-report-section h3 {
    margin: 0 0 10px;
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
  }

  .sim-report-section p {
    margin: 0;
    font-size: 16px;
    line-height: 1.8;
    color: #1e293b;
  }

  .sim-report-section ol,
  .sim-report-section ul {
    margin-top: 10px;
  }

  .sim-disclaimer {
    border-top: 1px solid #e2e8f0;
    padding-top: 18px;
    margin-top: 28px;
    font-size: 13px;
    line-height: 1.7;
    color: #64748b;
  }

  @media (max-width: 991px) {
    .sim-grid,
    .sim-kpis,
    .sim-financial-grid,
    .sim-framework-grid,
    .sim-summary-grid {
      grid-template-columns: 1fr;
    }

    .sim-report-title {
      font-size: 30px;
    }
  }

  @media (max-width: 767px) {
    .sim-wrap {
      padding: 0 16px;
      margin: 20px auto 40px;
    }
  }

  @media print {
    body * {
      visibility: hidden !important;
    }

    #sim-report-print,
    #sim-report-print * {
      visibility: visible !important;
    }

    #sim-report-print {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      background: #ffffff;
    }

    .sim-no-print {
      display: none !important;
    }

    .sim-report-shell {
      border: 0 !important;
      border-radius: 0 !important;
      padding: 28px !important;
    }
  }
</style>

<div class="sim-wrap">
  <div class="sim-card">
    <h2 class="sim-section-title">Cyber Control Failure Simulator V1.5</h2>
    <p class="sim-subtitle">Explore how control weaknesses can escalate into realistic cyber incidents across environments and services.</p>
    <p class="sim-note">AI-powered simulation with control-failure logic, MITRE attack path mapping, financial impact modelling, framework mapping, evidence prompts and board-ready reporting.</p>

    <div class="sim-presets">
      <button type="button" class="sim-preset" onclick="applyPreset('identity-cloud-finance')">Identity compromise in cloud financial services</button>
      <button type="button" class="sim-preset" onclick="applyPreset('ransomware-onprem-health')">Ransomware in on-prem healthcare</button>
      <button type="button" class="sim-preset" onclick="applyPreset('supplier-saas-retail')">Third-party breach in SaaS retail</button>
      <button type="button" class="sim-preset" onclick="applyPreset('insider-cloud-tech')">Insider misuse in cloud technology</button>
    </div>

    <form id="sim-form">
      <div class="sim-grid">
        <div class="sim-field">
          <label class="sim-label" for="scenario">Scenario</label>
          <div class="sim-help">Type of initiating control failure or attack vector.</div>
          <select id="scenario" name="scenario" class="sim-select" required>
            <option value="">Select scenario</option>
            <option value="identity_compromise">Identity compromise</option>
            <option value="ransomware">Ransomware</option>
            <option value="third_party_breach">Third-party breach</option>
            <option value="insider_misuse">Insider misuse</option>
            <option value="data_exfiltration">Data exfiltration</option>
            <option value="cloud_exposure">Cloud exposure</option>
            <option value="cloud_misconfiguration">Cloud misconfiguration</option>
          </select>
        </div>

        <div class="sim-field">
          <label class="sim-label" for="environment">Environment</label>
          <div class="sim-help">Where the incident primarily occurs.</div>
          <select id="environment" name="environment" class="sim-select" required>
            <option value="">Select environment</option>
            <option value="enterprise_network">Enterprise network</option>
            <option value="cloud">Cloud environment</option>
            <option value="hybrid_infrastructure">Hybrid infrastructure</option>
            <option value="saas_ecosystem">SaaS ecosystem</option>
          </select>
        </div>

        <div class="sim-field">
          <label class="sim-label" for="sector">Sector</label>
          <div class="sim-help">Used to tailor likely impacts and risk context.</div>
          <select id="sector" name="sector" class="sim-select" required>
            <option value="">Select sector</option>
            <option value="financial_services">Financial Services</option>
            <option value="healthcare">Healthcare</option>
            <option value="retail">Retail</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="public_sector">Public Sector</option>
            <option value="technology">Technology</option>
          </select>
        </div>

        <div class="sim-field">
          <label class="sim-label" for="critical-service">Critical service</label>
          <div class="sim-help">Most business-critical service affected. Optional.</div>
          <select id="critical-service" name="critical_service" class="sim-select">
            <option value="">Optional: select critical service</option>
            <option value="identity_platform">Identity platform</option>
            <option value="payments">Payments</option>
            <option value="customer_portal">Customer portal</option>
            <option value="email">Email</option>
            <option value="erp">ERP</option>
            <option value="data_platform">Data platform</option>
          </select>
        </div>

        <div class="sim-field">
          <label class="sim-label" for="organisation-size">Organisation size</label>
          <div class="sim-help">Used for impact scaling. Optional.</div>
          <select id="organisation-size" name="organisation_size" class="sim-select">
            <option value="">Optional: select organisation size</option>
            <option value="small">Small</option>
            <option value="mid_market">Mid-market</option>
            <option value="enterprise">Enterprise</option>
            <option value="global_enterprise">Global enterprise</option>
          </select>
        </div>

        <div class="sim-field">
          <label class="sim-label" for="currency">Currency</label>
          <div class="sim-help">Used for financial impact estimates. Optional.</div>
          <select id="currency" name="currency" class="sim-select">
            <option value="">Optional: select currency</option>
            <option value="GBP">GBP</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>

        <div class="sim-field full">
          <label class="sim-label">Verification</label>
          <div class="sim-help">Cloudflare verification is kept in place to reduce bot abuse and unwanted simulation costs.</div>
          <div id="sim-turnstile" class="cf-turnstile" data-sitekey="0x4AAAAAACpdJk-7fNmgF00W" data-callback="onSimTurnstileSuccess" data-expired-callback="onSimTurnstileExpired" data-error-callback="onSimTurnstileError"></div>
          <input type="hidden" id="sim-turnstile-token" value="">
        </div>
      </div>

      <div class="sim-actions">
        <button id="sim-submit" type="submit" class="sim-button">Run Simulation</button>
        <button id="sim-reset" type="button" class="sim-link-button">Reset</button>
      </div>

      <div class="sim-note">Typical runtime is 20 to 30 seconds. The simulator will show progress while the report is being generated.</div>
    </form>

    <div id="sim-feedback"></div>
  </div>

  <div id="sim-results-summary" class="sim-card sim-hidden">
    <h2 class="sim-section-title">Simulation Summary</h2>

    <div class="sim-kpis">
      <div class="sim-kpi"><div class="sim-kpi-label">Scenario</div><div class="sim-kpi-value" id="sim-kpi-scenario">-</div></div>
      <div class="sim-kpi"><div class="sim-kpi-label">Environment</div><div class="sim-kpi-value" id="sim-kpi-environment">-</div></div>
      <div class="sim-kpi"><div class="sim-kpi-label">Severity</div><div class="sim-kpi-value" id="sim-kpi-severity">-</div></div>
      <div class="sim-kpi"><div class="sim-kpi-label">Confidence</div><div class="sim-kpi-value" id="sim-kpi-confidence">-</div></div>
      <div class="sim-kpi"><div class="sim-kpi-label">Estimated Impact</div><div class="sim-kpi-value" id="sim-kpi-impact">-</div></div>
      <div class="sim-kpi"><div class="sim-kpi-label">Likelihood</div><div class="sim-kpi-value" id="sim-kpi-likelihood">-</div></div>
    </div>

    <div class="sim-risk-statement" id="sim-board-risk-statement">-</div>

    <div class="sim-financial-grid">
      <div class="sim-financial-box"><div class="sim-financial-label">Downtime</div><div class="sim-financial-value" id="sim-financial-downtime">-</div></div>
      <div class="sim-financial-box"><div class="sim-financial-label">Response Cost</div><div class="sim-financial-value" id="sim-financial-response">-</div></div>
      <div class="sim-financial-box"><div class="sim-financial-label">Lost Revenue</div><div class="sim-financial-value" id="sim-financial-revenue">-</div></div>
      <div class="sim-financial-box"><div class="sim-financial-label">Regulatory Exposure</div><div class="sim-financial-value" id="sim-financial-regulatory">-</div></div>
      <div class="sim-financial-box"><div class="sim-financial-label">Customer Remediation</div><div class="sim-financial-value" id="sim-financial-customer">-</div></div>
      <div class="sim-financial-box"><div class="sim-financial-label">Total Estimated Impact</div><div class="sim-financial-value" id="sim-financial-total">-</div></div>
    </div>

    <div class="sim-framework-grid">
      <div class="sim-framework-box"><div class="sim-framework-title">CIS Controls v8</div><ul id="sim-framework-cis" class="sim-framework-list"></ul></div>
      <div class="sim-framework-box"><div class="sim-framework-title">NIST CSF 2.0</div><ul id="sim-framework-nist" class="sim-framework-list"></ul></div>
      <div class="sim-framework-box"><div class="sim-framework-title">ISO/IEC 27002:2022</div><ul id="sim-framework-iso" class="sim-framework-list"></ul></div>
    </div>

    <div class="sim-summary-grid">
      <div class="sim-box"><h3>Board Brief</h3><p id="sim-board-brief">-</p></div>
      <div class="sim-box"><h3>Executive Summary</h3><p id="sim-summary-text">-</p></div>
      <div class="sim-box"><h3>Immediate Focus Areas</h3><ol id="sim-top-actions" class="sim-list"></ol></div>
      <div class="sim-box"><h3>Primary Control Weaknesses</h3><ul id="sim-control-gaps" class="sim-list"></ul></div>
      <div class="sim-box"><h3>MITRE Attack Chain</h3><ol id="sim-attack-chain" class="sim-list"></ol></div>
      <div class="sim-box"><h3>Key Assurance Questions</h3><ul id="sim-questions" class="sim-list"></ul></div>
      <div class="sim-box"><h3>Evidence to Request</h3><ul id="sim-evidence-list" class="sim-list"></ul></div>
      <div class="sim-box"><h3>Detection Opportunity</h3><p id="sim-detection-opportunity">-</p></div>
    </div>

    <div class="sim-actions sim-no-print">
      <button type="button" id="sim-copy-summary" class="sim-link-button">Copy Executive Summary</button>
      <button type="button" id="sim-print-report-top" class="sim-button">Export PDF / Print</button>
      <button type="button" id="sim-share-report" class="sim-link-button">Create Share Link</button>
      <button type="button" id="sim-run-another-top" class="sim-link-button">Run Another Simulation</button>
    </div>
  </div>

  <div id="sim-report-print" class="sim-hidden">
    <div class="sim-report-shell">
      <div class="sim-report-logo-wrap">
        <img class="sim-report-logo" src="https://cdn.prod.website-files.com/69931c3d987f4b7486be3e14/6993698f71254fe8743784fe_provable_header_logo2.png" alt="Provable Cyber Resilience">
      </div>

      <div class="sim-brand">Cybersecurity Expert</div>
      <div class="sim-brand-sub">Provable Cyber Resilience<br>cybersecurityexpert.co.uk</div>
      <div class="sim-rule"></div>
      <h1 class="sim-report-title">Cyber Control Failure Simulation Report</h1>

      <div class="sim-meta-box" id="sim-meta-box"></div>

      <div class="sim-report-section"><h3>Board Risk Statement</h3><p id="sim-report-board-risk-statement">-</p></div>
      <div class="sim-report-section"><h3>Board Brief</h3><p id="sim-report-board-brief">-</p></div>
      <div class="sim-report-section"><h3>Executive Summary</h3><p id="sim-report-summary">-</p></div>
      <div class="sim-report-section"><h3>Severity</h3><p id="sim-report-severity">-</p></div>
      <div class="sim-report-section"><h3>Financial Impact Overview</h3><p id="sim-report-financial-impact">-</p></div>
      <div class="sim-report-section"><h3>Likely Attack Path</h3><ol id="sim-report-attack-path" class="sim-list"></ol></div>
      <div class="sim-report-section"><h3>Weak Signals and Early Indicators</h3><ul id="sim-report-weak-signals" class="sim-list"></ul></div>
      <div class="sim-report-section"><h3>Business Impact</h3><p id="sim-report-impact">-</p></div>
      <div class="sim-report-section"><h3>Primary Failed or Weak Controls</h3><ul id="sim-report-controls" class="sim-list"></ul></div>

      <div class="sim-report-section">
        <h3>Control Framework References</h3>
        <p><strong>CIS Controls v8:</strong> <span id="sim-report-framework-cis">-</span></p>
        <p><strong>NIST CSF 2.0:</strong> <span id="sim-report-framework-nist">-</span></p>
        <p><strong>ISO/IEC 27002:2022:</strong> <span id="sim-report-framework-iso">-</span></p>
      </div>

      <div class="sim-report-section"><h3>Immediate Response Priorities</h3><ol id="sim-report-actions" class="sim-list"></ol></div>
      <div class="sim-report-section"><h3>Evidence to Request</h3><ul id="sim-report-evidence" class="sim-list"></ul></div>
      <div class="sim-report-section"><h3>Incident Timeline</h3><ul id="sim-report-timeline" class="sim-list"></ul></div>
      <div class="sim-report-section"><h3>Detection Opportunity</h3><p id="sim-report-detection">-</p></div>
      <div class="sim-report-section"><h3>Estimated Detection Time</h3><p id="sim-report-detection-time">-</p></div>
      <div class="sim-report-section"><h3>Key Assurance Questions</h3><ul id="sim-report-questions" class="sim-list"></ul></div>
      <div class="sim-report-section"><h3>Assurance Insight</h3><p id="sim-report-insight">-</p></div>
      <div class="sim-report-section"><h3>Confidence Rating</h3><p id="sim-report-confidence">-</p></div>
      <div class="sim-report-section"><h3>Conclusion</h3><p id="sim-report-conclusion">-</p></div>

      <div class="sim-disclaimer">
        This simulation is AI-generated for insight and discussion. It is not a substitute for a formal threat model, incident analysis, or assurance review.
        <br><br>
        Generated by the Cyber Control Failure Simulator
        <br>
        AI Labs – cybersecurityexpert.co.uk
      </div>
    </div>
  </div>
</div>

<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script src="https://cyber-simulator-eight.vercel.app/simulator.js"></script>
