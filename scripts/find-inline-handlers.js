// scripts/find-inline-handlers.js
const fs = require('fs');
const path = require('path');

// Configuration: Update this path if your frontend files are in a different directory
const FRONTEND_DIR = path.join(__dirname, '../public'); 

// List of inline event attributes to search for
const INLINE_EVENTS = [
    'onclick', 'onchange', 'onsubmit', 'onload', 'onerror', 
    'onmouseover', 'onmouseout', 'onkeydown', 'onkeyup', 'onfocus', 'onblur'
];

/**
 * Recursively scans a directory for files containing inline event handlers
 * @param {string} dir - The directory path to scan
 */
function scanDirectory(dir) {
    if (!fs.existsSync(dir)) {
        console.error(`\n[ERROR] Directory not found: ${dir}`);
        console.error('Please update the FRONTEND_DIR path in this script to match your frontend folder (e.g., "public", "views", "src").\n');
        return;
    }

    const files = fs.readdirSync(dir);
    let totalIssues = 0;

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            scanDirectory(filePath);
        } else if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.ejs') || file.endsWith('.vue') || file.endsWith('.jsx') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
                INLINE_EVENTS.forEach(event => {
                    // Match event followed by '=' (with optional spaces)
                    const regex = new RegExp(`\\b${event}\\s*=`, 'i');
                    if (regex.test(line)) {
                        totalIssues++;
                        console.log(`\n[!] Found inline handler in: ${filePath}`);
                        console.log(`    Line ${index + 1}: ${line.trim()}`);
                    }
                });
            });
        }
    });

    if (totalIssues === 0) {
        console.log('\n[SUCCESS] No inline event handlers found. The CSP errors might be due to browser caching.');
    } else {
        console.log(`\n[SUMMARY] Found ${totalIssues} inline event handler(s).`);
        console.log('To fix these, remove the inline attribute from the HTML and use addEventListener() in your JavaScript files.');
        console.log('Example: Change <button onclick="submit()"> to <button id="submitBtn"> and use document.getElementById("submitBtn").addEventListener("click", submit);');
    }
}

console.log('Scanning frontend files for inline event handlers...\n');
scanDirectory(FRONTEND_DIR);