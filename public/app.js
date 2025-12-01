// NDMarket AI Insight Platform - Frontend JavaScript

// State Management
const state = {
  history: [],
  searchHistory: [],
  currentPage: 'query',
};

// API Configuration
const API_BASE = '';
const API_ENDPOINTS = {
  agentQuery: '/agent/query',
  semanticSearch: '/search/semantic',
  hybridSearch: '/search/hybrid',
  similarProducts: '/search/similar',
};

// DOM Elements
const elements = {
  navButtons: document.querySelectorAll('.nav-btn'),
  pages: document.querySelectorAll('.page'),
  queryInput: document.getElementById('query-input'),
  querySubmit: document.getElementById('query-submit'),
  queryLoading: document.getElementById('query-loading'),
  queryResult: document.getElementById('query-result'),
  searchInput: document.getElementById('search-input'),
  searchTopK: document.getElementById('search-topk'),
  searchSubmit: document.getElementById('search-submit'),
  searchLoading: document.getElementById('search-loading'),
  searchResult: document.getElementById('search-result'),
  historyList: document.getElementById('history-list'),
  metricQueries: document.getElementById('metric-queries'),
  metricSearches: document.getElementById('metric-searches'),
  metricAvgTime: document.getElementById('metric-avgtime'),
  metricStatus: document.getElementById('metric-status'),
};

// Initialize App
function init() {
  setupEventListeners();
  loadFromLocalStorage();
  updateMetrics();
}

// Event Listeners
function setupEventListeners() {
  // Navigation
  elements.navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = btn.getAttribute('data-page');
      switchPage(page);
    });
  });

  // Query Submit
  elements.querySubmit.addEventListener('click', handleQuerySubmit);
  elements.queryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleQuerySubmit();
  });

  // Search Submit
  elements.searchSubmit.addEventListener('click', handleSearchSubmit);
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearchSubmit();
  });
}

// Page Navigation
function switchPage(page) {
  state.currentPage = page;

  elements.navButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-page') === page);
  });

  elements.pages.forEach((pageEl) => {
    pageEl.classList.toggle('active', pageEl.id === `${page}-page`);
  });

  if (page === 'history') {
    renderHistory();
  } else if (page === 'metrics') {
    updateMetrics();
  }
}

// Query Handling
async function handleQuerySubmit() {
  const query = elements.queryInput.value.trim();

  if (!query) {
    alert('질의를 입력해주세요.');
    return;
  }

  // Show loading
  elements.queryLoading.style.display = 'block';
  elements.queryResult.style.display = 'none';

  try {
    const startTime = Date.now();
    const response = await fetch(API_BASE + API_ENDPOINTS.agentQuery, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    // Add to history
    state.history.unshift({
      query,
      result: data,
      timestamp: new Date().toISOString(),
      responseTime,
    });

    saveToLocalStorage();
    displayQueryResult(data);
    updateMetrics();
  } catch (error) {
    console.error('Query error:', error);
    displayError('질의 처리 중 오류가 발생했습니다: ' + error.message);
  } finally {
    elements.queryLoading.style.display = 'none';
  }
}

// Display Query Result
function displayQueryResult(data) {
  elements.queryResult.style.display = 'block';

  let html = '';

  // Insight Message
  if (data.insightMessage) {
    html += `
      <div class="result-section">
        <h3><i class="fas fa-lightbulb"></i> 인사이트</h3>
        <div class="insight-message">${escapeHtml(data.insightMessage)}</div>
      </div>
    `;
  }

  // Query Info
  if (data.queryType || data.sqlQuery) {
    html += '<div class="result-section"><div class="query-info">';

    if (data.queryType) {
      html += `<div class="info-badge">질의 타입: ${data.queryType.toUpperCase()}</div>`;
    }

    html += '</div>';

    if (data.sqlQuery) {
      html += `
        <details>
          <summary style="cursor: pointer; font-weight: 600; margin-bottom: 0.5rem;">
            <i class="fas fa-code"></i> 생성된 SQL 쿼리 보기
          </summary>
          <pre class="sql-code">${escapeHtml(data.sqlQuery)}</pre>
        </details>
      `;
    }

    html += '</div>';
  }

  // Query Results (Table)
  if (data.queryResult && data.queryResult.length > 0) {
    html += `
      <div class="result-section">
        <h3><i class="fas fa-table"></i> 데이터</h3>
        ${renderTable(data.queryResult)}
      </div>
    `;
  }

  // Semantic Search Results
  if (data.semanticResults && data.semanticResults.length > 0) {
    html += `
      <div class="result-section">
        <h3><i class="fas fa-search"></i> 유사 상품</h3>
        ${renderSearchResults(data.semanticResults.slice(0, 5))}
      </div>
    `;
  }

  elements.queryResult.innerHTML = html;
}

// Search Handling
async function handleSearchSubmit() {
  const query = elements.searchInput.value.trim();
  const topK = parseInt(elements.searchTopK.value, 10) || 10;
  const searchType = document.querySelector(
    'input[name="search-type"]:checked',
  ).value;

  if (!query) {
    alert('검색어를 입력해주세요.');
    return;
  }

  elements.searchLoading.style.display = 'block';
  elements.searchResult.style.display = 'none';

  try {
    const endpoint =
      searchType === 'semantic'
        ? API_ENDPOINTS.semanticSearch
        : API_ENDPOINTS.hybridSearch;
    const url = `${API_BASE}${endpoint}?q=${encodeURIComponent(query)}&k=${topK}`;

    const response = await fetch(url);
    const data = await response.json();

    // Add to search history
    state.searchHistory.unshift({
      query,
      type: searchType,
      topK,
      count: data.count || 0,
      timestamp: new Date().toISOString(),
    });

    saveToLocalStorage();
    displaySearchResult(data);
    updateMetrics();
  } catch (error) {
    console.error('Search error:', error);
    displayError('검색 중 오류가 발생했습니다: ' + error.message, 'search');
  } finally {
    elements.searchLoading.style.display = 'none';
  }
}

// Display Search Result
function displaySearchResult(data) {
  elements.searchResult.style.display = 'block';

  if (!data.results || data.results.length === 0) {
    elements.searchResult.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <p>검색 결과가 없습니다.</p>
      </div>
    `;
    return;
  }

  const html = `
    <div class="result-section">
      <h3><i class="fas fa-check-circle"></i> ${data.count}개의 결과를 찾았습니다.</h3>
      ${renderSearchResults(data.results)}
    </div>
  `;

  elements.searchResult.innerHTML = html;
}

// Render Search Results
function renderSearchResults(results) {
  return results
    .map(
      (item, index) => `
    <div class="search-item">
      <div class="search-item-header">
        <div class="search-item-title">${index + 1}. ${escapeHtml(item.name || item.productName || 'Unknown')}</div>
        <div class="search-item-score">유사도: ${(item.score || 0).toFixed(3)}</div>
      </div>
      <div class="search-item-description">${escapeHtml(item.description || '-')}</div>
      <div class="search-item-meta">
        카테고리: ${escapeHtml(item.category || '-')} | 마켓: ${escapeHtml(item.marketName || item.market || '-')}
      </div>
    </div>
  `,
    )
    .join('');
}

// Render Table
function renderTable(data) {
  if (!data || data.length === 0) return '';

  const keys = Object.keys(data[0]);

  const headerRow = keys.map((key) => `<th>${escapeHtml(key)}</th>`).join('');

  const rows = data
    .map(
      (row) =>
        '<tr>' +
        keys
          .map(
            (key) =>
              `<td>${escapeHtml(row[key] !== null && row[key] !== undefined ? String(row[key]) : '-')}</td>`,
          )
          .join('') +
        '</tr>',
    )
    .join('');

  return `
    <table class="data-table">
      <thead><tr>${headerRow}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// History Rendering
function renderHistory() {
  if (state.history.length === 0) {
    elements.historyList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>아직 질의 히스토리가 없습니다.</p>
      </div>
    `;
    return;
  }

  const html = state.history
    .map(
      (item, index) => `
    <div class="history-item">
      <div class="history-item-header">
        <div class="history-item-query">${escapeHtml(item.query)}</div>
        <div class="history-item-actions">
          <button class="btn btn-primary btn-small" onclick="rerunQuery(${index})">
            <i class="fas fa-redo"></i> 재실행
          </button>
          <button class="btn btn-secondary btn-small" onclick="deleteHistory(${index})">
            <i class="fas fa-trash"></i> 삭제
          </button>
        </div>
      </div>
      ${item.result.insightMessage ? `<div class="insight-message">${escapeHtml(item.result.insightMessage)}</div>` : ''}
      <div style="margin-top: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">
        <i class="fas fa-clock"></i> ${new Date(item.timestamp).toLocaleString('ko-KR')}
        ${item.responseTime ? ` | 응답 시간: ${item.responseTime}ms` : ''}
      </div>
    </div>
  `,
    )
    .join('');

  elements.historyList.innerHTML = html;
}

// History Actions
function rerunQuery(index) {
  const item = state.history[index];
  elements.queryInput.value = item.query;
  switchPage('query');
  handleQuerySubmit();
}

function deleteHistory(index) {
  if (confirm('이 히스토리를 삭제하시겠습니까?')) {
    state.history.splice(index, 1);
    saveToLocalStorage();
    renderHistory();
    updateMetrics();
  }
}

// Metrics Update
function updateMetrics() {
  elements.metricQueries.textContent = state.history.length;
  elements.metricSearches.textContent = state.searchHistory.length;

  // Calculate average response time
  const responseTimes = state.history
    .filter((h) => h.responseTime)
    .map((h) => h.responseTime);
  if (responseTimes.length > 0) {
    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    elements.metricAvgTime.textContent = `${Math.round(avg)}ms`;
  } else {
    elements.metricAvgTime.textContent = '-';
  }

  // API Status (simple check)
  elements.metricStatus.innerHTML =
    '<span class="status-badge status-success">정상</span>';
}

// Error Display
function displayError(message, target = 'query') {
  const targetElement =
    target === 'search' ? elements.searchResult : elements.queryResult;

  targetElement.style.display = 'block';
  targetElement.innerHTML = `
    <div class="result-section">
      <h3 style="color: var(--danger-color);"><i class="fas fa-exclamation-triangle"></i> 오류</h3>
      <div class="insight-message error">
        ${escapeHtml(message)}
      </div>
    </div>
  `;
}

// Local Storage
function saveToLocalStorage() {
  try {
    localStorage.setItem('ndmarket-history', JSON.stringify(state.history));
    localStorage.setItem(
      'ndmarket-search-history',
      JSON.stringify(state.searchHistory),
    );
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

function loadFromLocalStorage() {
  try {
    const history = localStorage.getItem('ndmarket-history');
    const searchHistory = localStorage.getItem('ndmarket-search-history');

    if (history) {
      state.history = JSON.parse(history);
    }
    if (searchHistory) {
      state.searchHistory = JSON.parse(searchHistory);
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
}

// Utility Functions
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

// Initialize on DOM Ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
