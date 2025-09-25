/* --- Ailey & Bailey Canvas --- */
// File: 014_utils_visualization_renderer.js
// Version: 5.0 (Sequential Add-on Loading)
// Description: Upgraded to support sequential script loading for libraries with dependencies (add-ons).

// [HCA] A centralized, Promise-based script loader to handle asynchronous loading and prevent duplicates.
const loadedScripts = new Set();
function loadScript(url) {
    if (loadedScripts.has(url)) {
        trace("System.Render", "loadScript.cacheHit", { url });
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        trace("System.Render", "loadScript.request", { url });
        const script = document.createElement('script');
        script.src = url;
        script.async = false; // Set to false to help with sequential execution order in some browsers
        script.onload = () => {
            loadedScripts.add(url);
            trace("System.Render", "loadScript.success", { url });
            resolve();
        };
        script.onerror = () => {
            trace("System.Render", "loadScript.error", { url }, {}, "ERROR");
            reject(new Error(`Failed to load script: ${url}`));
        };
        const timeoutId = setTimeout(() => {
             reject(new Error(`Script loading timed out for: ${url}. This might be a CSP issue.`));
        }, 10000); // 10 second timeout
        script.onload = () => {
            clearTimeout(timeoutId);
            loadedScripts.add(url);
            trace("System.Render", "loadScript.success", { url });
            resolve();
        };

        document.head.appendChild(script);
    });
}

// [NEW] Sequential script loader for handling dependencies like add-ons.
async function loadScriptsSequentially(urls) {
    trace("System.Render", "loadScriptsSequentially.start", { count: urls.length });
    for (const url of urls) {
        await loadScript(url); // Await each script individually to ensure order
    }
    trace("System.Render", "loadScriptsSequentially.end", { count: urls.length });
}


// [CoreDNA] The main entry point for rendering a visualization block.
async function renderVisualizationBlock(blockData, containerElement) {
    if (!blockData || !containerElement || !Array.isArray(blockData.libraryUrls) || !blockData.htmlContent || !blockData.jsContent) {
        console.error("Invalid visualization block data:", blockData);
        containerElement.innerHTML = '<p style="color:red;">[오류] 시각화 블록 데이터가 올바르지 않습니다. (libraryUrls는 배열이어야 합니다)</p>';
        return;
    }

    const loadingIndicator = document.createElement('p');
    const libraryNames = blockData.libraryUrls.map(url => url.split('/').pop()).join(', ');
    loadingIndicator.textContent = `[${libraryNames}] 라이브러리를 순차적으로 불러오는 중...`;
    containerElement.appendChild(loadingIndicator);

    try {
        // [MODIFIED] Use the new sequential loader to respect dependency order for add-ons.
        await loadScriptsSequentially(blockData.libraryUrls);

        // 2. Insert HTML content
        containerElement.innerHTML = blockData.htmlContent;

        // 3. Execute JS content safely
        // The vizBlockContainer is passed as an argument for the script to target.
        (() => {
            try {
                const vizFunction = new Function('vizBlockContainer', blockData.jsContent);
                vizFunction(containerElement);
                trace("System.Render", "viz.exec.success", { libs: libraryNames });
            } catch (jsError) {
                console.error("Error executing visualization JS:", jsError);
                trace("System.Render", "viz.exec.error", { libs: libraryNames, error: jsError.message }, {}, "ERROR");
                const errorDiv = document.createElement('div');
                errorDiv.style.color = 'red';
                errorDiv.innerHTML = `<h4>시각화 스크립트 실행 오류</h4><pre>${jsError.name}: ${jsError.message}</pre>`;
                containerElement.appendChild(errorDiv);
            }
        })();

    } catch (loadError) {
        console.error("Error loading visualization scripts:", loadError);
        containerElement.innerHTML = `<p style="color:red;">[오류] 시각화 라이브러리(${libraryNames})를 불러오는 데 실패했습니다. 네트워크 연결 또는 CSP(콘텐츠 보안 정책)를 확인해주세요.</p>`;
    }
}