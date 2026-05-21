// 글로벌 상태
let companiesData = [];
let currentReportFile = '';

// 모바일용 게시물 목록 토글 함수
function toggleCompaniesList() {
    const companiesList = document.getElementById('companiesList');
    const toggleBtn = document.getElementById('mobileToggleBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (companiesList.classList.contains('expanded')) {
        companiesList.classList.remove('expanded');
        toggleBtn.innerHTML = '전체 목록';
    } else {
        if (searchInput && searchInput.value.trim()) {
            searchInput.value = '';
            renderAllDocuments();
        }
        companiesList.classList.add('expanded');
        toggleBtn.innerHTML = '목록 닫기';
    }
}

// URL 파라미터 파싱 함수
function getUrlParam(param) {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
}

// report 파라미터가 확장자 없이 들어와도 실제 파일명으로 보정
function normalizeReportFileName(fileName) {
    if (!fileName) {
        return '';
    }
    return fileName.endsWith('.md') ? fileName : `${fileName}.md`;
}

// companiesData에서 특정 분류 찾기
function findCompanyById(companyId) {
    return companiesData.find(company => company.id === companyId);
}

// Schema.org Article 스키마 동적 업데이트
function updateArticleSchema(title, description, datePublished, url) {
    const articleSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "url": url,
        "datePublished": datePublished,
        "dateModified": new Date().toISOString().split('T')[0],
        "author": {
            "@type": "Organization",
            "name": "깔깔 주식 보고서"
        },
        "publisher": {
            "@type": "Organization",
            "name": "깔깔 주식 보고서",
            "logo": {
                "@type": "ImageObject",
                "url": "https://kkal.pages.dev/",
                "width": 100,
                "height": 100
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": url
        }
    };
    
    // 기존 article-schema 제거
    const existingSchema = document.getElementById('article-schema');
    if (existingSchema) {
        existingSchema.remove();
    }
    
    // 새로운 스키마 추가
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'article-schema';
    script.textContent = JSON.stringify(articleSchema);
    document.head.appendChild(script);
    
    console.log('📊 Schema.org 업데이트:', title);
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    await loadCompanies();
    setupSearch();
    
    // URL에서 report 파라미터 확인
    const reportParam = getUrlParam('report');
    const companyParam = getUrlParam('company');
    const searchParam = getUrlParam('search');
    
    if (reportParam) {
        // 특정 보고서가 요청됨
        renderAllDocuments();
        const decodedReport = normalizeReportFileName(decodeURIComponent(reportParam));
        loadDocument(`reports/${decodedReport}`);
    } else if (companyParam) {
        renderAllDocuments();
        renderCompanyPage(decodeURIComponent(companyParam));
    } else if (searchParam) {
        renderAllDocuments();
        const searchInput = document.getElementById('searchInput');
        searchInput.value = decodeURIComponent(searchParam);
        performSearch();
        renderSearchIntro(searchInput.value);
    } else {
        // 초기에 모든 문서를 나열
        renderAllDocuments();
        // 최신 2개 보고서를 전체 내용과 함께 표시
        await displayLatestReports();
    }
});

// companies.json 로드
async function loadCompanies() {
    try {
        const response = await fetch('companies.json');
        const data = await response.json();
        companiesData = data.companies;
        
        // specials 섹션이 있으면 추가
        if (data.specials && Array.isArray(data.specials)) {
            companiesData = companiesData.concat(data.specials);
        }
        
        console.log('회사 목록 로드 완료:', companiesData.length, '개 항목');
        return true;
    } catch (error) {
        console.error('회사 목록 로드 실패:', error);
        return false;
    }
}



// 문서 로드 및 렌더링
async function loadDocument(filePath) {
    // URL 업데이트
    const fileName = filePath.replace(/^reports\//, '');
    currentReportFile = normalizeReportFileName(fileName);
    updateActiveDocument();
    const newUrl = `?report=${encodeURIComponent(fileName)}`;
    if (window.location.search !== newUrl) {
        window.history.pushState({ report: fileName }, '', newUrl);
    }
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${filePath}`);
        }
        const markdown = await response.text();
        
        // 마크다운에서 제목과 요약 추출
        const lines = markdown.split('\n');
        let title = '깔깔 주식 보고서';
        let description = '투자자를 위한 종합 분석 플랫폼';
        let datePublished = new Date().toISOString().split('T')[0];
        
        // # 제목 찾기
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            if (lines[i].startsWith('# ')) {
                title = lines[i].replace('# ', '').trim();
                break;
            }
        }
        
        // 작성일 찾기 (작성일: YYYY-MM-DD 형식)
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const dateMatch = lines[i].match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
                datePublished = dateMatch[1];
                break;
            }
        }
        
        // 설명 찾기 (Executive Summary 섹션의 첫 문장들)
        let foundSummary = false;
        let summaryText = '';
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('Executive Summary') || lines[i].includes('요약') || lines[i].includes('Summary')) {
                foundSummary = true;
                continue;
            }
            if (foundSummary && lines[i].trim() && !lines[i].startsWith('#')) {
                summaryText += lines[i].trim() + ' ';
                if (summaryText.length > 150) break;
            }
        }
        
        // 설명이 없으면 기본값 사용
        if (summaryText.length > 20) {
            description = summaryText.substring(0, 150).replace(/```/g, '').replace(/[*`]/g, '').trim();
        }
        
        // Schema.org 업데이트 (Google 검색 최적화)
        const fullUrl = window.location.href;
        updateArticleSchema(title, description, datePublished, fullUrl);
        
        // 브라우저 탭 제목 업데이트
        document.title = title + ' - 깔깔 주식 보고서';
        
        // marked 사용 (window.marked)
        let html;
        if (typeof window.marked === 'function') {
            html = window.marked(markdown);
        } else if (window.marked && typeof window.marked.parse === 'function') {
            html = window.marked.parse(markdown);
        } else {
            throw new Error('marked 라이브러리를 로드할 수 없습니다');
        }
        
        const reportContainer = document.getElementById('reportContainer');
        reportContainer.innerHTML = `<div class="report-content">${html}</div>`;
        updateActiveDocument();
    } catch (error) {
        console.error('문서 로드 실패:', error);
        const reportContainer = document.getElementById('reportContainer');
        reportContainer.innerHTML = `<p class="state-message is-error">문서를 불러올 수 없습니다: ${error.message}</p>`;
    }
}

function normalizeSearchText(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, '');
}

function matchesDocumentSearch(query, company, doc) {
    const normalizedQuery = normalizeSearchText(query);
    const terms = [normalizedQuery];

    if (normalizedQuery.includes('spacex') || normalizedQuery.includes('space-x')) {
        terms.push('스페이스x');
    }

    const haystack = normalizeSearchText([
        doc.title,
        company.name,
        company.ticker,
        company.id
    ].join(' '));

    return terms.some(term => term && haystack.includes(term));
}

function updateActiveDocument() {
    document.querySelectorAll('.document-item').forEach(item => {
        const isActive = item.dataset.file === currentReportFile;
        item.classList.toggle('is-active', isActive);
        if (isActive) {
            item.setAttribute('aria-current', 'page');
        } else {
            item.removeAttribute('aria-current');
        }
    });
}

function closeMobileDocumentList() {
    if (window.matchMedia('(max-width: 768px)').matches) {
        const companiesList = document.getElementById('companiesList');
        const toggleBtn = document.getElementById('mobileToggleBtn');
        companiesList.classList.remove('expanded');
        toggleBtn.innerHTML = '전체 목록';
    }
}

// 검색 기능 설정
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    // 버튼 클릭
    searchBtn.addEventListener('click', performSearch);

    // Enter 키
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // 실시간 검색
    searchInput.addEventListener('input', performSearch);
}

// 최신 2개 보고서를 전체 내용과 함께 표시
async function displayLatestReports() {
    try {
        console.log('최신 보고서 로드 시작, companiesData:', companiesData);
        
        if (!companiesData || companiesData.length === 0) {
            console.error('companiesData가 비어있음');
            document.getElementById('reportContainer').innerHTML = '<p class="state-message is-error">데이터 로드 실패. 페이지를 새로고침 해주세요.</p>';
            return;
        }
        
        // 모든 문서를 날짜순으로 정렬
        const allDocuments = [];
        
        companiesData.forEach(company => {
            company.documents.forEach(doc => {
                allDocuments.push({
                    company: company,
                    document: doc,
                    dateKey: doc.date.replace(/[^\d]/g, '')
                });
            });
        });
        
        // 최신순으로 정렬
        allDocuments.sort((a, b) => b.dateKey - a.dateKey);
        const latestReports = allDocuments.slice(0, 2);
        
        console.log('최신 2개 보고서:', latestReports);
        
        // 헤더 표시
        const reportContainer = document.getElementById('reportContainer');
        reportContainer.innerHTML = `
            <div class="latest-reports-container">
                <div class="latest-reports-header">
                    <h2>최신 글 2개</h2>
                    <p>가장 최근에 작성된 2개의 분석 보고서</p>
                </div>
                <div id="reportsContent" class="reports-content">
                    <p class="state-message">보고서 로딩 중...</p>
                </div>
            </div>
        `;
        
        // 각 보고서 로드
        let htmlContent = '';
        let loadCount = 0;
        
        for (const item of latestReports) {
            loadCount++;
            try {
                const response = await fetch(`reports/${item.document.file}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const markdown = await response.text();
                
                let documentHtml;
                if (typeof window.marked === 'function') {
                    documentHtml = window.marked(markdown);
                } else if (window.marked && typeof window.marked.parse === 'function') {
                    documentHtml = window.marked.parse(markdown);
                }
                
                const badgeClass = item.company.id === 'koreazinc' ? 'report-badge is-alert' : 'report-badge';
                const badgeText = item.company.id === 'koreazinc' ? '주의' : '분석';
                
                htmlContent += `
                    <div class="latest-report-card">
                        <div class="latest-report-header">
                            <div class="latest-report-heading">
                                <div class="${badgeClass}">${badgeText} • ${loadCount}/2</div>
                                <h3 class="latest-report-title">
                                    ${item.document.title}
                                </h3>
                                <p class="report-meta">
                                    <strong>${item.company.name}</strong> (${item.company.ticker}) • ${item.document.date}
                                </p>
                            </div>
                            <a href="#" onclick="loadDocument('reports/${item.document.file}'); return false;" 
                               class="report-open-link">
                                전체 보기
                            </a>
                        </div>
                        <div class="report-content latest-report-body">
                            ${documentHtml}
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error(`보고서 로드 실패: ${item.document.file}`, error);
                htmlContent += `
                    <div class="empty-state is-warning">
                        <p>보고서를 불러올 수 없습니다: ${item.document.title}</p>
                    </div>
                `;
            }
        }
        
        document.getElementById('reportsContent').innerHTML = htmlContent;
    } catch (error) {
        console.error('최신 보고서 로드 실패:', error);
        const reportContainer = document.getElementById('reportContainer');
        reportContainer.innerHTML = `<p class="state-message is-error">최신 보고서를 불러올 수 없습니다: ${error.message}</p>`;
    }
}

// company 파라미터용 분류 페이지 렌더링
function renderCompanyPage(companyId) {
    const company = findCompanyById(companyId);
    const reportContainer = document.getElementById('reportContainer');

    if (!company) {
        reportContainer.innerHTML = `<p class="state-message is-error">분류를 찾을 수 없습니다: ${companyId}</p>`;
        return;
    }

    const docs = company.documents
        .map(doc => ({
            ...doc,
            dateKey: doc.date.replace(/[^\d]/g, '')
        }))
        .sort((a, b) => b.dateKey - a.dateKey);

    const companiesList = document.getElementById('companiesList');
    companiesList.innerHTML = '';
    companiesList.classList.remove('initial');

    docs.forEach((doc, index) => {
        const docDiv = document.createElement('div');
        docDiv.className = 'document-item';
        docDiv.dataset.file = normalizeReportFileName(doc.file);
        docDiv.innerHTML = `
            <div class="document-title">
                ${index + 1}. ${doc.title}
            </div>
            <div class="document-meta">
                ${company.name} • ${doc.date}
            </div>
        `;
        docDiv.addEventListener('click', () => selectDocument(company, doc));
        companiesList.appendChild(docDiv);
    });
    updateActiveDocument();

    const docLinks = docs.map(doc => `
        <div class="company-doc-link">
            <h3>${doc.title}</h3>
            <p>${company.name} (${company.ticker}) • ${doc.date}</p>
            <a href="?report=${encodeURIComponent(doc.file)}" onclick="loadDocument('reports/${doc.file}'); return false;" class="text-link">보고서 보기</a>
        </div>
    `).join('');

    reportContainer.innerHTML = `
        <div class="report-content">
            <h1>${company.name}</h1>
            <p>${company.ticker}</p>
            <h2>보고서 목록</h2>
            ${docLinks}
        </div>
    `;

    document.title = `${company.name} - 깔깔 주식 보고서`;
}

// search 파라미터용 안내 화면
function renderSearchIntro(query) {
    const reportContainer = document.getElementById('reportContainer');
    reportContainer.innerHTML = `
        <div class="report-content">
            <h1>검색 결과</h1>
            <p><strong>${query}</strong> 검색 결과를 왼쪽 목록에서 확인하세요.</p>
        </div>
    `;
    document.title = `"${query}" 검색 결과 - 깔깔 주식 보고서`;
}

// 모든 문서를 나열 (최신순 내림차순)
function renderAllDocuments() {
    const companiesList = document.getElementById('companiesList');
    companiesList.innerHTML = '';
    companiesList.classList.add('initial'); // 초기 목록에 'initial' 클래스 추가

    // 모든 문서를 배열로 수집
    const allDocs = [];
    companiesData.forEach(company => {
        company.documents.forEach(doc => {
            allDocs.push({
                company: company,
                doc: doc,
                dateKey: doc.date.replace(/[^\d]/g, '')
            });
        });
    });

    // 최신순으로 정렬 (내림차순)
    allDocs.sort((a, b) => b.dateKey - a.dateKey);

    // 정렬된 문서 표시
    allDocs.forEach((item, index) => {
        const docDiv = document.createElement('div');
        docDiv.className = 'document-item';
        docDiv.dataset.file = normalizeReportFileName(item.doc.file);
        
        docDiv.innerHTML = `
            <div class="document-title">
                ${index + 1}. ${item.doc.title}
            </div>
            <div class="document-meta">
                ${item.company.name} • ${item.doc.date}
            </div>
        `;
        
        docDiv.addEventListener('click', (e) => {
            selectDocument(item.company, item.doc);
        });
        
        companiesList.appendChild(docDiv);
    });
    updateActiveDocument();
}

// 검색 수행
function performSearch() {
    const query = document.getElementById('searchInput').value.trim();

    if (!query) {
        // 검색어 없으면 모든 문서 표시
        renderAllDocuments();
        return;
    }

    // 제목, 분류명, 종목코드, id 검색
    const results = [];
    
    companiesData.forEach(company => {
        const matchingDocs = company.documents.filter(doc =>
            matchesDocumentSearch(query, company, doc)
        );
        
        if (matchingDocs.length > 0) {
            results.push({
                ...company,
                documents: matchingDocs
            });
        }
    });

    // 검색 결과 렌더링
    renderSearchResults(results, query);
}

// 검색 결과 렌더링 (최신순 내림차순)
function renderSearchResults(results, query) {
    const companiesList = document.getElementById('companiesList');
    companiesList.innerHTML = '';
    companiesList.classList.remove('initial'); // 검색 결과는 'initial' 클래스 제거

    if (results.length === 0) {
        companiesList.innerHTML = `
            <div class="empty-state">
                <p>검색 결과 없음: "${query}"</p>
                <button type="button" class="inline-action-button" onclick="document.getElementById('searchInput').value=''; renderAllDocuments(); document.getElementById('companiesList').classList.add('expanded'); document.getElementById('mobileToggleBtn').innerHTML='목록 닫기';">
                    전체 목록 보기
                </button>
            </div>
        `;
        return;
    }

    // 검색 결과 문서들을 배열로 수집
    const allSearchDocs = [];
    results.forEach(company => {
        company.documents.forEach(doc => {
            allSearchDocs.push({
                company: company,
                doc: doc,
                dateKey: doc.date.replace(/[^\d]/g, '')
            });
        });
    });

    // 최신순으로 정렬 (내림차순)
    allSearchDocs.sort((a, b) => b.dateKey - a.dateKey);

    const resultSummary = document.createElement('div');
    resultSummary.className = 'search-result-summary';
    resultSummary.textContent = `"${query}" 검색 결과 ${allSearchDocs.length}건`;
    companiesList.appendChild(resultSummary);

    // 정렬된 검색 결과 표시
    allSearchDocs.forEach((item, index) => {
        const docDiv = document.createElement('div');
        docDiv.className = 'document-item';
        docDiv.dataset.file = normalizeReportFileName(item.doc.file);
        
        docDiv.innerHTML = `
            <div class="document-title">
                ${index + 1}. ${item.doc.title}
            </div>
            <div class="document-meta">
                ${item.company.name} • ${item.doc.date}
            </div>
        `;
        
        docDiv.addEventListener('click', (e) => {
            selectDocument(item.company, item.doc);
        });
        
        companiesList.appendChild(docDiv);
    });
    updateActiveDocument();
}

// 프린트 함수
function printReport() {
    window.print();
}

// 문서 선택 및 로드
function selectDocument(company, document) {
    // URL 업데이트 (브라우저 주소창에 반영)
    const newUrl = `?report=${encodeURIComponent(normalizeReportFileName(document.file))}`;
    window.history.pushState({ report: document.file }, document.title, newUrl);
    
    // 문서 로드
    loadDocument(`reports/${normalizeReportFileName(document.file)}`);
    closeMobileDocumentList();
}

// 현재 페이지 링크 복사 함수
function copyCurrentLink(e) {
    const url = window.location.href;
    const button = e.currentTarget;
    
    // 클립보드에 복사
    navigator.clipboard.writeText(url).then(() => {
        // 복사 성공 - 버튼 피드백
        const originalText = button.innerHTML;
        button.innerHTML = '링크 복사됨';
        button.classList.add('is-copied');
        
        // 2초 후 원래 상태로 복구
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('is-copied');
        }, 2000);
    }).catch(err => {
        alert('링크 복사 실패: ' + err);
    });
}

// 문서 로드 시 링크 복사 버튼 추가
const originalLoadDocument = loadDocument;
loadDocument = async function(filePath) {
    // 원래 함수 실행
    await originalLoadDocument(filePath);
    
    // 링크 복사 버튼 추가
    const reportContainer = document.getElementById('reportContainer');
    
    // 기존 버튼 제거
    const existingButton = document.getElementById('copyLinkButton');
    if (existingButton) {
        existingButton.remove();
    }
    
    // 새 버튼 생성
    const copyButton = document.createElement('div');
    copyButton.id = 'copyLinkButton';
    copyButton.className = 'copy-link-button';
    copyButton.innerHTML = '링크 복사';
    copyButton.addEventListener('click', copyCurrentLink);
    
    reportContainer.prepend(copyButton);
};
