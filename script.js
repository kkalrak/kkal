// 글로벌 상태
let companiesData = [];

// URL 파라미터 파싱 함수
function getUrlParam(param) {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
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
                "url": "https://kkal-stock-reports.pages.dev/",
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
    
    if (reportParam) {
        // 특정 보고서가 요청됨
        const decodedReport = decodeURIComponent(reportParam);
        loadDocument(`reports/${decodedReport}`);
    } else {
        // 초기에 모든 문서를 나열
        renderAllDocuments();
        // 최신 10개 보고서를 전체 내용과 함께 표시
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
    try {
        const response = await fetch(filePath);
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
        console.log('최신 보고서 로드 시작, companiesData:', companiesData);
        
        if (!companiesData || companiesData.length === 0) {
            console.error('companiesData가 비어있음');
            document.getElementById('reportContainer').innerHTML = '<p>데이터 로드 실패. 페이지를 새로고침 해주세요.</p>';
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
        const latestTen = allDocuments.slice(0, 10);
        
        console.log('최신 10개 보고서:', latestTen);
        
        // 헤더 표시
        const reportContainer = document.getElementById('reportContainer');
        reportContainer.innerHTML = `
            <div class="latest-reports-container">
                <div style="margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 3px solid #667eea;">
                    <h2 style="margin: 0 0 0.5rem 0; color: #333; font-size: 2rem;">📰 최신 게시물 TOP 10</h2>
                    <p style="margin: 0; color: #666; font-size: 1.1rem;">가장 최근에 작성된 10개의 분석 보고서</p>
                </div>
                <div id="reportsContent" style="margin-top: 2rem;">
                    <p style="color: #999; text-align: center;">보고서 로딩 중...</p>
                </div>
            </div>
        `;
        
        // 각 보고서 로드
        let htmlContent = '';
        let loadCount = 0;
        
        for (const item of latestTen) {
            loadCount++;
            try {
                const response = await fetch(`reports/${item.document.file}`);
                const markdown = await response.text();
                
                let documentHtml;
                if (typeof window.marked === 'function') {
                    documentHtml = window.marked(markdown);
                } else if (window.marked && typeof window.marked.parse === 'function') {
                    documentHtml = window.marked.parse(markdown);
                }
                
                const badgeColor = item.company.id === 'koreazinc' ? '#ff6b6b' : '#667eea';
                const badgeText = item.company.id === 'koreazinc' ? '🚨 주의' : '📊 분석';
                
                htmlContent += `
                    <div class="latest-report-card" style="
                        margin-bottom: 2rem;
                        padding: 1.2rem;
                        background: linear-gradient(135deg, #f8f9ff 0%, #fff 100%);
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        box-shadow: 0 2px 6px rgba(102, 126, 234, 0.08);
                        transition: all 0.3s ease;
                    " 
                    onmouseover="this.style.boxShadow='0 8px 20px rgba(102, 126, 234, 0.2)'; this.style.transform='translateY(-2px)';"
                    onmouseout="this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.1)'; this.style.transform='translateY(0)';">
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            margin-bottom: 1rem;
                            padding-bottom: 1rem;
                            border-bottom: 2px solid rgba(102, 126, 234, 0.1);
                        ">
                            <div style="flex: 1;">
                                <div style="
                                    display: inline-block;
                                    padding: 0.4rem 0.8rem;
                                    background: ${badgeColor};
                                    color: white;
                                    border-radius: 4px;
                                    font-size: 0.75rem;
                                    font-weight: bold;
                                    margin-bottom: 0.5rem;
                                ">${badgeText} • ${loadCount}/10</div>
                                <h3 style="margin: 0.5rem 0 0 0; color: #333; font-size: 1.3rem; line-height: 1.4;">
                                    ${item.document.title}
                                </h3>
                                <p style="margin: 0.5rem 0 0 0; color: #999; font-size: 0.95rem;">
                                    <strong style="color: #667eea;">${item.company.name}</strong> (${item.company.ticker}) • ${item.document.date}
                                </p>
                            </div>
                            <a href="#" onclick="loadDocument('reports/${item.document.file}'); return false;" 
                               style="
                                padding: 0.7rem 1.5rem;
                                background: #667eea;
                                color: white;
                                text-decoration: none;
                                border-radius: 6px;
                                font-size: 0.9rem;
                                font-weight: bold;
                                white-space: nowrap;
                                margin-left: 1rem;
                                transition: all 0.2s ease;
                            "
                            onmouseover="this.style.background='#5568d3'; this.style.transform='scale(1.05)';"
                            onmouseout="this.style.background='#667eea'; this.style.transform='scale(1)';">
                                📄 전체 보기
                            </a>
                        </div>
                        <div class="report-content" style="
                            font-size: 0.95rem;
                            line-height: 1.7;
                            color: #555;
                        ">
                            ${documentHtml}
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error(`보고서 로드 실패: ${item.document.file}`, error);
                htmlContent += `
                    <div style="
                        margin-bottom: 3rem;
                        padding: 2rem;
                        background: #fff3cd;
                        border: 2px solid #ffc107;
                        border-radius: 8px;
                    ">
                        <p style="color: #856404;">⚠️ 보고서를 불러올 수 없습니다: ${item.document.title}</p>
                    </div>
                `;
            }
        }
        
        document.getElementById('reportsContent').innerHTML = htmlContent;
    } catch (error) {
        console.error('최신 보고서 로드 실패:', error);
        const reportContainer = document.getElementById('reportContainer');
        reportContainer.innerHTML = `<p style="color: red;">최신 보고서를 불러올 수 없습니다: ${error.message}</p>`;
    }
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
            <div style="font-weight: 600; margin-bottom: 0.2rem; color: #333;">
                ${index + 1}. ${item.doc.title}
            </div>
            <div style="font-size: 0.85rem; color: #999;">
                ${item.company.name} • ${item.doc.date}
            </div>
        `;
        
        docDiv.addEventListener('click', (e) => {
            selectDocument(item.company, item.doc);
        });
        
        companiesList.appendChild(docDiv);
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

// 검색 결과 렌더링 (최신순 내림차순)
function renderSearchResults(results, query) {
    const companiesList = document.getElementById('companiesList');
    companiesList.innerHTML = '';
    companiesList.classList.remove('initial'); // 검색 결과는 'initial' 클래스 제거

    if (results.length === 0) {
        companiesList.innerHTML = `<p style="color: #999; font-size: 0.9rem;">검색 결과 없음: "${query}"</p>`;
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

    // 정렬된 검색 결과 표시
    allSearchDocs.forEach((item, index) => {
        const docDiv = document.createElement('div');
        docDiv.style.padding = '0.75rem 1rem';
        docDiv.style.backgroundColor = '#f9f9f9';
        docDiv.style.borderRadius = '6px';
        docDiv.style.marginBottom = '0.5rem';
        docDiv.style.cursor = 'pointer';
        docDiv.style.borderLeft = '4px solid #667eea';
        docDiv.style.transition = 'all 0.3s ease';
        
        // 마우스 오버 효과
        docDiv.addEventListener('mouseenter', () => {
            docDiv.style.backgroundColor = '#f0f0f0';
            docDiv.style.borderLeftColor = '#667eea';
        });
        docDiv.addEventListener('mouseleave', () => {
            docDiv.style.backgroundColor = '#f9f9f9';
            docDiv.style.borderLeftColor = '#667eea';
        });
        
        docDiv.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 0.2rem; color: #333;">
                ${index + 1}. ${item.doc.title}
            </div>
            <div style="font-size: 0.85rem; color: #999;">
                ${item.company.name} • ${item.doc.date}
            </div>
        `;
        
        docDiv.addEventListener('click', (e) => {
            selectDocument(item.company, item.doc);
        });
        
        companiesList.appendChild(docDiv);
    });
}

// 프린트 함수
function printReport() {
    window.print();
}

// 문서 선택 및 로드
function selectDocument(company, document) {
    // URL 업데이트 (브라우저 주소창에 반영)
    const newUrl = `?report=${encodeURIComponent(document.file)}`;
    window.history.pushState({ report: document.file }, document.title, newUrl);
    
    // 문서 로드
    loadDocument(`reports/${document.file}`);
}

// 현재 페이지 링크 복사 함수
function copyCurrentLink(e) {
    const url = window.location.href;
    const button = e.currentTarget;
    
    // 클립보드에 복사
    navigator.clipboard.writeText(url).then(() => {
        // 복사 성공 - 버튼 피드백
        const originalText = button.innerHTML;
        button.innerHTML = '✅ 링크 복사됨!';
        button.style.background = '#4CAF50';
        
        // 2초 후 원래 상태로 복구
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '#667eea';
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
    copyButton.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        background: #667eea;
        color: white;
        border: none;
        padding: 0.8rem 1.5rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;
    copyButton.innerHTML = '🔗 링크 복사';
    copyButton.addEventListener('click', copyCurrentLink);
    
    // 마우스 오버 효과
    copyButton.addEventListener('mouseenter', () => {
        copyButton.style.background = '#5568d3';
        copyButton.style.transform = 'scale(1.05)';
        copyButton.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
    });
    copyButton.addEventListener('mouseleave', () => {
        copyButton.style.background = '#667eea';
        copyButton.style.transform = 'scale(1)';
        copyButton.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
    });
    
    document.body.appendChild(copyButton);
};
