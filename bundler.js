const fs = require('fs');
const path = require('path');

const srcJsDir = path.join(__dirname, 'src');
const srcCssDir = path.join(__dirname, 'src_css');
const bundleDir = path.join(__dirname, 'bundle');

const bundleJsPath = path.join(bundleDir, 'main.js');
const bundleCssPath = path.join(bundleDir, 'main.css');

// Helper function to find all files recursively
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(file => {
        if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
            arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, file));
        }
    });

    return arrayOfFiles;
}

// Function to bundle files of a specific type
function bundleFiles(sourceDir, bundlePath, extension) {
    console.log(`Starting bundling for ${extension.toUpperCase()} files...`);
    if (!fs.existsSync(sourceDir)) {
        console.error(`Source directory not found: ${sourceDir}`);
        return;
    }

    const allFiles = getAllFiles(sourceDir);
    const targetFiles = allFiles.filter(file => file.endsWith(extension));

    // Sort files based on the numeric prefix in their basename
    targetFiles.sort((a, b) => {
        const baseA = path.basename(a);
        const baseB = path.basename(b);
        const numA = parseInt(baseA.split('_')[0], 10);
        const numB = parseInt(baseB.split('_')[0], 10);
        return numA - numB;
    });

    let bundledContent = `/* Auto-generated bundle from ${new Date().toISOString()} */\n\n`;
    console.log('Files will be bundled in this order:');

    targetFiles.forEach(file => {
        const relativePath = path.relative(__dirname, file);
        console.log(` - ${relativePath}`);
        const fileContent = fs.readFileSync(file, 'utf8');
        bundledContent += `/* --- Source: ${relativePath} --- */\n`;
        bundledContent += fileContent + '\n\n';
    });

    // Ensure bundle directory exists
    if (!fs.existsSync(bundleDir)) {
        fs.mkdirSync(bundleDir, { recursive: true });
    }

    fs.writeFileSync(bundlePath, bundledContent);
    console.log(`\n✅ Successfully created bundle at: ${bundlePath}\n`);
}

// --- Main Execution ---
console.log('--- Running Bundler Script ---');
bundleFiles(srcJsDir, bundleJsPath, '.js');
bundleFiles(srcCssDir, bundleCssPath, '.css');
console.log('--- Bundler Script Finished ---');