// 글로벌 상태
let companiesData = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadCompanies();
    setupSearch();
    // 초기에 모든 문서를 나열
    renderAllDocuments();
    // 최신 10개 보고서를 전체 내용과 함께 표시
    displayLatestReports();
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



// 문서 로드 및 렌더링
async function loadDocument(filePath) {
    try {
        const response = await fetch(filePath);
        const markdown = await response.text();
        
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
    } catch (error) {
        console.error('문서 로드 실패:', error);
        const reportContainer = document.getElementById('reportContainer');
        reportContainer.innerHTML = `<p style="color: red;">문서를 불러올 수 없습니다: ${error.message}</p>`;
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

// 최신 10개 보고서를 전체 내용과 함께 표시
async function displayLatestReports() {
    try {
        // 모든 문서를 날짜순으로 정렬
        const allDocuments = [];
        
        companiesData.forEach(company => {
            company.documents.forEach(doc => {
                allDocuments.push({
                    company: company,
                    document: doc,
                    // 날짜 형식을 정렬 가능하도록 변환 (예: "2026-03-18 17:11")
                    dateKey: doc.date.replace(/[^\d]/g, '') // 숫자만 추출
                });
            });
        });
        
        // 최신순으로 정렬 (역순)
        allDocuments.sort((a, b) => b.dateKey - a.dateKey);
        
        // 최신 10개만 선택
        const latestTen = allDocuments.slice(0, 10);
        
        // 각 보고서의 내용을 로드
        let htmlContent = '';
        
        for (const item of latestTen) {
            try {
                const response = await fetch(`reports/${item.document.file}`);
                const markdown = await response.text();
                
                // marked 사용
                let documentHtml;
                if (typeof window.marked === 'function') {
                    documentHtml = window.marked(markdown);
                } else if (window.marked && typeof window.marked.parse === 'function') {
                    documentHtml = window.marked.parse(markdown);
                }
                
                // 각 보고서를 카드 형식으로 표시
                htmlContent += `
                    <div class="latest-report-card" style="
                        margin-bottom: 3rem;
                        padding: 2rem;
                        background: white;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                    ">
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: start;
                            margin-bottom: 1rem;
                            padding-bottom: 1rem;
                            border-bottom: 2px solid #f0f0f0;
                        ">
                            <div>
                                <h3 style="margin: 0 0 0.5rem 0; color: #333;">${item.document.title}</h3>
                                <p style="margin: 0; color: #999; font-size: 0.9rem;">
                                    <strong>${item.company.name}</strong> (${item.company.ticker}) • ${item.document.date}
                                </p>
                            </div>
                            <a href="#" onclick="loadDocument('reports/${item.document.file}'); return false;" 
                               style="
                                padding: 0.5rem 1rem;
                                background: #667eea;
                                color: white;
                                text-decoration: none;
                                border-radius: 4px;
                                font-size: 0.85rem;
                                white-space: nowrap;
                            ">전체 보기</a>
                        </div>
                        <div class="report-content" style="
                            font-size: 0.95rem;
                            line-height: 1.6;
                            color: #333;
                        ">${documentHtml}</div>
                    </div>
                `;
            } catch (error) {
                console.error(`보고서 로드 실패: ${item.document.file}`, error);
                htmlContent += `
                    <div class="latest-report-card" style="
                        margin-bottom: 3rem;
                        padding: 2rem;
                        background: #fff3cd;
                        border: 1px solid #ffc107;
                        border-radius: 8px;
                    ">
                        <p>보고서를 불러올 수 없습니다: ${item.document.title}</p>
                    </div>
                `;
            }
        }
        
        // 최종 HTML을 reportContainer에 표시
        const reportContainer = document.getElementById('reportContainer');
        reportContainer.innerHTML = `
            <div class="latest-reports-container">
                <div style="margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 2px solid #e0e0e0;">
                    <h2 style="margin: 0 0 0.5rem 0;">📰 최신 게시물</h2>
                    <p style="margin: 0; color: #666;">총 ${latestTen.length}개의 최신 보고서입니다.</p>
                </div>
                ${htmlContent}
            </div>
        `;
    } catch (error) {
        console.error('최신 보고서 로드 실패:', error);
        const reportContainer = document.getElementById('reportContainer');
        reportContainer.innerHTML = `<p style="color: red;">최신 보고서를 불러올 수 없습니다: ${error.message}</p>`;
    }
}

// 모든 문서를 나열
function renderAllDocuments() {
    const companiesList = document.getElementById('companiesList');
    companiesList.innerHTML = '';

    companiesData.forEach(company => {
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

// 검색 수행
function performSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();

    if (!query) {
        // 검색어 없으면 모든 문서 표시
        renderAllDocuments();
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
