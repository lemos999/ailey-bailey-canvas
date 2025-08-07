// The Intelligent Bootstrapper
console.log("Bootstrap sequence initiated...");

async function initialize() {
    try {
        // 1. Fetch the remote configuration file
        const configUrl = 'https://lemos999.github.io/ailey-bailey-canvas/config/test_config.json';
        console.log(`Fetching configuration from: ${configUrl}`);
        const configResponse = await fetch(configUrl);
        if (!configResponse.ok) throw new Error(`Failed to fetch config: ${configResponse.statusText}`);
        const config = await configResponse.json();
        console.log("Configuration loaded:", config);

        // 2. Fetch the HTML template
        console.log(`Fetching template from: ${config.templateUrl}`);
        const templateResponse = await fetch(config.templateUrl);
        if (!templateResponse.ok) throw new Error(`Failed to fetch template: ${templateResponse.statusText}`);
        const templateHtml = await templateResponse.text();
        console.log("Template HTML loaded.");

        // 3. Inject the HTML template into the DOM
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.innerHTML = templateHtml;
            console.log("Template injected into DOM.");
        } else {
            throw new Error("App container #app-container not found.");
        }

        // 4. Dynamically load and execute the JavaScript module
        console.log(`Dynamically loading module from: ${config.moduleUrl}`);
        const moduleScript = document.createElement('script');
        moduleScript.src = config.moduleUrl;
        // defer ensures the script is executed after the document has been parsed,
        // which is good practice for scripts added to the body.
        moduleScript.defer = true;
        document.body.appendChild(moduleScript);
        console.log("Module script tag appended to body.");

    } catch (error) {
        console.error("CRITICAL ERROR in bootstrap sequence:", error);
        const appContainer = document.getElementById('app-container');
        if(appContainer) appContainer.innerHTML = `<p style="color: red;"><strong>Bootstrap Error:</strong> ${error.message}</p>`;
    }
}

// Start the process once the initial document is ready
document.addEventListener('DOMContentLoaded', initialize);