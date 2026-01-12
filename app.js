
    /* --- STATE --- */
let accounts = [];
let transactions = [];
let transId = 1;

// Initial Dummy Data
const initialData = [
    {name: "Share Capital", group: "Eq-Cap"},
    {name: "Retained Earnings", group: "Eq-Res"},
    {name: "HDFC Bank", group: "Ast-Csh"},
    {name: "Cash in Hand", group: "Ast-Csh"},
    {name: "Sales", group: "Inc-Ops"},
    {name: "Purchases", group: "Exp-Pur"},
    {name: "Rent Expense", group: "Exp-Oth"}
];

window.onload = function() {
    document.getElementById('v-date').valueAsDate = new Date();
    // Load initial accounts
    initialData.forEach(d => accounts.push({id: accounts.length+1, name: d.name, group: d.group}));
    refreshUI();
};

/* --- NAVIGATION --- */
function nav(secId) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active-sec'));
    document.getElementById(secId).classList.add('active-sec');
    
    // Update Bottom Nav Styling
    document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if(secId === 'sec-reports') generateReports();
}

function switchReport(type) {
    document.querySelectorAll('.rep-view').forEach(v => v.classList.remove('show'));
    document.getElementById('rep-'+type).classList.add('show');
    
    document.querySelectorAll('.report-tabs button').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

/* --- LOGIC: ACCOUNTS --- */
function addAccount() {
    const name = document.getElementById('ac-name').value;
    const group = document.getElementById('ac-group').value;
    if(!name) return alert("Enter Account Name");

    accounts.push({id: accounts.length+1, name, group});
    document.getElementById('ac-name').value = '';
    alert("Ledger Created!");
    refreshUI();
}

function refreshUI() {
    // Update Voucher Dropdowns
    const options = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    document.getElementById('v-dr').innerHTML = options;
    document.getElementById('v-cr').innerHTML = options;

    // Update List
    const map = {
        'Eq-Cap': 'Share Capital', 'Eq-Res': 'Reserves', 'Lia-Lng': 'Long Term Borrowings',
        'Ast-Csh': 'Cash/Bank', 'Inc-Ops': 'Revenue', 'Exp-Pur': 'Purchase'
    }; // Simplified map for display
    
    document.getElementById('account-list').innerHTML = accounts.map(a => `
        <div><b>${a.name}</b> <br><small>${a.group}</small></div>
    `).join('');
}

/* --- LOGIC: VOUCHER --- */
function postVoucher() {
    const dr = document.getElementById('v-dr').value;
    const cr = document.getElementById('v-cr').value;
    const amt = parseFloat(document.getElementById('v-amt').value);
    const narr = document.getElementById('v-narr').value;
    const date = document.getElementById('v-date').value;

    if(dr == cr) return alert("Debit & Credit cannot be same");
    if(!amt) return alert("Enter Amount");

    transactions.push({id: transId++, dr, cr, amt, narr, date});
    
    // Show in list
    const drName = accounts.find(a=>a.id==dr).name;
    const crName = accounts.find(a=>a.id==cr).name;
    
    const html = `<div>
        <b>₹${amt}</b> | ${drName} (Dr) / ${crName} (Cr)<br>
        <small>${date} - ${narr}</small>
    </div>`;
    document.getElementById('trans-list').innerHTML = html + document.getElementById('trans-list').innerHTML;
    
    document.getElementById('v-amt').value = '';
    document.getElementById('v-narr').value = '';
}

/* --- LOGIC: REPORTS ENGINE --- */
let finData = {};

function generateReports() {
    // 1. Calculate Ledger Balances
    let balances = {};
    accounts.forEach(a => balances[a.id] = 0);
    transactions.forEach(t => {
        balances[t.dr] += t.amt;
        balances[t.cr] -= t.amt;
    });

    // 2. TB Generation
    let tbHTML = '';
    let tDr=0, tCr=0;
    
    // 3. Grouping for P&L and BS
    let sums = {
        rev: 0, othInc: 0, 
        pur: 0, emp: 0, fin: 0, othExp: 0,
        cap: 0, res: 0, lngLia: 0, trdLia: 0, othLia: 0,
        ppe: 0, inv: 0, trdAst: 0, csh: 0
    };

    accounts.forEach(a => {
        let bal = balances[a.id];
        if(bal === 0) return;
        
        // TB Display
        let isDr = bal > 0;
        let abs = Math.abs(bal);
        if(isDr) tDr += abs; else tCr += abs;
        tbHTML += `<tr><td>${a.name}</td><td>${isDr?abs:''}</td><td>${!isDr?abs:''}</td></tr>`;

        // Classification
        const g = a.group;
        if(g == 'Inc-Ops') sums.rev += abs;
        else if(g == 'Inc-Oth') sums.othInc += abs;
        else if(g == 'Exp-Pur') sums.pur += abs;
        else if(g == 'Exp-Emp') sums.emp += abs;
        else if(g == 'Exp-Fin') sums.fin += abs;
        else if(g == 'Exp-Oth') sums.othExp += abs;
        else if(g == 'Eq-Cap') sums.cap += abs;
        else if(g == 'Eq-Res') sums.res += abs; // Credit Bal
        else if(g == 'Lia-Lng') sums.lngLia += abs;
        else if(g == 'Lia-Trd') sums.trdLia += abs;
        else if(g == 'Lia-Oth') sums.othLia += abs;
        else if(g == 'Ast-PPE') sums.ppe += abs; // Debit Bal
        else if(g == 'Ast-Inv') sums.inv += abs;
        else if(g == 'Ast-Trd') sums.trdAst += abs;
        else if(g == 'Ast-Csh') sums.csh += abs;
    });

    document.getElementById('tb-body').innerHTML = tbHTML;
    document.getElementById('tb-dr').innerText = tDr;
    document.getElementById('tb-cr').innerText = tCr;

    // 4. Calculate Tax & Profit
    const totalRev = sums.rev + sums.othInc;
    const totalExp = sums.pur + sums.emp + sums.fin + sums.othExp;
    const pbt = totalRev - totalExp;
    const taxRate = parseFloat(document.getElementById('cfg-tax').value) || 0;
    const taxExp = pbt > 0 ? (pbt * taxRate / 100) : 0;
    const pat = pbt - taxExp;

    // 5. Update P&L HTML
    document.getElementById('pl-body').innerHTML = `
        <div class="stmt-head">REVENUE</div>
        <div class="stmt-row"><span>Revenue from Operations</span><span>${sums.rev}</span></div>
        <div class="stmt-row"><span>Other Income</span><span>${sums.othInc}</span></div>
        <div class="stmt-total"><span>Total Revenue</span><span>${totalRev}</span></div>
        
        <div class="stmt-head">EXPENSES</div>
        <div class="stmt-row"><span>Purchases</span><span>${sums.pur}</span></div>
        <div class="stmt-row"><span>Employee Benefits</span><span>${sums.emp}</span></div>
        <div class="stmt-row"><span>Other Expenses</span><span>${sums.othExp}</span></div>
        <div class="stmt-total"><span>Total Expenses</span><span>${totalExp}</span></div>
        
        <div class="stmt-row" style="font-weight:bold; margin-top:10px;"><span>Profit Before Tax</span><span>${pbt.toFixed(2)}</span></div>
        <div class="stmt-row"><span>Tax Expense</span><span>${taxExp.toFixed(2)}</span></div>
        <div class="stmt-total" style="color:var(--primary)"><span>Profit After Tax</span><span>${pat.toFixed(2)}</span></div>
    `;

    // 6. Update BS HTML
    // Add PAT to Reserves and Tax to Current Liability
    const finalRes = sums.res + pat;
    const finalOthLia = sums.othLia + taxExp;
    const totalEqLia = sums.cap + finalRes + sums.lngLia + sums.trdLia + finalOthLia;
    const totalAst = sums.ppe + sums.inv + sums.trdAst + sums.csh;

    document.getElementById('bs-body').innerHTML = `
        <div class="stmt-head">EQUITY AND LIABILITIES</div>
        <div class="stmt-row"><span>Share Capital</span><span>${sums.cap}</span></div>
        <div class="stmt-row"><span>Reserves & Surplus</span><span>${finalRes.toFixed(2)}</span></div>
        <div class="stmt-row"><span>Long Term Borrowings</span><span>${sums.lngLia}</span></div>
        <div class="stmt-row"><span>Trade Payables</span><span>${sums.trdLia}</span></div>
        <div class="stmt-row"><span>Other Current Liab (incl Tax)</span><span>${finalOthLia.toFixed(2)}</span></div>
        <div class="stmt-total"><span>TOTAL</span><span>${totalEqLia.toFixed(2)}</span></div>

        <div class="stmt-head">ASSETS</div>
        <div class="stmt-row"><span>Property, Plant & Equipment</span><span>${sums.ppe}</span></div>
        <div class="stmt-row"><span>Inventories</span><span>${sums.inv}</span></div>
        <div class="stmt-row"><span>Trade Receivables</span><span>${sums.trdAst}</span></div>
        <div class="stmt-row"><span>Cash & Bank Balances</span><span>${sums.csh}</span></div>
        <div class="stmt-total"><span>TOTAL</span><span>${totalAst.toFixed(2)}</span></div>
    `;

    // Save for print
    finData = { sums, pbt, taxExp, pat, finalRes, finalOthLia, totalEqLia, totalAst };
}

/* --- LOGIC: PDF PRINT --- */
function generatePDF() {
    generateReports(); // Ensure fresh data
    
    const clName = document.getElementById('cl-name').value || "CLIENT NAME";
    const clYear = document.getElementById('cl-year').value || "2025-26";
    const firm = document.getElementById('au-firm').value || "FIRM NAME";
    const ca = document.getElementById('au-name').value || "PARTNER";
    const frn = document.getElementById('au-frn').value || "XXXXXX";
    const mem = document.getElementById('au-mem').value || "XXXXXX";
    const udin = document.getElementById('au-udin').value || "";
    const place = document.getElementById('au-place').value;
    const opinion = document.getElementById('audit-op').value;

    const html = `
    <div class="legal-doc">
        <div class="auditor-header">
            <h3>${firm}</h3>
            <div style="font-size:10pt">Chartered Accountants | FRN: ${frn}</div>
        </div>

        <h1>INDEPENDENT AUDITOR'S REPORT</h1>
        <h2>To the Members of ${clName}</h2>

        <p><strong>Report on the Audit of the Financial Statements</strong></p>
        <p><strong>Opinion:</strong> We have audited the financial statements of ${clName}, which comprise the Balance Sheet as at 31st March, ${clYear.split('-')[1] || '20XX'}, and the Statement of Profit and Loss for the year then ended.</p>
        
        <p>In our opinion and to the best of our information and according to the explanations given to us, the aforesaid financial statements give the information required by the Companies Act, 2013 in the manner so required and give a true and fair view in conformity with the accounting principles generally accepted in India${opinion === 'Qualified' ? ', subject to our observations.' : '.'}</p>

        <p><strong>Basis for Opinion:</strong> We conducted our audit in accordance with the Standards on Auditing (SAs) specified under section 143(10) of the Companies Act, 2013. Our responsibilities under those Standards are further described in the Auditor's Responsibilities for the Audit of the Financial Statements section of our report.</p>

        <div class="signature-block">
            For <strong>${firm}</strong><br>
            Chartered Accountants<br>
            (FRN: ${frn})<br><br><br>
            <strong>CA ${ca}</strong><br>
            Partner<br>
            M.No. ${mem}<br>
            UDIN: ${udin}<br>
            Place: ${place}<br>
            Date: ${new Date().toLocaleDateString()}
        </div>
        
        <div class="page-break"></div>

        <h2 style="text-decoration:none">${clName}</h2>
        <h3>Balance Sheet as at 31st March, ${clYear.split('-')[1]}</h3>
        <table>
            <tr><th>Particulars</th><th class="text-right">Amount (₹)</th></tr>
            <tr><td class="bold">I. EQUITY AND LIABILITIES</td><td></td></tr>
            <tr><td>(1) Shareholders' Funds</td><td></td></tr>
            <tr><td>&nbsp;&nbsp; Share Capital</td><td class="text-right">${finData.sums.cap}</td></tr>
            <tr><td>&nbsp;&nbsp; Reserves and Surplus</td><td class="text-right">${finData.finalRes.toFixed(2)}</td></tr>
            <tr><td>(2) Non-Current Liabilities</td><td></td></tr>
            <tr><td>&nbsp;&nbsp; Long Term Borrowings</td><td class="text-right">${finData.sums.lngLia}</td></tr>
            <tr><td>(3) Current Liabilities</td><td></td></tr>
            <tr><td>&nbsp;&nbsp; Trade Payables</td><td class="text-right">${finData.sums.trdLia}</td></tr>
            <tr><td>&nbsp;&nbsp; Other Current Liabilities</td><td class="text-right">${finData.finalOthLia.toFixed(2)}</td></tr>
            <tr><td class="bold">TOTAL</td><td class="text-right bold">${finData.totalEqLia.toFixed(2)}</td></tr>

            <tr><td class="bold">II. ASSETS</td><td></td></tr>
            <tr><td>(1) Non-Current Assets</td><td></td></tr>
            <tr><td>&nbsp;&nbsp; Property, Plant & Equipment</td><td class="text-right">${finData.sums.ppe}</td></tr>
            <tr><td>(2) Current Assets</td><td></td></tr>
            <tr><td>&nbsp;&nbsp; Inventories</td><td class="text-right">${finData.sums.inv}</td></tr>
            <tr><td>&nbsp;&nbsp; Trade Receivables</td><td class="text-right">${finData.sums.trdAst}</td></tr>
            <tr><td>&nbsp;&nbsp; Cash & Cash Equivalents</td><td class="text-right">${finData.sums.csh}</td></tr>
            <tr><td class="bold">TOTAL</td><td class="text-right bold">${finData.totalAst.toFixed(2)}</td></tr>
        </table>

        <div class="page-break"></div>

        <h2 style="text-decoration:none">${clName}</h2>
        <h3>Statement of Profit and Loss for the year ended 31st March, ${clYear.split('-')[1]}</h3>
        <table>
            <tr><th>Particulars</th><th class="text-right">Amount (₹)</th></tr>
            <tr><td>I. Revenue From Operations</td><td class="text-right">${finData.sums.rev}</td></tr>
            <tr><td>II. Other Income</td><td class="text-right">${finData.sums.othInc}</td></tr>
            <tr><td class="bold">III. Total Revenue (I + II)</td><td class="text-right bold">${(finData.sums.rev + finData.sums.othInc)}</td></tr>
            <tr><td>IV. Expenses:</td><td></td></tr>
            <tr><td>&nbsp;&nbsp; Cost of Materials Consumed</td><td class="text-right">${finData.sums.pur}</td></tr>
            <tr><td>&nbsp;&nbsp; Employee Benefits Expense</td><td class="text-right">${finData.sums.emp}</td></tr>
            <tr><td>&nbsp;&nbsp; Finance Costs</td><td class="text-right">${finData.sums.fin}</td></tr>
            <tr><td>&nbsp;&nbsp; Other Expenses</td><td class="text-right">${finData.sums.othExp}</td></tr>
            <tr><td class="bold">Total Expenses</td><td class="text-right bold">${(finData.sums.pur + finData.sums.emp + finData.sums.fin + finData.sums.othExp)}</td></tr>
            <tr><td class="bold">V. Profit Before Tax (III - IV)</td><td class="text-right bold">${finData.pbt.toFixed(2)}</td></tr>
            <tr><td>VI. Tax Expense</td><td class="text-right">${finData.taxExp.toFixed(2)}</td></tr>
            <tr><td class="bold">VII. Profit for the Period (V - VI)</td><td class="text-right bold">${finData.pat.toFixed(2)}</td></tr>
        </table>
        
        <div style="margin-top:50px; text-align:center;">
            (This report is generated via Audit Corp Statutory System)
        </div>
    </div>
    `;

    document.getElementById('print-area').innerHTML = html;
    window.print();
}
