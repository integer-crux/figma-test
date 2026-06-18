import { register } from '@tokens-studio/sd-transforms';
import StyleDictionary from 'style-dictionary';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';

register(StyleDictionary);

const TOKENS_FILE = 'tokens/default-token.json';
const SETS_DIR = 'tokens/sets';

// 1. Read combined JSON and split into per-set files
const allTokens = JSON.parse(readFileSync(TOKENS_FILE, 'utf-8'));
const tokenSetNames = allTokens['$metadata']?.tokenSetOrder
    ?? Object.keys(allTokens).filter((k) => !k.startsWith('$'));

console.log('📦 Token sets:', tokenSetNames);

mkdirSync(SETS_DIR, { recursive: true });
const validSets = [];

for (const setName of tokenSetNames) {
    const data = allTokens[setName];
    if (!data || Object.keys(data).length === 0) {
        console.warn(`⚠️  Set "${setName}" is empty, skipping`);
        continue;
    }
    const filePath = join(SETS_DIR, `${setName}.json`);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    validSets.push(setName);
}

// 2. Classify sets
function classifySets(setNames) {
    const core = [];
    const light = [];
    const dark = [];

    for (const name of setNames) {
        const lower = name.toLowerCase();
        if (lower.includes('dark')) dark.push(name);
        else if (lower.includes('light')) light.push(name);
        else core.push(name);
    }

    return { core, light, dark };
}

const classified = classifySets(validSets);
console.log('🔀 Classification:', classified);

// 3. Build theme CSS
async function buildTheme(themeName, setNames) {
    const sources = setNames
        .map((s) => join(SETS_DIR, `${s}.json`))
        .filter((p) => existsSync(p));

    if (sources.length === 0) {
        console.warn(`⚠️  No sources for "${themeName}", skipping`);
        return;
    }

    const selector = themeName === 'light' ? ':root' : '[data-theme="dark"]';

    const sd = new StyleDictionary({
        source: sources,
        preprocessors: ['tokens-studio'],
        log: {
            warnings: 'warn',
            errors: { brokenReferences: 'console' },
        },
        platforms: {
            css: {
                transformGroup: 'tokens-studio',
                prefix: 'crux',
                buildPath: 'src/styles/generated/',
                options: { selector, outputReferences: true },
                files: [
                    {
                        destination: `tokens-${themeName}.css`,
                        format: 'css/variables',
                    },
                ],
            },
        },
    });

    return sd.buildAllPlatforms();
}

// 4. Build
const lightSets = [...classified.core, ...classified.light];
const darkSets = [...classified.core, ...classified.dark];

console.log('🎨 Light sources:', lightSets);
console.log('🌙 Dark sources:', darkSets);

await buildTheme('light', lightSets);
await buildTheme('dark', darkSets);

console.log('✅ Done');
console.log('   → src/styles/generated/tokens-light.css');
console.log('   → src/styles/generated/tokens-dark.css');