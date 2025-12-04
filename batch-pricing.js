import { ADJUSTMENTS, getLTVTier, getIncomeWaiverTier } from './llpm-data.js';

// ============= UTILITY FUNCTIONS =============

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function fmtMoney(n) {
  if (n == null || isNaN(n)) return '$0';
  const abs = Math.abs(n);
  const prefix = n < 0 ? '-$' : '$';
  return prefix + abs.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtPercent(n, decimals = 3) {
  if (n == null || isNaN(n)) return '0.000%';
  return n.toFixed(decimals) + '%';
}

function fmtPoints(n) {
  if (n == null || isNaN(n)) return '0.000';
  return n.toFixed(3);
}

function parseMoney(str) {
  if (typeof str === 'number') return str;
  return parseFloat(String(str).replace(/[$,]/g, '')) || 0;
}

function parsePercent(str) {
  if (typeof str === 'number') return str;
  return parseFloat(String(str).replace(/%/g, '')) || 0;
}

// ============= PAYMENT CALCULATION =============

/**
 * Calculate monthly payment for a 30-year fixed mortgage
 * @param {number} principal - Loan amount
 * @param {number} annualRate - Annual interest rate (as percentage, e.g., 6.5 for 6.5%)
 * @param {number} years - Loan term in years (default 30)
 * @returns {number} Monthly payment
 */
function calculateMonthlyPayment(principal, annualRate, years = 30) {
  if (principal <= 0 || annualRate <= 0) return 0;

  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;

  // P = L[c(1 + c)^n]/[(1 + c)^n - 1]
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                  (Math.pow(1 + monthlyRate, numPayments) - 1);

  return payment;
}

// ============= LLPM CALCULATIONS =============

/**
 * Calculate LLPM adjustments for a single borrower
 */
function calculateLLPMAdjustments(borrowerData, globalInputs) {
  const adjustments = [];
  let totalAdjustments = 0;

  // Get the correct adjustments for the selected loan program
  const loanProgram = globalInputs.newLoanProgram || borrowerData.loanProgram || 'Conventional';
  const programAdjustments = ADJUSTMENTS[loanProgram] || ADJUSTMENTS.Conventional;

  // Calculate LTV
  const ltv = borrowerData.propertyValue > 0 ? (borrowerData.loanAmount / borrowerData.propertyValue) * 100 : 0;
  const ltvTier = getLTVTier(ltv);

  // LTV adjustments
  const ltvAdj = programAdjustments.ltv[ltvTier] || 0;
  if (ltvAdj !== 0) {
    adjustments.push({
      name: `LTV ${ltvTier}`,
      points: ltvAdj,
      reason: 'Loan-to-value adjustment'
    });
    totalAdjustments += ltvAdj;
  }

  // Credit Score
  const creditScore = borrowerData.creditScore;
  const creditScoreAdj = programAdjustments.creditScore[creditScore] || 0;
  if (creditScoreAdj !== 0) {
    adjustments.push({
      name: `Credit ${creditScore}`,
      points: creditScoreAdj,
      reason: 'Credit score tier adjustment'
    });
    totalAdjustments += creditScoreAdj;
  }

  // Product Type
  const productType = borrowerData.productType || 'Fixed';
  const productTypeAdj = programAdjustments.productType[productType] || 0;
  if (productTypeAdj !== 0) {
    adjustments.push({
      name: `Product ${productType}`,
      points: productTypeAdj,
      reason: 'Product type adjustment'
    });
    totalAdjustments += productTypeAdj;
  }

  // Occupancy
  const occupancy = borrowerData.occupancy || 'Primary';
  const occupancyAdj = programAdjustments.occupancy[occupancy] || 0;
  if (occupancyAdj !== 0) {
    adjustments.push({
      name: `Occupancy ${occupancy}`,
      points: occupancyAdj,
      reason: 'Occupancy type adjustment'
    });
    totalAdjustments += occupancyAdj;
  }

  // Refinance Type
  const refinanceType = globalInputs.newRefinanceType || 'RateTerm';
  const refinanceTypeAdj = programAdjustments.refinanceType[refinanceType] || 0;
  if (refinanceTypeAdj !== 0) {
    adjustments.push({
      name: `Refi ${refinanceType}`,
      points: refinanceTypeAdj,
      reason: 'Refinance type adjustment'
    });
    totalAdjustments += refinanceTypeAdj;
  }

  // Property Type
  const propertyType = borrowerData.propertyType || '';
  if (propertyType.toLowerCase().includes('condo')) {
    const condoAdj = programAdjustments.propertyType.Condo;
    adjustments.push({
      name: 'Condo',
      points: condoAdj,
      reason: 'Condo property adjustment'
    });
    totalAdjustments += condoAdj;
  }
  if (propertyType.toLowerCase().includes('manufactured')) {
    const mfhAdj = programAdjustments.propertyType.ManufacturedHome;
    adjustments.push({
      name: 'Manufactured Home',
      points: mfhAdj,
      reason: 'Manufactured home adjustment'
    });
    totalAdjustments += mfhAdj;
  }

  // Units (default to 1 if not specified)
  const units = borrowerData.units || '1';
  const unitsAdj = programAdjustments.units[units] || 0;
  if (unitsAdj !== 0) {
    adjustments.push({
      name: `${units} Unit${units !== '1' ? 's' : ''}`,
      points: unitsAdj,
      reason: 'Number of units adjustment'
    });
    totalAdjustments += unitsAdj;
  }

  // LLPA Waiver (HomeReady) - offsets total adjustments
  if (globalInputs.homeReadyEligible && totalAdjustments > 0) {
    const waiverCredit = -totalAdjustments;
    adjustments.push({
      name: 'HomeReady® Waiver',
      points: waiverCredit,
      reason: 'HomeReady program credit'
    });
    totalAdjustments += waiverCredit;
  }

  return { adjustments, totalAdjustments, ltv };
}

/**
 * Calculate final pricing for a borrower
 */
function calculateBorrowerPricing(borrowerData, globalInputs) {
  const { adjustments, totalAdjustments, ltv } = calculateLLPMAdjustments(borrowerData, globalInputs);

  const baseRate = globalInputs.baseRate;
  const startingPoints = globalInputs.startingPoints;
  const finalPoints = startingPoints + totalAdjustments;
  const adjustedRate = baseRate; // Rate stays the same, points change the cost
  const pointCost = borrowerData.loanAmount * (finalPoints / 100);

  // Calculate current rate from current payment (reverse mortgage calculation)
  // This is an approximation - solving for rate from payment is complex
  const currentRate = estimateRateFromPayment(borrowerData.loanAmount, borrowerData.currentPayment || 0);

  // Calculate new payment with adjusted rate (points affect cost, not rate for display purposes)
  // But in reality, if they pay points, they might get a lower rate. For now, we show the base rate.
  const newPayment = calculateMonthlyPayment(borrowerData.loanAmount, adjustedRate);
  const currentPayment = borrowerData.currentPayment || 0;
  const paymentDiff = newPayment - currentPayment;

  // Calculate break-even months
  // If pointCost is positive (cost to borrower) and they're saving money (negative paymentDiff)
  const breakEvenMonths = (pointCost > 0 && paymentDiff < 0)
    ? Math.abs(pointCost / paymentDiff)
    : null;

  return {
    clientName: borrowerData.clientName,
    propertyValue: borrowerData.propertyValue,
    loanAmount: borrowerData.loanAmount,
    income: borrowerData.income,
    zipCode: borrowerData.zipCode,
    creditScore: borrowerData.creditScore,
    currentLoanProgram: borrowerData.loanProgram,
    ltv: ltv,
    currentRate: currentRate,
    currentPayment: currentPayment,
    adjustedRate: adjustedRate,
    newPayment: newPayment,
    paymentDiff: paymentDiff,
    totalAdjustments: totalAdjustments,
    finalPoints: finalPoints,
    pointCost: pointCost,
    breakEvenMonths: breakEvenMonths,
    adjustments: adjustments,
    // Store original data for reference
    originalData: borrowerData
  };
}

/**
 * Estimate current rate from payment using Newton's method
 */
function estimateRateFromPayment(principal, payment, years = 30) {
  if (principal <= 0 || payment <= 0) return 0;

  // Newton's method to solve for rate
  let rate = 6.0; // Starting guess
  const tolerance = 0.001;
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
    const calculatedPayment = calculateMonthlyPayment(principal, rate, years);
    const diff = calculatedPayment - payment;

    if (Math.abs(diff) < tolerance) {
      return rate;
    }

    // Adjust rate based on difference
    if (diff > 0) {
      rate -= 0.01; // Payment too high, lower rate
    } else {
      rate += 0.01; // Payment too low, raise rate
    }

    // Prevent negative rates
    if (rate < 0) rate = 0.1;
  }

  return rate;
}

// ============= FILE PARSING =============

let uploadedData = [];
let columnMapping = {};
let detectedColumns = [];

/**
 * Parse CSV file
 */
function parseCSV(text) {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) throw new Error('File is empty');

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });
      rows.push(row);
    }
  }

  return { headers, rows };
}

/**
 * Parse Excel file using SheetJS
 */
function parseExcel(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

  if (data.length === 0) throw new Error('File is empty');

  const headers = data[0].map(h => String(h || '').trim());
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i].length === 0) continue;
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = data[i][idx] != null ? String(data[i][idx]).trim() : '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Auto-detect column mapping based on common column names
 */
function autoDetectMapping(headers) {
  const mapping = {};

  const patterns = {
    clientName: /^(client|name|borrower|customer).*name/i,
    loanAmount: /^(loan.*amount|amount|principal)/i,
    propertyValue: /^(property.*value|home.*value|value|appraisal)/i,
    income: /^(income|borrower.*income|annual.*income)/i,
    zipCode: /^(zip.*code|zip|postal)/i,
    creditScore: /^(credit.*score|fico|score)/i,
    loanProgram: /^(loan.*program|program|loan.*type)/i,
    productType: /^(product.*type|product|mortgage.*type)/i,
    propertyType: /^(property.*type|home.*type|type)/i,
    occupancy: /^(occupancy|occupancy.*type)/i,
    currentPayment: /^(current.*payment|payment|monthly.*payment)/i,
    units: /^(units|number.*units)/i
  };

  headers.forEach(header => {
    const normalized = header.toLowerCase().trim();

    for (const [key, pattern] of Object.entries(patterns)) {
      if (pattern.test(normalized)) {
        mapping[key] = header;
      }
    }
  });

  return mapping;
}

/**
 * Map credit score to tier
 */
function mapCreditScoreToTier(score) {
  const numScore = parseInt(score);
  if (isNaN(numScore)) return '>=780';

  if (numScore >= 780) return '>=780';
  if (numScore >= 760) return '760-779';
  if (numScore >= 740) return '740-759';
  if (numScore >= 720) return '720-739';
  if (numScore >= 700) return '700-719';
  if (numScore >= 680) return '680-699';
  if (numScore >= 660) return '660-679';
  if (numScore >= 640) return '640-659';
  return '<640';
}

/**
 * Transform raw row data using column mapping
 */
function transformRowData(row, mapping) {
  return {
    clientName: row[mapping.clientName] || 'Unknown',
    loanAmount: parseMoney(row[mapping.loanAmount] || 0),
    propertyValue: parseMoney(row[mapping.propertyValue] || 0),
    income: parseMoney(row[mapping.income] || 0),
    zipCode: String(row[mapping.zipCode] || '').trim(),
    creditScore: mapCreditScoreToTier(row[mapping.creditScore] || '780'),
    loanProgram: String(row[mapping.loanProgram] || 'Conventional').trim(),
    productType: String(row[mapping.productType] || 'Fixed').trim(),
    propertyType: String(row[mapping.propertyType] || 'Single Family').trim(),
    occupancy: String(row[mapping.occupancy] || 'Primary').trim(),
    currentPayment: parseMoney(row[mapping.currentPayment] || 0),
    units: String(row[mapping.units] || '1').trim()
  };
}

// ============= UI FUNCTIONS =============

/**
 * Show file upload info
 */
function showFileInfo(fileName, rowCount) {
  const info = $('#fileInfo');
  info.textContent = `✓ Loaded: ${fileName} (${rowCount} borrowers)`;
  info.classList.remove('hidden');
  $('#errorMessage').classList.add('hidden');
}

/**
 * Show error message
 */
function showError(message) {
  const error = $('#errorMessage');
  error.textContent = `✗ Error: ${message}`;
  error.classList.remove('hidden');
  $('#fileInfo').classList.add('hidden');
}

/**
 * Render column mapping UI
 */
function renderColumnMapping(headers, autoMapping) {
  const grid = $('#mappingGrid');
  grid.innerHTML = '';

  const expectedFields = [
    { key: 'clientName', label: 'Client Name', required: true },
    { key: 'loanAmount', label: 'Loan Amount', required: true },
    { key: 'propertyValue', label: 'Property Value', required: true },
    { key: 'income', label: 'Income', required: false },
    { key: 'zipCode', label: 'Zip Code', required: false },
    { key: 'creditScore', label: 'Credit Score', required: true },
    { key: 'loanProgram', label: 'Loan Program', required: false },
    { key: 'productType', label: 'Product Type', required: false },
    { key: 'propertyType', label: 'Property Type', required: false },
    { key: 'occupancy', label: 'Occupancy', required: false },
    { key: 'currentPayment', label: 'Current Payment', required: true },
    { key: 'units', label: 'Units', required: false }
  ];

  expectedFields.forEach(field => {
    const div = document.createElement('div');
    div.className = 'mapping-item';

    const label = document.createElement('label');
    label.textContent = field.label + (field.required ? ' *' : '');
    label.style.fontSize = '12px';
    label.style.color = 'var(--muted)';
    label.style.textTransform = 'uppercase';
    label.style.letterSpacing = '.5px';

    const select = document.createElement('select');
    select.id = `map-${field.key}`;
    select.style.background = 'var(--chip)';
    select.style.border = '1px solid var(--border)';
    select.style.color = 'var(--text)';
    select.style.padding = '8px 10px';
    select.style.borderRadius = '8px';

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Not Mapped --';
    select.appendChild(defaultOption);

    // Add header options
    headers.forEach(header => {
      const option = document.createElement('option');
      option.value = header;
      option.textContent = header;
      if (autoMapping[field.key] === header) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    div.appendChild(label);
    div.appendChild(select);
    grid.appendChild(div);
  });
}

/**
 * Get current column mapping from UI
 */
function getCurrentMapping() {
  const mapping = {};
  const fields = ['clientName', 'loanAmount', 'propertyValue', 'income', 'zipCode',
                  'creditScore', 'loanProgram', 'productType', 'propertyType',
                  'occupancy', 'currentPayment', 'units'];

  fields.forEach(field => {
    const select = $(`#map-${field}`);
    if (select && select.value) {
      mapping[field] = select.value;
    }
  });

  return mapping;
}

/**
 * Get global inputs
 */
function getGlobalInputs() {
  return {
    baseRate: parseFloat($('#baseRate').value) || 6.75,
    startingPoints: parseFloat($('#startingPoints').value) || 0,
    newLoanProgram: $('#newLoanProgram').value,
    newRefinanceType: $('#newRefinanceType').value,
    homeReadyEligible: $('#homeReadyEligible').classList.contains('active'),
    breakEvenThreshold: parseInt($('#breakEvenThreshold').value) || 18
  };
}

/**
 * Calculate and render results
 */
function calculateAndRenderResults() {
  const globalInputs = getGlobalInputs();
  const results = [];

  uploadedData.forEach(borrower => {
    const result = calculateBorrowerPricing(borrower, globalInputs);
    results.push(result);
  });

  // Store results and global inputs globally for export and rendering
  window.currentResults = results;
  window.currentGlobalInputs = globalInputs;

  // Render stats
  renderStats(results);

  // Render table
  renderResultsTable(results);

  // Show results section
  $('#resultsSection').classList.remove('hidden');
}

/**
 * Render statistics
 */
function renderStats(results) {
  const totalLoans = results.length;
  const loansSavingMoney = results.filter(r => r.paymentDiff < 0).length;
  const totalVolume = results.reduce((sum, r) => sum + r.loanAmount, 0);
  const avgRateAdj = results.reduce((sum, r) => sum + r.totalAdjustments, 0) / totalLoans;
  const avgSavings = results.reduce((sum, r) => sum + r.paymentDiff, 0) / totalLoans;

  $('#statTotal').textContent = totalLoans;
  $('#statSavings').textContent = loansSavingMoney;
  $('#statVolume').textContent = fmtMoney(totalVolume);
  $('#statAvgRate').textContent = fmtPercent(avgRateAdj);

  $('#statAvgSavings').textContent = fmtMoney(avgSavings);
  if (avgSavings < 0) {
    $('#statAvgSavings').classList.add('positive');
    $('#statAvgSavings').classList.remove('negative');
  } else if (avgSavings > 0) {
    $('#statAvgSavings').classList.add('negative');
    $('#statAvgSavings').classList.remove('positive');
  }
}

/**
 * Render results table
 */
let currentSort = { column: null, direction: 'asc' };
let filteredResults = [];

function renderResultsTable(results, filter = '') {
  filteredResults = results;

  // Debug: Log first result to see structure
  if (results.length > 0) {
    console.log('First result structure:', results[0]);
  }

  // Apply search filter
  if (filter) {
    const searchLower = filter.toLowerCase();
    filteredResults = results.filter(r =>
      r.clientName.toLowerCase().includes(searchLower)
    );
  }

  // Apply sorting
  if (currentSort.column) {
    filteredResults.sort((a, b) => {
      let aVal = a[currentSort.column];
      let bVal = b[currentSort.column];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (currentSort.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }

  const tbody = $('#resultsBody');
  tbody.innerHTML = '';

  filteredResults.forEach(result => {
    const tr = document.createElement('tr');

    const paymentDiffClass = result.paymentDiff < 0 ? 'positive' :
                             result.paymentDiff > 0 ? 'negative' : 'neutral';

    // Get the break-even threshold from global inputs
    const threshold = window.currentGlobalInputs ? window.currentGlobalInputs.breakEvenThreshold : 18;

    // Highlight entire row if break-even is less than threshold
    const highlightRow = result.breakEvenMonths !== null && result.breakEvenMonths < threshold;
    if (highlightRow) {
      tr.classList.add('break-even-highlight');
    }

    tr.innerHTML = `
      <td><strong>${result.clientName}</strong></td>
      <td>${fmtMoney(result.propertyValue)}</td>
      <td>${fmtMoney(result.loanAmount)}</td>
      <td>${fmtMoney(result.income)}</td>
      <td>${result.zipCode || 'N/A'}</td>
      <td>${result.creditScore}</td>
      <td>${result.currentLoanProgram || 'N/A'}</td>
      <td>${fmtPercent(result.currentRate)}<br><small class="subtle">${fmtMoney(result.currentPayment)}</small></td>
      <td>${fmtPercent(result.adjustedRate)}<br><small class="subtle">${fmtMoney(result.newPayment)}</small></td>
      <td class="${paymentDiffClass}">
        ${result.paymentDiff < 0 ? '-' : '+'}${fmtMoney(Math.abs(result.paymentDiff))}
        ${result.breakEvenMonths !== null ? `<br><small class="subtle">Break-even: ${Math.round(result.breakEvenMonths)} mo</small>` : ''}
      </td>
      <td class="${result.pointCost < 0 ? 'positive' : 'negative'}">
        ${fmtMoney(result.pointCost)}
      </td>
      <td>
        <button class="points-breakdown-btn" data-index="${filteredResults.indexOf(result)}">
          ${fmtPoints(result.totalAdjustments)}
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Add click handlers for breakdown buttons
  $$('.points-breakdown-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      showBreakdownModal(filteredResults[index]);
    });
  });
}

/**
 * Show breakdown modal
 */
function showBreakdownModal(result) {
  const modal = $('#breakdownModal');
  const modalContent = $('#breakdownModalContent');

  let html = `
    <h3>${result.clientName} - Point Breakdown</h3>
    <div class="modal-summary">
      <div><strong>Starting Points:</strong> ${fmtPoints(result.finalPoints - result.totalAdjustments)}</div>
      <div><strong>Total Adjustments:</strong> ${fmtPoints(result.totalAdjustments)}</div>
      <div><strong>Final Points:</strong> ${fmtPoints(result.finalPoints)}</div>
      <div><strong>Point Cost:</strong> ${fmtMoney(result.pointCost)}</div>
    </div>
    <table class="breakdown-table">
      <thead>
        <tr>
          <th>Adjustment</th>
          <th>Points</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (result.adjustments.length === 0) {
    html += `<tr><td colspan="3" style="text-align: center; color: var(--muted);">No adjustments applied</td></tr>`;
  } else {
    result.adjustments.forEach(adj => {
      const adjClass = adj.points < 0 ? 'positive' : adj.points > 0 ? 'negative' : '';
      html += `
        <tr>
          <td>${adj.name}</td>
          <td class="${adjClass}"><strong>${fmtPoints(adj.points)}</strong></td>
          <td>${adj.reason}</td>
        </tr>
      `;
    });
  }

  html += `
      </tbody>
    </table>
    <button class="btn" onclick="closeBreakdownModal()">Close</button>
  `;

  modalContent.innerHTML = html;
  modal.classList.add('show');
}

/**
 * Close breakdown modal
 */
function closeBreakdownModal() {
  $('#breakdownModal').classList.remove('show');
}

// Make closeBreakdownModal available globally
window.closeBreakdownModal = closeBreakdownModal;

/**
 * Handle table column sorting
 */
function handleSort(column) {
  if (currentSort.column === column) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.column = column;
    currentSort.direction = 'asc';
  }

  // Update header classes
  $$('th.sortable').forEach(th => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    if (th.dataset.column === column) {
      th.classList.add(`sorted-${currentSort.direction}`);
    }
  });

  renderResultsTable(window.currentResults || [], $('#searchBox').value);
}

// ============= EXPORT FUNCTIONS =============

/**
 * Export results to CSV
 */
function exportToCSV() {
  const results = window.currentResults || [];
  if (results.length === 0) return;

  const headers = ['Client Name', 'Property Value', 'Loan Amount', 'Income', 'Zip Code', 'Credit Score',
                   'Current Loan Program', 'LTV', 'Current Rate', 'Current Payment',
                   'New Rate', 'New Payment', 'Payment Change', 'Total Adjustments',
                   'Final Points', 'Point Cost'];

  const rows = results.map(r => [
    r.clientName,
    r.propertyValue,
    r.loanAmount,
    r.income,
    r.zipCode || '',
    r.creditScore,
    r.currentLoanProgram || '',
    r.ltv.toFixed(2) + '%',
    r.currentRate.toFixed(3) + '%',
    r.currentPayment,
    r.adjustedRate.toFixed(3) + '%',
    r.newPayment.toFixed(2),
    r.paymentDiff.toFixed(2),
    r.totalAdjustments.toFixed(3),
    r.finalPoints.toFixed(3),
    r.pointCost.toFixed(2)
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  downloadFile(csv, 'batch-pricing-results.csv', 'text/csv');
}

/**
 * Export results to Excel
 */
function exportToExcel() {
  const results = window.currentResults || [];
  if (results.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(results.map(r => ({
    'Client Name': r.clientName,
    'Property Value': r.propertyValue,
    'Loan Amount': r.loanAmount,
    'Income': r.income,
    'Zip Code': r.zipCode || '',
    'Credit Score': r.creditScore,
    'Current Loan Program': r.currentLoanProgram || '',
    'LTV': r.ltv.toFixed(2) + '%',
    'Current Rate': r.currentRate.toFixed(3) + '%',
    'Current Payment': r.currentPayment.toFixed(2),
    'New Rate': r.adjustedRate.toFixed(3) + '%',
    'New Payment': r.newPayment.toFixed(2),
    'Payment Change': r.paymentDiff.toFixed(2),
    'Total Adjustments': r.totalAdjustments.toFixed(3),
    'Final Points': r.finalPoints.toFixed(3),
    'Point Cost': r.pointCost.toFixed(2)
  })));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pricing Results');

  XLSX.writeFile(workbook, 'batch-pricing-results.xlsx');
}

/**
 * Download file helper
 */
function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============= EVENT HANDLERS =============

function wireEvents() {
  const uploadZone = $('#uploadZone');
  const fileInput = $('#fileInput');

  // Upload zone click
  uploadZone.addEventListener('click', () => fileInput.click());

  // Drag and drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  });

  // Confirm mapping button
  $('#confirmMapping').addEventListener('click', () => {
    columnMapping = getCurrentMapping();

    // Validate required fields
    const required = ['clientName', 'loanAmount', 'propertyValue', 'creditScore', 'currentPayment'];
    const missing = required.filter(field => !columnMapping[field]);

    if (missing.length > 0) {
      showError(`Required fields not mapped: ${missing.join(', ')}`);
      return;
    }

    // Transform data
    uploadedData = detectedColumns.map(row => transformRowData(row, columnMapping));

    // Show inputs section
    $('#inputsSection').classList.remove('hidden');
    $('#mappingSection').classList.add('hidden');

    // Scroll to inputs
    $('#inputsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Calculate button
  $('#calculateBtn').addEventListener('click', () => {
    calculateAndRenderResults();
    $('#resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // HomeReady toggle
  $('#homeReadyEligible').addEventListener('click', function() {
    this.classList.toggle('active');
  });

  // Search box
  $('#searchBox').addEventListener('input', (e) => {
    renderResultsTable(window.currentResults || [], e.target.value);
  });

  // Table sorting
  $$('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      handleSort(th.dataset.column);
    });
  });

  // Export buttons
  $('#exportCsvBtn').addEventListener('click', exportToCSV);
  $('#exportExcelBtn').addEventListener('click', exportToExcel);

  // Reset button
  $('#resetBtn').addEventListener('click', () => {
    location.reload();
  });
}

/**
 * Handle file upload
 */
async function handleFileUpload(file) {
  const fileName = file.name;
  const fileExt = fileName.split('.').pop().toLowerCase();

  try {
    let parsedData;

    if (fileExt === 'csv') {
      const text = await file.text();
      parsedData = parseCSV(text);
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const arrayBuffer = await file.arrayBuffer();
      parsedData = parseExcel(arrayBuffer);
    } else {
      throw new Error('Unsupported file format. Please upload CSV or Excel files.');
    }

    const { headers, rows } = parsedData;

    if (rows.length === 0) {
      throw new Error('No data found in file');
    }

    // Store detected data
    detectedColumns = rows;

    // Auto-detect mapping
    const autoMapping = autoDetectMapping(headers);

    // Show file info
    showFileInfo(fileName, rows.length);
    $('#uploadZone').classList.add('has-file');

    // Render mapping UI
    renderColumnMapping(headers, autoMapping);
    $('#mappingSection').classList.remove('hidden');

    // Scroll to mapping section
    setTimeout(() => {
      $('#mappingSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

  } catch (error) {
    showError(error.message);
    console.error('File upload error:', error);
  }
}

// ============= LLPM MATRIX MANAGEMENT =============

/**
 * Load LLPM adjustments from localStorage or use defaults
 */
function loadLLPMFromStorage() {
  const stored = localStorage.getItem('llpm-adjustments');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Merge with ADJUSTMENTS
      Object.keys(parsed).forEach(program => {
        if (ADJUSTMENTS[program]) {
          ADJUSTMENTS[program] = parsed[program];
        }
      });
      console.log('Loaded custom LLPM adjustments from storage');
    } catch (e) {
      console.error('Failed to load LLPM adjustments:', e);
    }
  }
}

/**
 * Save LLPM adjustments to localStorage
 */
function saveLLPMToStorage() {
  try {
    localStorage.setItem('llpm-adjustments', JSON.stringify(ADJUSTMENTS));
    console.log('Saved LLPM adjustments to storage');
  } catch (e) {
    console.error('Failed to save LLPM adjustments:', e);
  }
}

/**
 * Load matrix into editor
 */
function loadMatrixIntoEditor() {
  const program = $('#matrixLoanProgram').value;
  const matrix = ADJUSTMENTS[program];
  $('#llpmMatrixEditor').value = JSON.stringify(matrix, null, 2);
}

/**
 * Save matrix from editor
 */
function saveMatrixFromEditor() {
  const program = $('#matrixLoanProgram').value;
  const matrixText = $('#llpmMatrixEditor').value;
  const statusEl = $('#matrixStatus');

  try {
    const parsed = JSON.parse(matrixText);

    // Basic validation
    if (!parsed.creditScore || !parsed.ltv || !parsed.productType) {
      throw new Error('Matrix must contain creditScore, ltv, and productType fields');
    }

    // Update ADJUSTMENTS
    ADJUSTMENTS[program] = parsed;

    // Save to localStorage
    saveLLPMToStorage();

    // Show success message
    statusEl.textContent = `✓ Successfully saved ${program} matrix. Changes will persist across sessions.`;
    statusEl.className = 'status-message success';
    statusEl.classList.remove('hidden');

    setTimeout(() => {
      statusEl.classList.add('hidden');
    }, 5000);

  } catch (e) {
    statusEl.textContent = `✗ Error: ${e.message}`;
    statusEl.className = 'status-message error';
    statusEl.classList.remove('hidden');
  }
}

/**
 * Reset matrix to default
 */
function resetMatrixToDefault() {
  if (!confirm('Are you sure you want to reset to default values? This will clear any custom adjustments.')) {
    return;
  }

  // Remove from localStorage and reload page
  localStorage.removeItem('llpm-adjustments');
  location.reload();
}

// ============= INITIALIZATION =============

document.addEventListener('DOMContentLoaded', () => {
  // Load custom LLPM adjustments from storage
  loadLLPMFromStorage();

  wireEvents();

  // Matrix editor events
  $('#matrixLoanProgram').addEventListener('change', loadMatrixIntoEditor);
  $('#btnLoadMatrix').addEventListener('click', loadMatrixIntoEditor);
  $('#btnSaveMatrix').addEventListener('click', saveMatrixFromEditor);
  $('#btnResetMatrix').addEventListener('click', resetMatrixToDefault);

  // Load initial matrix
  loadMatrixIntoEditor();
});
