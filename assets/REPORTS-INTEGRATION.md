# Reports integration

Place the following HTML snippet inside `index.html` where the Reports section should appear (for example, replace or insert inside the existing Reports section). Then include the script near the end of the body: `<script src="assets/reports.js"></script>`.

````html
<!-- Reports section (insert or replace inside your existing reports area) -->
<div id="reports" class="section">
  <div class="card">
    <h2 class="card-title"><i class="fas fa-file-alt"></i> Reports</h2>

    <div class="grid-2">
      <div>
        <h3>Generate Report</h3>
        <p>Generate reports on-platform (preview) or download CSV. Reports will be generated even if there is no data.</p>

        <div style="display:flex; gap:8px; margin-bottom:12px;">
          <div style="flex:1;">
            <label class="form-label">Report</label>
            <select id="reportSelector" class="form-select"></select>
          </div>
          <div>
            <label class="form-label">Cycle</label>
            <select id="reportCycle" class="form-select"><option value="">All cycles</option></select>
          </div>
        </div>

        <div style="display:flex; gap:8px; margin-bottom:12px;">
          <div style="flex:1;">
            <label class="form-label">Start Date</label>
            <input type="date" id="reportStart" class="form-input">
          </div>
          <div style="flex:1;">
            <label class="form-label">End Date</label>
            <input type="date" id="reportEnd" class="form-input">
          </div>
        </div>

        <div style="display:flex; gap:8px; margin-bottom:12px;">
          <button id="previewReportBtn" class="btn btn-info"><i class="fas fa-eye"></i> Preview</button>
          <button id="downloadReportBtn" class="btn btn-primary"><i class="fas fa-download"></i> Download CSV</button>
          <button id="printReportBtn" class="btn btn-secondary"><i class="fas fa-print"></i> Print</button>
        </div>

        <div style="margin-top:8px;">
          <small style="color:#666;">Tip: data is pulled from localStorage keys <code>investors</code>, <code>attendance</code>, and <code>cycles</code>. You can replace data sources in <code>assets/reports.js</code> to call your API.</small>
        </div>
      </div>

      <div>
        <h3>Last-generated</h3>
        <div id="lastReportInfo" style="background:#f8f9fa; padding:15px; border-radius:8px;">
          <div><strong>None yet</strong></div>
          <div id="lastReportMeta" style="font-size:0.9rem; color:#666; margin-top:8px;"></div>
        </div>
      </div>
    </div>

    <hr style="margin:18px 0;">
    <h3>Inline Preview</h3>
    <div id="reportPreviewContainer" style="max-height:400px; overflow:auto; background:white; padding:12px; border-radius:8px; border:1px solid #eee;">
      <div style="color:#666; text-align:center; padding:30px;" id="reportEmptyState">No report generated yet</div>
      <div id="reportPreview" style="display:none;"></div>
    </div>
  </div>
</div>

<!-- Report preview modal (will be shown by JS) -->
<div id="reportModal" class="modal" aria-hidden="true">
  <div class="modal-content">
    <button class="modal-close" id="reportModalClose">&times;</button>
    <h3 id="reportModalTitle"></h3>
    <div id="reportModalBody" style="margin-top:12px;"></div>
    <div style="margin-top:16px; text-align:right;">
      <button class="btn btn-secondary" id="modalDownloadCsv"><i class="fas fa-download"></i> Download CSV</button>
      <button class="btn btn-primary" id="modalCloseBtn">Close</button>
    </div>
  </div>
</div>
````

## How to seed demo data

Open browser devtools console and run:

```
localStorage.setItem('investors', JSON.stringify([{Name:'Alice',Investment:'10000',Date:'2026-01-03',Notes:'Seed investor'}]));
localStorage.setItem('attendance', JSON.stringify([{Date:'2026-01-03',Worker:'John Doe',Status:'Present',Notes:''}]));
localStorage.setItem('cycles', JSON.stringify([{id:'c1',name:'North Field Block A'}]));
```

Then reload the page and visit the Reports section. Preview a report and download CSV.
