// 글로벌 상태
let companiesData = [];
let currentCompany = null;
let currentDocuments = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadCompanies();
    setupSearch();
});

// companies.json 로드
async function loadCompanies() {
    try {
        const response = await fetch('companies.json');
        const data = await response.json();
        companiesData = data.companies;
        renderCompanies();
    } catch (error) {
        console.error('회사 목록 로드 실패:', error);
        document.getElementById('companiesList').innerHTML = '<p>오류: 회사 목록을 불러올 수 없습니다.</p>';
    }
}

// 회사 목록 렌더링
function renderCompanies() {
    const companiesList = document.getElementById('companiesList');
    companiesList.innerHTML = '';

    companiesData.forEach(company => {
        const companyDiv = document.createElement('div');
        companyDiv.className = 'company-item';
        companyDiv.innerHTML = `
            <div class="company-name">${company.name}</div>
            <div class="company-ticker">${company.ticker}</div>
        `;
        companyDiv.addEventListener('click', () => selectCompany(company));
        companiesList.appendChild(companyDiv);
    });
}

// 회사 선택
async function selectCompany(company) {
    currentCompany = company;
    updateCompanySelection();
    await loadDocuments(company.id);
}

// 회사 선택 상태 업데이트
function updateCompanySelection() {
    document.querySelectorAll('.company-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const items = document.querySelectorAll('.company-item');
    items.forEach((item, index) => {
        if (companiesData[index].id === currentCompany.id) {
            item.classList.add('active');
        }
    });
}

// 회사의 문서 목록 로드 (폴더에서 찾기)
async function loadDocuments(companyId) {
    try {
        // reports/{companyId}/ 폴더에서 문서 목록을 로드
        // GitHub API를 사용하거나, 미리 정의된 문서 목록을 사용
        
        // 현재는 예제로 폴더 경로를 사용
        const folderPath = `reports/${companyId}/`;
        
        // 실제로는 다음과 같이 구성:
        // 1. GitHub API 사용 (private repo는 토큰 필요)
        // 2. 또는 manifest 파일 사용
        // 3. 또는 동적으로 디렉토리 탐색 (Node.js 필요)
        
        // 지금은 간단하게 기본 구조만 표시
        const reportContainer = document.getElementById('reportContainer');
        reportContainer.innerHTML = `
            <div class="document-list">
                <h3>${currentCompany.name} 보고서</h3>
                <p style="color: #999; font-size: 0.9rem;">보고서 파일: <code>${folderPath}</code></p>
                <p style="color: #999; font-size: 0.9rem;">문서를 추가하면 여기에 표시됩니다.</p>
            </div>
        `;
    } catch (error) {
        console.error('문서 로드 실패:', error);
    }
}

// 문서 로드 및 렌더링 (나중에 구현)
async function loadDocument(filePath) {
    try {
        const response = await fetch(filePath);
        const markdown = await response.text();
        const html = marked(markdown);
        
        const reportContainer = document.getElementById('reportContainer');
        reportContainer.innerHTML = `<div class="report-content">${html}</div>`;
    } catch (error) {
        console.error('문서 로드 실패:', error);
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

// 검색 수행
function performSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();

    if (!query) {
        // 검색어 없으면 원래 목록으로 돌아가기
        renderCompanies();
        return;
    }

    // 제목으로만 검색
    const results = [];
    
    companiesData.forEach(company => {
        const matchingDocs = company.documents.filter(doc =>
            doc.title.toLowerCase().includes(query)
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

// 검색 결과 렌더링
function renderSearchResults(results, query) {
    const companiesList = document.getElementById('companiesList');
    companiesList.innerHTML = '';

    if (results.length === 0) {
        companiesList.innerHTML = `<p style="color: #999; font-size: 0.9rem;">검색 결과 없음: "${query}"</p>`;
        return;
    }

    results.forEach(company => {
        const companyDiv = document.createElement('div');
        companyDiv.className = 'company-item';
        companyDiv.innerHTML = `
            <div class="company-name">${company.name}</div>
            <div class="company-ticker">${company.ticker}</div>
        `;
        companyDiv.addEventListener('click', () => selectCompany(company));
        companiesList.appendChild(companyDiv);

        // 각 회사의 매칭 문서들을 표시
        company.documents.forEach(doc => {
            const docDiv = document.createElement('div');
            docDiv.style.marginLeft = '10px';
            docDiv.style.marginTop = '5px';
            docDiv.style.paddingLeft = '10px';
            docDiv.style.borderLeft = '2px solid #ddd';
            docDiv.style.fontSize = '0.85rem';
            docDiv.style.color = '#666';
            docDiv.style.cursor = 'pointer';
            docDiv.textContent = `📄 ${doc.title}`;
            docDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                selectDocument(company, doc);
            });
            companiesList.appendChild(docDiv);
        });
    });
}

// 프린트 함수
function printReport() {
    window.print();
}

// 문서 선택 및 로드
function selectDocument(company, document) {
    currentCompany = company;
    loadDocument(`reports/${document.file}`);
}
