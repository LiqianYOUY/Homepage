#!/usr/bin/env node
/**
 * Package the owner's existing client-only game projects as encrypted HTML.
 *
 * Install the dependencies recorded in each source project's package-lock.json
 * first. This script never runs those projects' hosting/Vite configurations and
 * never writes to the source checkouts. Set TERRACE_GAME_PASSWORD in the shell
 * environment; it is deliberately not stored in this public repository.
 *
 * node scripts/build-terrace-games.mjs [--sources /path/to/portfolio]
 *      [--out /path/to/encrypted/output] [--preview /tmp/private-game-preview]
 *
 * The optional preview directory receives decrypted HTML for local QA only and
 * must be outside this Git repository. No source maps or clear game assets are
 * emitted into the website. Random salt/IV make ciphertext change on each build.
 */
import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes, webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const options = { sources: dirname(repo), out: join(repo, 'little-world/assets/games'), preview: '' };
for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace(/^--/, '');
  if (!(key in options) || !args[i + 1] || args[i + 1].startsWith('--')) {
    throw new Error('Usage: build-terrace-games.mjs [--sources PATH] [--out PATH] [--preview PATH]');
  }
  options[key] = resolve(args[i + 1]);
}
const password = process.env.TERRACE_GAME_PASSWORD;
if (!password) throw new Error('Set TERRACE_GAME_PASSWORD before building.');
if (options.preview) {
  await mkdir(options.preview, { recursive: true });
  const previewRelative = relative(await realpath(repo), await realpath(options.preview));
  if (!previewRelative.startsWith(`..${sep}`) && !isAbsolute(previewRelative)) {
    throw new Error('Decrypted preview output must be outside the Git repository.');
  }
}

const magic = Buffer.from('YOUHOME1', 'ascii');
const iterations = 210000;
const games = [
  { id: 'juice-bay', title: '饮料合成 · Juice Bay' },
  { id: 'sling-birds', title: '捣蛋鸟 · Sling Birds' },
];
// Use one Vite/PostCSS runtime for both builds. Loading two separate copies of
// the same native compiler into one Node process can crash some macOS versions.
const toolingRequire = createRequire(join(options.sources, 'juice-bay/package.json'));
const mimeTypes = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif',
  '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
};

async function publicAssets(directory, prefix = '') {
  const assets = new Map();
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const assetPath = join(directory, entry.name);
    const webPath = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      for (const pair of await publicAssets(assetPath, webPath)) assets.set(...pair);
    } else if (mimeTypes[extname(entry.name)]) {
      assets.set(webPath, `data:${mimeTypes[extname(entry.name)]};base64,${(await readFile(assetPath)).toString('base64')}`);
    }
  }
  return assets;
}

function escapeInline(text, tag) {
  return text.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`);
}

async function buildGame(game) {
  const source = resolve(options.sources, game.id);
  const [{ build }, { default: react }, { default: tailwindcss }] = await Promise.all([
    import(pathToFileURL(toolingRequire.resolve('vite')).href),
    import(pathToFileURL(toolingRequire.resolve('@vitejs/plugin-react')).href),
    import(pathToFileURL(toolingRequire.resolve('@tailwindcss/postcss')).href),
  ]);
  const staging = await realpath(await mkdtemp(join(tmpdir(), `youhome-${game.id}-`)));
  const assets = await publicAssets(join(source, 'public'));
  try {
    await symlink(join(source, 'node_modules'), join(staging, 'node_modules'), 'dir');
    await writeFile(join(staging, 'entry.tsx'), `import React from 'react';\nimport {createRoot} from 'react-dom/client';\nimport Home from ${JSON.stringify(join(source, 'app/page.tsx'))};\nimport ${JSON.stringify(join(source, 'app/globals.css'))};\ncreateRoot(document.getElementById('root')).render(<Home/>);\n`);
    const result = await build({
      configFile: false,
      root: staging,
      base: './',
      publicDir: false,
      logLevel: 'warn',
      define: { 'process.env.NODE_ENV': JSON.stringify('production') },
      resolve: { alias: { '@': source } },
      css: { postcss: { plugins: [tailwindcss({ base: source })] } },
      plugins: [{
        name: 'youhome-inline-private-assets',
        enforce: 'pre',
        transform(code, id) {
          if (!id.startsWith(`${source}/`) || id.includes('/node_modules/')) return;
          if (!/\.(?:css|tsx?|jsx?)(?:\?|$)/.test(id)) return;
          for (const [webPath, dataUri] of assets) code = code.split(webPath).join(dataUri);
          return { code, map: null };
        },
      }, react()],
      build: {
        write: false,
        outDir: join(staging, 'dist'),
        emptyOutDir: false,
        target: 'es2020',
        sourcemap: false,
        modulePreload: false,
        cssCodeSplit: false,
        assetsInlineLimit: Number.MAX_SAFE_INTEGER,
        lib: { entry: join(staging, 'entry.tsx'), formats: ['iife'], name: 'YouhomeGame', fileName: 'game' },
      },
    });
    const output = (Array.isArray(result) ? result.flatMap(item => item.output) : result.output);
    const chunks = output.filter(file => file.type === 'chunk');
    assert.equal(chunks.length, 1, `${game.id} must bundle into one script`);
    assert.equal(chunks[0].imports.length, 0, 'Game script must have no external imports');
    assert.equal(chunks[0].dynamicImports.length, 0, 'Game script must have no lazy network imports');
    const css = output.filter(file => file.type === 'asset' && file.fileName.endsWith('.css')).map(file => String(file.source)).join('\n');
    assert.ok(css.length > 1000, 'Styles must compile');
    assert.ok(!/@import\s/.test(css), 'Styles must not retain external imports');
    const cssUrls = [...css.matchAll(/url\(([^)]+)\)/g)].map(match => match[1].replace(/^['"]|['"]$/g, ''));
    assert.ok(cssUrls.every(url => url.startsWith('data:') || url.startsWith('#')), 'All CSS assets must be embedded');
    const code = chunks[0].code;
    for (const path of assets.keys()) assert.ok(!code.includes(`"${path}"`) && !code.includes(`'${path}'`), `Unbundled game asset: ${path}`);
    const unexpected = output.filter(file => file.type === 'asset' && !/\.(?:css|html)$/.test(file.fileName));
    assert.deepEqual(unexpected.map(file => file.fileName), [], 'No separate game assets may be emitted');
    const fontLicenses = [];
    if (game.id === 'juice-bay') {
      for (const file of ['nunito-OFL.txt', 'zcool-kuaile-OFL.txt']) {
        fontLicenses.push(await readFile(join(source, 'public/fonts', file), 'utf8'));
      }
    }
    // Block networking in the decrypted document too. All art, font, CSS and JS
    // needed by the game is inside this encrypted file, including font licenses.
    const csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'";
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>${game.title}</title><style>${escapeInline(css, 'style')}</style></head><body><div id="root"></div><script type="module">${escapeInline(code, 'script')}</script>${fontLicenses.length ? `<!-- Bundled font licenses\n${fontLicenses.join('\n\n').replaceAll('--', '—')}\n-->` : ''}</body></html>`;
    return Buffer.from(html);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

async function encryptVerified(plaintext) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const payload = Buffer.concat([magic, salt, iv, ciphertext]);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(ciphertext.subarray(-16));
  assert.deepEqual(Buffer.concat([decipher.update(ciphertext.subarray(0, -16)), decipher.final()]), plaintext);
  // Browser WebCrypto consumes the appended GCM tag; verify that format too.
  const baseKey = await webcrypto.subtle.importKey('raw', Buffer.from(password), 'PBKDF2', false, ['deriveKey']);
  const browserKey = await webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  assert.deepEqual(Buffer.from(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, browserKey, ciphertext)), plaintext);
  const wrongKey = pbkdf2Sync(`${password}-wrong`, salt, iterations, 32, 'sha256');
  const wrong = createDecipheriv('aes-256-gcm', wrongKey, iv);
  wrong.setAuthTag(ciphertext.subarray(-16));
  assert.throws(() => Buffer.concat([wrong.update(ciphertext.subarray(0, -16)), wrong.final()]));
  return payload;
}

// Finish building/validating every game before replacing the published assets.
const encrypted = [];
for (const game of games) {
  const html = await buildGame(game);
  encrypted.push({ id: game.id, payload: await encryptVerified(html) });
  if (options.preview) await writeFile(join(options.preview, `${game.id}.html`), html);
  console.log(`${game.id}: ${(html.length / 1024 / 1024).toFixed(2)} MiB, self-contained HTML and WebCrypto round-trip verified`);
}
encrypted.push({ id: 'access', payload: await encryptVerified(Buffer.from('YOUHOME:terrace-games')) });
await mkdir(options.out, { recursive: true });
for (const { id, payload } of encrypted) await writeFile(join(options.out, `${id}.bin`), payload);
console.log('Wrote encrypted game assets and access token. No clear game files were published.');
