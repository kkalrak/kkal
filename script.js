// 글로벌 상태
let companiesData = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadCompanies();
    setupSearch();
    // 초기에는 목록을 안 보임 (검색 결과만 표시)
});

// companies.json 로드
async function loadCompanies() {
    try {
        const response = await fetch('companies.json');
        const data = await response.json();
        companiesData = data.companies;
    } catch (error) {
        console.error('회사 목록 로드 실패:', error);
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
        // 검색어 없으면 빈 상태
        const companiesList = document.getElementById('companiesList');
        companiesList.innerHTML = '';
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

    // 각 회사의 매칭 문서들만 표시
    results.forEach(company => {
        company.documents.forEach(doc => {
            const docDiv = document.createElement('div');
            docDiv.style.padding = '0.75rem 1rem';
            docDiv.style.backgroundColor = '#f9f9f9';
            docDiv.style.borderRadius = '6px';
            docDiv.style.marginBottom = '0.5rem';
            docDiv.style.cursor = 'pointer';
            docDiv.style.borderLeft = '4px solid #ddd';
            docDiv.style.transition = 'all 0.3s ease';
            
            // 마우스 오버 효과
            docDiv.addEventListener('mouseenter', () => {
                docDiv.style.backgroundColor = '#f0f0f0';
                docDiv.style.borderLeftColor = '#667eea';
            });
            docDiv.addEventListener('mouseleave', () => {
                docDiv.style.backgroundColor = '#f9f9f9';
                docDiv.style.borderLeftColor = '#ddd';
            });
            
            docDiv.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 0.2rem;">${doc.title}</div>
                <div style="font-size: 0.85rem; color: #999;">${company.name} • ${doc.date}</div>
            `;
            
            docDiv.addEventListener('click', (e) => {
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
    loadDocument(`reports/${document.file}`);
}
