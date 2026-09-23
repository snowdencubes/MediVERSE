/**
 * Patch for Next.js 14 on Windows:
 * Resolves "Could not find the module '.../app-router.js#' in the React Client Manifest"
 *
 * NOTE: This patch is ONLY needed on Windows. It exits silently on Linux/macOS.
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

// Skip entirely on Linux/macOS (e.g. Render, Vercel, CI)
if (os.platform() !== 'win32') {
  console.log('[patch-next-windows] Non-Windows platform detected — skipping patch.');
  process.exit(0);
}

const rootDir = path.resolve(__dirname, '..');
const nextDir = path.join(rootDir, 'node_modules', 'next');

if (!fs.existsSync(nextDir)) {
  console.log('[patch-next-windows] Next.js not found in node_modules, skipping.');
  process.exit(0);
}

let patchCount = 0;

// 1. Patch load-components.js
const loadComponentsPath = path.join(nextDir, 'dist', 'server', 'load-components.js');
if (fs.existsSync(loadComponentsPath)) {
  let content = fs.readFileSync(loadComponentsPath, 'utf8');
  if (!content.includes('// __WINDOWS_DRIVE_LETTER_PATCH__')) {
    const target = 'const context = await evalManifestWithRetries(manifestPath, attempts);';
    if (content.includes(target)) {
      const replacement = `${target}
        // __WINDOWS_DRIVE_LETTER_PATCH__
        const mObj = context.__RSC_MANIFEST && context.__RSC_MANIFEST[entryName];
        if (mObj && mObj.clientModules) {
          const aliased = { ...mObj.clientModules };
          for (const k of Object.keys(mObj.clientModules)) {
            if (k.length > 2 && k[1] === ':') {
              const flipped = (k[0] === k[0].toUpperCase() ? k[0].toLowerCase() : k[0].toUpperCase()) + k.slice(1);
              if (!aliased[flipped]) aliased[flipped] = mObj.clientModules[k];
            }
          }
          return { ...mObj, clientModules: aliased };
        }`;
      content = content.replace(target, replacement);
      fs.writeFileSync(loadComponentsPath, content, 'utf8');
      console.log('[patch-next-windows] Successfully patched dist/server/load-components.js');
      patchCount++;
    }
  } else {
    console.log('[patch-next-windows] dist/server/load-components.js already patched.');
  }
}

// 2. Patch flight-manifest-plugin.js
const manifestPluginPath = path.join(nextDir, 'dist', 'build', 'webpack', 'plugins', 'flight-manifest-plugin.js');
if (fs.existsSync(manifestPluginPath)) {
  let content = fs.readFileSync(manifestPluginPath, 'utf8');
  if (!content.includes('// __WINDOWS_DRIVE_LETTER_PLUGIN_PATCH__')) {
    const target = 'manifest.clientModules[exportName] = {';
    if (content.includes(target)) {
      const searchBlock = `manifest.clientModules[exportName] = {
                        id: modId,
                        name: "*",
                        chunks: requiredChunks,
                        async: isAsyncModule
                    };`;
      const replacementBlock = `manifest.clientModules[exportName] = {
                        id: modId,
                        name: "*",
                        chunks: requiredChunks,
                        async: isAsyncModule
                    };
                    // __WINDOWS_DRIVE_LETTER_PLUGIN_PATCH__
                    if (exportName.length > 2 && exportName[1] === ':') {
                        const flipped = (exportName[0] === exportName[0].toUpperCase() ? exportName[0].toLowerCase() : exportName[0].toUpperCase()) + exportName.slice(1);
                        manifest.clientModules[flipped] = manifest.clientModules[exportName];
                    }`;
      content = content.replace(searchBlock, replacementBlock);
      fs.writeFileSync(manifestPluginPath, content, 'utf8');
      console.log('[patch-next-windows] Successfully patched dist/build/webpack/plugins/flight-manifest-plugin.js');
      patchCount++;
    }
  } else {
    console.log('[patch-next-windows] flight-manifest-plugin.js already patched.');
  }
}

// 3. Patch all app-page runtime files in compiled next-server
const nextServerDir = path.join(nextDir, 'dist', 'compiled', 'next-server');
if (fs.existsSync(nextServerDir)) {
  const serverFiles = fs.readdirSync(nextServerDir).filter(f => f.startsWith('app-page') && f.endsWith('.js'));
  for (const file of serverFiles) {
    const runtimePath = path.join(nextServerDir, file);
    let content = fs.readFileSync(runtimePath, 'utf8');
    if (!content.includes('/*__WINDOWS_RSC_FALLBACK__*/')) {
      // Dev runtime pattern:
      const devNeedle = `throw Error('Could not find the module "'+r+'" in the React Client Manifest. This is probably a bug in the React Server Components bundler.')`;
      // Prod runtime pattern:
      const prodNeedle = `throw Error('Could not find the module "'+u+'" in the React Client Manifest. This is probably a bug in the React Server Components bundler.')`;
      
      if (content.includes(devNeedle)) {
        const replacement = `/*__WINDOWS_RSC_FALLBACK__*/{var _mk=-1!==a?r.slice(0,a):r;if(_mk.length>2&&_mk[1]===':'){var _alt=(_mk[0]===_mk[0].toUpperCase()?_mk[0].toLowerCase():_mk[0].toUpperCase())+_mk.slice(1);o=e[_alt]||e[_alt.replace(/\\\\/g,'/')];}if(!o)o=e[_mk.replace(/\\\\/g,'/')]||e[_mk.replace(/\\//g,'\\\\')];if(!o){var _lw=_mk.toLowerCase();for(var _k in e){if(_k.toLowerCase()===_lw){o=e[_k];break;}}}}if(!o)throw Error('Could not find the module "'+r+'" in the React Client Manifest. This is probably a bug in the React Server Components bundler.')`;
        content = content.replace(devNeedle, replacement);
        fs.writeFileSync(runtimePath, content, 'utf8');
        console.log(`[patch-next-windows] Successfully patched ${file}`);
        patchCount++;
      } else if (content.includes(prodNeedle)) {
        const replacement = `/*__WINDOWS_RSC_FALLBACK__*/{var _mk=-1!==d?u.slice(0,d):u;if(_mk.length>2&&_mk[1]===':'){var _alt=(_mk[0]===_mk[0].toUpperCase()?_mk[0].toLowerCase():_mk[0].toUpperCase())+_mk.slice(1);c=s[_alt]||s[_alt.replace(/\\\\/g,'/')];}if(!c)c=s[_mk.replace(/\\\\/g,'/')]||s[_mk.replace(/\\//g,'\\\\')];if(!c){var _lw=_mk.toLowerCase();for(var _k in s){if(_k.toLowerCase()===_lw){c=s[_k];break;}}}}if(!c)throw Error('Could not find the module "'+u+'" in the React Client Manifest. This is probably a bug in the React Server Components bundler.')`;
        content = content.replace(prodNeedle, replacement);
        fs.writeFileSync(runtimePath, content, 'utf8');
        console.log(`[patch-next-windows] Successfully patched ${file}`);
        patchCount++;
      }
    } else {
      console.log(`[patch-next-windows] ${file} already patched.`);
    }
  }
}

console.log(`[patch-next-windows] Done. Patched ${patchCount} file(s).`);
