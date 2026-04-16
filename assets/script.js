let allRatesCache = [];

const criteria = [
    { key: 'title', label: 'A. TITLE', max: 5 },
    { key: 'project-context', label: 'B1. Project Context', max: 5 },
    { key: 'purpose-description', label: 'B2. Purpose and Description of the Project', max: 5 },
    { key: 'objectives', label: 'B3. Objectives of the Project', max: 5 },
    { key: 'scope-limitations', label: 'B4. Scope and limitations are well-defined', max: 5 },
    { key: 'review-literature', label: 'C. REVIEW OF RELATED LITERATURE', max: 15 },
    { key: 'technicality', label: 'D1. The technicality of the project', max: 5 },
    { key: 'technologies', label: 'D2. Details of the Technologies to be used', max: 5 },
    { key: 'project-plan', label: 'D3. Proposed Project Plan', max: 10 },
    { key: 'mastery', label: 'E1. Shows mastery of the topic', max: 10 },
    { key: 'questions', label: 'E2. Able to answer clearly all questions raised by the panel members', max: 10 },
    { key: 'visual-aids', label: 'E3. Presents well all visual aids and other relevant materials', max: 10 },
    { key: 'communication', label: 'E4. Effectively communicates the topic to the audience', max: 10 }
];

function formatCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function autoFillDateTime() {
  document.getElementById("time").value = formatCurrentTime();
  document.getElementById("date").value = formatCurrentDate();
}

function createStarRating(key, max) {
    let html = '<div class="star-rating">';
    for (let value = max; value >= 1; value--) {
        const inputId = `${key}-${value}`;
        html += `
            <input type="radio" name="${key}" id="${inputId}" value="${value}" onchange="updateTotal()">
            <label for="${inputId}" title="${value} star${value > 1 ? 's' : ''}">&#9733;</label>
        `;
    }
    html += '</div>';
    return html;
}

function mountRatings() {
    criteria.forEach(item => {
        const cell = document.getElementById(`rating-${item.key}`);
        if (cell) cell.innerHTML = createStarRating(item.key, item.max);
    });
}

function getSelectedRating(key) {
    const selected = document.querySelector(`input[name="${key}"]:checked`);
    return selected ? Number(selected.value) : 0;
}

function updateTotal() {
    const total = criteria.reduce((sum, item) => sum + getSelectedRating(item.key), 0);
    document.getElementById('totalScore').textContent = total;
}

function getDecisionData() {
    return {
        approvedNoRevisions: document.getElementById('approved-no-revisions').checked,
        approvedMinorRevisions: document.getElementById('approved-minor-revisions').checked,
        approvedMajorRevisions: document.getElementById('approved-major-revisions').checked,
        disapproved: document.getElementById('disapproved').checked,
        reDefense: document.getElementById('re-defense').checked
    };
}

function hasSelectedDecision() {
    const decision = getDecisionData();
    return Object.values(decision).some(value => value);
}

function getRatingsJson() {
    const ratings = {};
    criteria.forEach(item => {
        ratings[item.key] = {
            label: item.label,
            score: getSelectedRating(item.key),
            max: item.max
        };
    });
    return ratings;
}

function validateForm() {
    const missingFields = [];

    const evaluator = document.getElementById('evaluator').value.trim();
    const time = document.getElementById('time').value.trim();
    const date = document.getElementById('date').value.trim();
    const signature = document.getElementById('signature').value.trim();
    const srcMember = document.getElementById('srcMember').value.trim();
    const title = document.getElementById('title').value.trim();

    if (!evaluator) missingFields.push('Evaluator');
    if (!time) missingFields.push('Time');
    if (!date) missingFields.push('Date');
    if (!title) missingFields.push('Research/Capstone Project Proposal Title');
    if (!srcMember) missingFields.push('SRC Member');

    const unratedCriteria = criteria.filter(item => getSelectedRating(item.key) === 0);
    if (unratedCriteria.length > 0) {
        missingFields.push('All rating fields must be selected');
    }

    if (!hasSelectedDecision()) {
        missingFields.push('Please tick at least one decision checkbox');
    }

    return { valid: missingFields.length === 0, missingFields };
}

function getFormPayload() {
    // Nausab ang keys diri para mo match sa imong bag-ong code.gs
    return {
        evaluator: document.getElementById('evaluator').value.trim(),
        time: document.getElementById('time').value.trim(),
        date: document.getElementById('date').value,
        signature: document.getElementById('signature').value.trim(),
        srcMember: document.getElementById('srcMember').value.trim(),
        title: document.getElementById('title').value.trim(),
        totalScore: Number(document.getElementById('totalScore').textContent || 0),
        decision: getDecisionData(), // Dili na kailangan i-stringify diri kay sa code.gs na gi-stringify
        ratingsJson: JSON.stringify(getRatingsJson()),
        createdAt: new Date().toISOString()
    };
}

async function submitToGoogleSheet() {
    const status = document.getElementById('status');
    const saveButton = document.getElementById('saveBtn');
    const validation = validateForm();

    if (!validation.valid) {
        status.style.color = 'red';
        status.textContent = 'Cannot save. Missing required input(s): ' + validation.missingFields.join(', ');
        return;
    }

    const payload = getFormPayload();

    status.style.color = '#222';
    status.textContent = 'Saving data...';

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = 'SAVING...';
    }

    try {
        await fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        status.style.color = 'green';
        status.textContent = 'Data submitted successfully. .';

        setTimeout(() => { clearForm(); }, 800);

    } catch (error) {
        status.style.color = 'red';
        status.textContent = 'Failed to submit data: ' + error.message;
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = 'SAVE DATA';
        }
    }
}

function clearForm() {
    document.getElementById('evaluator').value = '';
    document.getElementById('signature').value = '';
    document.getElementById('srcMember').value = '';
    document.getElementById('title').value = '';

    criteria.forEach(item => {
        const checked = document.querySelector(`input[name="${item.key}"]:checked`);
        if (checked) checked.checked = false;
    });

    ['approved-no-revisions', 'approved-minor-revisions', 'approved-major-revisions', 'disapproved', 're-defense'].forEach(id => {
        document.getElementById(id).checked = false;
    });

    autoFillDateTime();
    updateTotal();
}

function fillSample() {
    document.getElementById('evaluator').value = 'Dr. Juan Dela Cruz';
    document.getElementById('signature').value = 'Signed';
    document.getElementById('srcMember').value = 'Prof. Maria Santos';
    
    const titleSelect = document.getElementById('title');
    if(titleSelect.options.length > 1) { titleSelect.selectedIndex = 1; }
    
    autoFillDateTime();

    const sampleRatings = {
        'title': 5, 'project-context': 4, 'purpose-description': 5, 'objectives': 4,
        'scope-limitations': 4, 'review-literature': 12, 'technicality': 5, 'technologies': 4,
        'project-plan': 8, 'mastery': 9, 'questions': 8, 'visual-aids': 9, 'communication': 9
    };

    Object.entries(sampleRatings).forEach(([key, value]) => {
        const radio = document.getElementById(`${key}-${value}`);
        if (radio) radio.checked = true;
    });

    document.getElementById('approved-minor-revisions').checked = true;
    updateTotal();
}

function goToViewAllRates() {
    const url = new URL(window.location.href);
    url.searchParams.set('page', 'rates');
    window.location.href = url.toString();
}

function goToFormPage() {
    const url = new URL(window.location.href);
    url.searchParams.set('page', 'form');
    url.searchParams.delete('index');
    window.location.href = url.toString();
}

function showFormPage() {
    document.getElementById('formPage').classList.remove('hidden');
    document.getElementById('formToolbar').classList.remove('hidden');
    document.getElementById('ratesPage').classList.add('hidden');
    document.getElementById('ratesToolbar').classList.add('hidden');
    document.getElementById('detailsPage').classList.add('hidden');
}

function showRatesPage() {
    document.getElementById('formPage').classList.add('hidden');
    document.getElementById('formToolbar').classList.add('hidden');
    document.getElementById('ratesPage').classList.remove('hidden');
    document.getElementById('ratesToolbar').classList.remove('hidden');
    document.getElementById('detailsPage').classList.add('hidden');
}

function showDetailsPage() {
    document.getElementById('formPage').classList.add('hidden');
    document.getElementById('formToolbar').classList.add('hidden');
    document.getElementById('ratesPage').classList.add('hidden');
    document.getElementById('ratesToolbar').classList.remove('hidden');
    document.getElementById('detailsPage').classList.remove('hidden');
}

function escapeHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function loadAllRates() {
    const status = document.getElementById('status');
    const tbody = document.getElementById('ratesTableBody');

    status.style.color = '#222';
    status.textContent = 'Loading all rates...';
    tbody.innerHTML = '<tr><td colspan="10" class="center">Loading...</td></tr>';

    try {
        const url = `${GOOGLE_SCRIPT_WEB_APP_URL}?action=getAllRates&_=${Date.now()}`;
        const response = await fetch(url);
        const result = await response.json();

        if (!response.ok || !result.success) { throw new Error(result.message || 'Unable to load rates.'); }

        const rows = Array.isArray(result.data) ? result.data : [];
        allRatesCache = rows;

        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="10" class="center">No saved rates found.</td></tr>';
            status.textContent = 'No saved rates found.';
            return rows;
        }

        // Nausab ang row access diri (row.srcMember og row.totalScore)
        tbody.innerHTML = rows.map((row, index) => {
            const srcMemberName = row.srcMember || 'N/A';

            return `
                <tr>
                    <td class="center">${index + 1}</td>
                    <td>${escapeHtml(row.evaluator)}</td>
                    <td>${escapeHtml(row.time)}</td>
                    <td>${escapeHtml(row.date)}</td>
                    <td>${escapeHtml(row.signature)}</td>
                    <td>${escapeHtml(srcMemberName)}</td>
                    <td class="wrap">${escapeHtml(row.title)}</td>
                    <td class="center">${escapeHtml(row.totalScore)}</td>
                    <td>${escapeHtml(row.createdAt)}</td>
                    <td class="center action-cell">
                        <button type="button" onclick="viewRateDetails(${index})">View</button>
                    </td>
                </tr>
            `;
        }).join('');

        status.textContent = `Loaded ${rows.length} saved rate(s).`;
        return rows;
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="10" class="center">${escapeHtml(error.message)}</td></tr>`;
        status.style.color = 'red';
        status.textContent = `Error: ${error.message}`;
        return [];
    }
}

function parseSafeJson(value, fallback = {}) {
    try {
        if (!value) return fallback;
        return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
        return fallback;
    }
}

function buildDetailRatingsTable(ratings) {
    const body = document.getElementById('detailRatingsBody');
    const order = [
        { key: 'title', label: 'A. TITLE', description: '(Title is relevant/appropriate to the program of study)' },
        { section: 'B. INTRODUCTION', type: 'section' },
        { key: 'project-context', label: '1. Project Context' },
        { key: 'purpose-description', label: '2. Purpose and Description of the Project' },
        { key: 'objectives', label: '3. Objectives of the Project' },
        { key: 'scope-limitations', label: '4. Scope and limitations are well-defined' },
        { key: 'review-literature', label: 'C. REVIEW OF RELATED LITERATURE', description: '(Included sufficient information on previous studies related to the Capstone Proposal)' },
        { section: 'D. TECHNICAL BACKGROUND (Methods proposed are realistic and show indications that set objectives are achievable / have been achieved)', type: 'section' },
        { key: 'technicality', label: '1. The technicality of the project' },
        { key: 'technologies', label: '2. Details of the Technologies to be used' },
        { key: 'project-plan', label: '3. Proposed Project Plan' },
        { section: 'E. ORAL PRESENTATION', type: 'section' },
        { key: 'mastery', label: '1. Shows mastery of the topic' },
        { key: 'questions', label: '2. Able to answer clearly all questions raised by the panel members' },
        { key: 'visual-aids', label: '3. Presents well all visual aids and other relevant materials' },
        { key: 'communication', label: '4. Effectively communicates the topic to the audience' }
    ];

    body.innerHTML = order.map(item => {
        if (item.type === 'section') { return `<tr><td class="subhead" colspan="3">${escapeHtml(item.section)}</td></tr>`; }

        const rating = ratings[item.key] || {};
        const text = item.description ? `<strong>${escapeHtml(item.label)}</strong> ${escapeHtml(item.description)}` : escapeHtml(item.label);

        return `
            <tr>
                <td>${text}</td>
                <td class="center">1 - ${escapeHtml(rating.max || '')}</td>
                <td class="center">${escapeHtml(rating.score || 0)}</td>
            </tr>
        `;
    }).join('');
}

function fillDetailPage(row) {
    document.getElementById('detailEvaluator').value = row.evaluator || '';
    document.getElementById('detailTime').value = row.time || '';
    document.getElementById('detailDate').value = row.date || '';
    document.getElementById('detailSignature').value = row.signature || '';
    
    // Nausab diri
    document.getElementById('detailSrcMember').value = row.srcMember || '';
    document.getElementById('detailTitle').value = row.title || '';
    document.getElementById('detailTotalScore').textContent = row.totalScore || 0;

    // Nausab ang row.decision og row.ratingsJson
    const decision = parseSafeJson(row.decision, {});
    document.getElementById('detail-approved-no-revisions').checked = !!decision.approvedNoRevisions;
    document.getElementById('detail-approved-minor-revisions').checked = !!decision.approvedMinorRevisions;
    document.getElementById('detail-approved-major-revisions').checked = !!decision.approvedMajorRevisions;
    document.getElementById('detail-disapproved').checked = !!decision.disapproved;
    document.getElementById('detail-re-defense').checked = !!decision.reDefense;

    const ratings = parseSafeJson(row.ratingsJson, {});
    buildDetailRatingsTable(ratings);
}

function viewRateDetails(index) {
    const row = allRatesCache[index];
    if (!row) {
        document.getElementById('status').textContent = 'Unable to open rate details.';
        return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('page', 'details');
    url.searchParams.set('index', index);
    window.location.href = url.toString();
}

function populateTitles() {
    const titleSelect = document.getElementById('title');
    if (!titleSelect) return;

    projectTitles.forEach(title => {
        const option = document.createElement('option');
        option.value = title;
        option.textContent = title;
        titleSelect.appendChild(option);
    });
}

function initializePage() {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    const indexParam = params.get('index');
    const index = indexParam !== null ? Number(indexParam) : null;

    if (page === 'rates') {
        showRatesPage();
        loadAllRates();
    } else if (page === 'details') {
        showDetailsPage();
        loadAllRates().then(() => {
            if (Number.isInteger(index) && allRatesCache[index]) {
                fillDetailPage(allRatesCache[index]);
                document.getElementById('status').textContent = `Viewing saved rate #${index + 1}.`;
            } else {
                document.getElementById('status').textContent = 'Saved rate details not found.';
            }
        });
    } else {
        showFormPage();
        autoFillDateTime();
    }
}

// Initialize on load
populateTitles();
mountRatings();
updateTotal();
initializePage();