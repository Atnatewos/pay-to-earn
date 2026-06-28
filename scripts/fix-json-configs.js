// scripts/fix-json-configs.js
const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '..', 'config');

/**
 * Recursively cleans an object by trimming whitespace from all keys and string values
 * @param {any} obj - The object to clean
 * @returns {any} - The cleaned object
 */
function cleanObject(obj) {
    if (Array.isArray(obj)) {
        return obj.map(item => typeof item === 'string' ? item.trim() : cleanObject(item));
    }
    if (obj !== null && typeof obj === 'object') {
        const cleanObj = {};
        for (const [key, value] of Object.entries(obj)) {
            const cleanKey = typeof key === 'string' ? key.trim() : key;
            const cleanValue = typeof value === 'string' ? value.trim() : cleanObject(value);
            cleanObj[cleanKey] = cleanValue;
        }
        return cleanObj;
    }
    return obj;
}

if (!fs.existsSync(configDir)) {
    console.error('❌ Config directory not found at:', configDir);
    process.exit(1);
}

const files = fs.readdirSync(configDir).filter(f => f.endsWith('.json'));

if (files.length === 0) {
    console.log('No JSON files found in config directory.');
    process.exit(0);
}

console.log(`🔍 Found ${files.length} JSON config files. Cleaning...\n`);

files.forEach(file => {
    const filePath = path.join(configDir, file);
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        const cleaned = cleanObject(parsed);
        fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2) + '\n', 'utf8');
        console.log(`✅ Cleaned: ${file}`);
    } catch (err) {
        console.error(`❌ Error processing ${file}:`, err.message);
    }
});

console.log('\n🎉 All JSON config files have been professionally cleaned!');