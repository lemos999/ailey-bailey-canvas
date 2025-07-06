/*
--- Ailey & Bailey: Data-Driven Canvas ---
--- script.js (v1.0) ---
--- Architect: System Architect Ailey ---
--- Last Modified: 2024-06-05 (KST) ---

[Design Philosophy]
1.  Class-based modular architecture for maintainability and scalability.
2.  Purely data-driven; the script renders whatever valid JSON it receives.
3.  Dynamically builds the DOM tree based on the JSON data, matching the BEM
    class names defined in style.css.
*/

// Main execution block that runs after the entire HTML document is loaded.
document.addEventListener('DOMContentLoaded', () => {
    // 1. Find the necessary HTML elements.
    const appRoot = document.getElementById('app-root');
    const jsonDataElement = document.getElementById('lecture-data');

    // 2. Validate that the required elements exist.
    if (!appRoot || !jsonDataElement) {
        console.error('Essential DOM elements (#app-root or #lecture-data) not found.');
        appRoot.innerHTML = '<p>오류: 학습 데이터를 불러오는 데 필요한 요소를 찾을 수 없습니다.</p>';
        return;
    }

    // 3. Parse the JSON data.
    try {
        const data = JSON.parse(jsonDataElement.textContent);
        
        // 4. Initialize and run the App.
        const app = new App(appRoot, data);
        app.init();

    } catch (error) {
        console.error('Failed to parse lecture JSON data:', error);
        appRoot.innerHTML = '<p>오류: 학습 데이터의 형식이 잘못되었습니다.</p>';
    }
});


/**
 * The main App class responsible for rendering the entire lecture content.
 */
class App {
    constructor(rootElement, data) {
        this.root = rootElement;
        this.data = data;
        this.lectureContainer = document.createElement('div');
        this.lectureContainer.className = 'lecture-container';
    }

    /**
     * Initializes the rendering process.
     */
    init() {
        this.root.innerHTML = ''; // Clear the root element first.

        const { metadata, lecturePackage } = this.data;

        // Render each component in order and append to the main container.
        this.lectureContainer.appendChild(this._renderHeader(metadata));
        
        this.lectureContainer.appendChild(this._createSection('🎯 오늘의 학습 목표', this._renderList(lecturePackage.goals)));
        this.lectureContainer.appendChild(this._createSection('🔑 핵심 키워드', this._renderKeywords(lecturePackage.keywords)));
        this.lectureContainer.appendChild(this._createSection('📖 핵심 원리와 개념', this._renderMainContent(lecturePackage.mainContent)));
        this.lectureContainer.appendChild(this._createSection('💡 최종 핵심 요약', this._renderList(lecturePackage.summary)));
        this.lectureContainer.appendChild(this._createSection('⏳ 주요 사건 연표', this._renderTimeline(lecturePackage.timeline)));
        this.lectureContainer.appendChild(this._createSection('📚 주요 용어 해설', this._renderGlossary(lecturePackage.glossary)));

        this.root.appendChild(this.lectureContainer);
    }
    
    /**
     * A helper function to create a standard content section with a title.
     * @param {string} titleText - The title of the section.
     * @param {HTMLElement} contentElement - The HTML element containing the section's content.
     * @returns {HTMLElement} The complete section element.
     */
    _createSection(titleText, contentElement) {
        const section = document.createElement('div');
        section.className = 'content-section';

        const title = document.createElement('h2');
        title.className = 'content-section__title';
        title.textContent = titleText;

        section.appendChild(title);
        section.appendChild(contentElement);
        return section;
    }

    /**
     * Renders the main header of the lecture.
     * @param {object} metadata - The metadata object from JSON.
     * @returns {HTMLElement} The header element.
     */
    _renderHeader(metadata) {
        const header = document.createElement('header');
        header.className = 'lecture-header';

        const title = document.createElement('h1');
        title.className = 'lecture-header__title';
        title.textContent = metadata.title;

        const subtitle = document.createElement('p');
        subtitle.className = 'lecture-header__subtitle';
        subtitle.textContent = `과목: ${metadata.subject} | ID: ${metadata.conceptId}`;

        header.appendChild(title);
        header.appendChild(subtitle);
        return header;
    }

    /**
     * Renders a simple unordered list from an array of strings.
     * Used for goals and summary.
     * @param {string[]} items - An array of strings.
     * @returns {HTMLElement} The <ul> element.
     */
    _renderList(items) {
        const list = document.createElement('ul');
        items.forEach(itemText => {
            const listItem = document.createElement('li');
            listItem.textContent = itemText;
            list.appendChild(listItem);
        });
        return list;
    }
    
    /**
     * Renders the keyword list.
     * @param {string[]} keywords - An array of keyword strings.
     * @returns {HTMLElement} The div element containing keywords.
     */
    _renderKeywords(keywords) {
        const container = document.createElement('div');
        container.className = 'keyword-list';
        keywords.forEach(keywordText => {
            const keywordChip = document.createElement('span');
            keywordChip.className = 'keyword-list__item';
            keywordChip.textContent = keywordText;
            container.appendChild(keywordChip);
        });
        return container;
    }

    /**
     * Renders the main lecture content from Markdown text.
     * NOTE: This is a very basic parser. For full Markdown support,
     * a library like 'marked.js' is recommended.
     * @param {string} markdownText - The Markdown content.
     * @returns {HTMLElement} The div element with parsed HTML.
     */
    _renderMainContent(markdownText) {
        const contentDiv = document.createElement('div');
        
        // Simple conversion from Markdown-like syntax to HTML
        let html = markdownText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\n/g, '<br>'); // Newlines

        contentDiv.innerHTML = html;
        return contentDiv;
    }

    /**
     * Renders the timeline component.
     * @param {object[]} timelineData - Array of timeline objects.
     * @returns {HTMLElement} The <ul> element for the timeline.
     */
    _renderTimeline(timelineData) {
        const timeline = document.createElement('ul');
        timeline.className = 'timeline';
        timelineData.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = 'timeline__item';
            
            const year = document.createElement('span');
            year.className = 'timeline__year';
            year.textContent = item.year;
            
            const event = document.createElement('p');
            event.className = 'timeline__event';
            event.textContent = item.event;
            
            listItem.appendChild(year);
            listItem.appendChild(event);
            timeline.appendChild(listItem);
        });
        return timeline;
    }

    /**
     * Renders the glossary component.
     * @param {object[]} glossaryData - Array of glossary objects.
     * @returns {HTMLElement} The div element for the glossary.
     */
    _renderGlossary(glossaryData) {
        const glossary = document.createElement('div');
        glossary.className = 'glossary';
        glossaryData.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'glossary__item';

            const term = document.createElement('h3');
            term.className = 'glossary__term';
            term.textContent = item.term;
            
            const definition = document.createElement('p');
            definition.className = 'glossary__definition';
            definition.textContent = item.definition;

            itemDiv.appendChild(term);
            itemDiv.appendChild(definition);
            glossary.appendChild(itemDiv);
        });
        return glossary;
    }
}
