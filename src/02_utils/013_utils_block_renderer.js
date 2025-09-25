/* --- Ailey & Bailey Canvas --- */
// File: 013_utils_block_renderer.js
// Version: 8.1 (HTML Structure Fix)
// Description: Fixed nested <p> tag issue by using marked.parseInline for paragraph content.

function renderBlock(block, index) {
    if (!block || !block.type) return null;

    function processInlineContent(content) {
        if (typeof content !== 'string') return '';
        const katexProcessedContent = renderKatexInString(content);
        return typeof marked !== 'undefined' ? marked.parseInline(katexProcessedContent, { gfm: true, breaks: true, sanitize: false }) : katexProcessedContent;
    }

    function processBlockContent(content) {
        if (typeof content !== 'string') return '';
        const katexProcessedContent = renderKatexInString(content);
        return typeof marked !== 'undefined' ? marked.parse(katexProcessedContent, { gfm: true, breaks: true, sanitize: false }) : katexProcessedContent;
    }

    function renderContentFragments(fragments) {
        if (!Array.isArray(fragments)) return '';
        return fragments.map(fragment => {
            if (typeof fragment === 'string') {
                return processInlineContent(fragment);
            }
            switch (fragment.type) {
                case 'text':
                    return processInlineContent(fragment.text);
                case 'latex':
                    return processInlineContent(fragment.text);
                default:
                    return '';
            }
        }).join('');
    }

    let element;

    switch (block.type) {
        case 'visualization':
            element = document.createElement('div');
            element.className = 'content-section type-visualization';
            element.dataset.blockId = `block-${index}`;
            if (typeof renderVisualizationBlock === 'function') {
                renderVisualizationBlock(block, element);
            } else {
                element.textContent = '[Error: Visualization renderer not loaded]';
            }
            return element;

        case 'main-header':
            element = document.createElement('div');
            element.className = 'header';
            let headerHTML = `<h1>${block.title}</h1>`;
            if (block.subtitle) {
                headerHTML += `<p class="subtitle">${processInlineContent(block.subtitle)}</p>`;
            }
            element.innerHTML = headerHTML;
            return element;

        case 'heading':
        case 'subheading':
            const level = block.level || (block.type === 'subheading' ? 3 : 2);
            element = document.createElement(`h${level}`);
            element.innerHTML = processInlineContent(block.text || '');
            const headingSection = document.createElement('div');
            headingSection.className = `content-section type-heading-h${level}`;
            headingSection.dataset.blockId = `block-${index}`;
            headingSection.appendChild(element);
            return headingSection;

        case 'paragraph':
            element = document.createElement('div');
            element.className = 'content-section type-paragraph';
            element.dataset.blockId = `block-${index}`;
            const p = document.createElement('p');
            if (Array.isArray(block.content)) {
                p.innerHTML = renderContentFragments(block.content);
            } else {
                // [FIX] Use processInlineContent to avoid creating nested <p> tags.
                p.innerHTML = processInlineContent(block.content);
            }
            element.appendChild(p);
            return element;

        case 'formula':
            element = document.createElement('div');
            element.className = 'content-section type-formula';
            element.dataset.blockId = `block-${index}`;
            const formulaContainer = document.createElement('div');
            formulaContainer.className = 'katex-display';
            try {
                formulaContainer.innerHTML = katex.renderToString(block.latex, {
                    throwOnError: false,
                    displayMode: true
                });
            } catch (e) {
                console.error("KaTeX rendering failed for block:", block, e);
                formulaContainer.textContent = `[수식 렌더링 오류: ${block.latex}]`;
            }
            element.appendChild(formulaContainer);
            return element;

        case 'blockquote':
            element = document.createElement('div');
            element.className = 'content-section type-blockquote';
            element.dataset.blockId = `block-${index}`;
            element.innerHTML = `<blockquote>${processBlockContent(block.content)}</blockquote>`;
            return element;

        case 'keywords':
            element = document.createElement('div');
            element.className = 'content-section type-key-terms';
            element.dataset.blockId = `block-${index}`;
            const list = block.keywords.map(term => {
                const renderedTerm = processInlineContent(term);
                return `<span class="keyword-chip">${renderedTerm}</span>`;
            }).join('');
            element.innerHTML = `<div class="keyword-list">${list}</div>`;
            return element;

        case 'list':
        case 'ordered-list':
        case 'unordered-list':
            element = document.createElement('div');
            element.className = 'content-section type-list';
            element.dataset.blockId = `block-${index}`;
            let listType = 'ul';
            if (block.style === 'ordered' || block.type === 'ordered-list') listType = 'ol';
            const listItems = block.items.map(item => {
                let itemContent = '';
                if (typeof item === 'string') {
                    itemContent = processInlineContent(item);
                } else if (typeof item === 'object' && item.content) {
                    itemContent = renderContentFragments(item.content);
                }
                return `<li>${itemContent}</li>`;
            }).join('');
            element.innerHTML = `<${listType}>${listItems}</${listType}>`;
            return element;

        case 'definition-list':
            element = document.createElement('div');
            element.className = 'content-section type-definition-list';
            element.dataset.blockId = `block-${index}`;
            const defItems = block.items.map(item => {
                const renderedTerm = processInlineContent(item.term || '');
                const renderedDefinition = processInlineContent(item.definition || '');
                return `<li><strong>${renderedTerm}:</strong> ${renderedDefinition}</li>`;
            }).join('');
            element.innerHTML = `<ul>${defItems}</ul>`;
            return element;

        case 'horizontal-rule':
            element = document.createElement('div');
            element.className = 'content-section type-hr';
            element.dataset.blockId = `block-${index}`;
            element.appendChild(document.createElement('hr'));
            return element;

        case 'summary':
            element = document.createElement('div');
            element.className = 'content-section type-summary';
            element.dataset.blockId = `block-${index}`;
            element.innerHTML = `
                <h3><strong>${block.title}</strong></h3>
                <div>${processBlockContent(block.content)}</div>
            `;
            return element;

        default:
            console.warn(`Unknown block type: ${block.type}`);
            return null;
    }
}