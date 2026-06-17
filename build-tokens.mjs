import { register } from '@tokens-studio/sd-transforms';
import StyleDictionary from 'style-dictionary';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

// Register Token Studio transforms (handles math, references, composite types)
register(StyleDictionary);

// 1. Read the combined tokens.json and split into per-set files
const allTokens = JSON.parse(readFileSync('tokens/default-token.json', 'utf-8'));
mkdirSync('tokens/sets', { recursive: true });

for (const setName of ['core', 'light', 'dark', 'theme']) {
    writeFileSync(
        `tokens/sets/${setName}.json`,
        JSON.stringify(allTokens[setName], null, 2),
    );
}

// 2. Shared SD config factory
function buildTheme(themeName, tokenSets) {
    const selector = themeName === 'light' ? ':root' : '[data-theme="dark"]';

    const sd = new StyleDictionary({
        source: tokenSets.map((s) => `tokens/sets/${s}.json`),
        preprocessors: ['tokens-studio'],
        expand: { typesMap: true },
        platforms: {
            css: {
                transformGroup: 'tokens-studio',
                prefix: 'crux',
                buildPath: 'src/styles/generated/',
                options: {
                    selector,
                },
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

// 3. Build both themes
await buildTheme('light', ['core', 'light', 'theme']);
await buildTheme('dark', ['core', 'dark', 'theme']);
