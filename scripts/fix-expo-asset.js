/**
 * Fixes two bugs in expo-asset@12.0.12 on iOS 26 New Architecture (Bridgeless):
 *
 * 1. ExpoAsset.js — lazy Proxy has no try/catch: if requireNativeModule('ExpoAsset')
 *    throws (TurboModule not yet registered), _assetModule stays null and every
 *    subsequent call also throws → all local require() images fail silently.
 *    Fix: add try/catch + null guard; if unavailable return the URL directly from
 *    downloadAsync() (the asset is already in the app bundle, no real download needed).
 *
 * 2. Asset.js — iOS has no equivalent of the Android "already local" shortcut.
 *    Android marks drawable-name assets as downloaded=true immediately (line 155).
 *    iOS file:// URIs (embedded app bundle) also don't need downloading — they're
 *    already on device. Without this shortcut, Asset.fromModule() always calls
 *    downloadAsync() which calls ExpoAsset.downloadAsync() which may fail.
 *    Fix: if uri starts with 'file://' on iOS, set localUri=uri and downloaded=true.
 */

const fs = require('fs');
const path = require('path');

// ── Fix 1: ExpoAsset.js ────────────────────────────────────────────────────────

const expoAssetPath = path.join(
  __dirname, '..', 'node_modules', 'expo-asset', 'build', 'ExpoAsset.js'
);

const oldProxy =
`let _assetModule = null;
const AssetModule = new Proxy({}, {
    get(_, prop) {
        if (!_assetModule) _assetModule = requireNativeModule('ExpoAsset');
        return _assetModule[prop];
    }
});`;

const newProxy =
`let _assetModule = null;
let _assetModuleResolved = false;
const AssetModule = new Proxy({}, {
    get(_, prop) {
        if (!_assetModuleResolved) {
            _assetModuleResolved = true;
            try { _assetModule = requireNativeModule('ExpoAsset'); } catch (_e) {}
        }
        if (_assetModule) return _assetModule[prop];
        // ExpoAsset TurboModule unavailable on New Architecture — for embedded
        // file:// assets the URI is already local, return it directly.
        if (prop === 'downloadAsync') return (url) => Promise.resolve(url);
        return undefined;
    }
});`;

let expoAsset = fs.readFileSync(expoAssetPath, 'utf8');
if (expoAsset.includes(oldProxy)) {
  expoAsset = expoAsset.replace(oldProxy, newProxy);
  fs.writeFileSync(expoAssetPath, expoAsset, 'utf8');
  console.log('[fix-expo-asset] ExpoAsset.js: improved lazy Proxy with try/catch + fallback');
} else if (expoAsset.includes('_assetModuleResolved')) {
  console.log('[fix-expo-asset] ExpoAsset.js: already patched, skipping');
} else {
  console.warn('[fix-expo-asset] ExpoAsset.js: pattern not found — check the file');
}

// ── Fix 2: Asset.js ───────────────────────────────────────────────────────────

const assetPath = path.join(
  __dirname, '..', 'node_modules', 'expo-asset', 'build', 'Asset.js'
);

const oldAndroidBlock =
`            if (Platform.OS === 'android' && !uri.includes(':') && (meta.width || meta.height)) {
                asset.localUri = asset.uri;
                asset.downloaded = true;
            }
            Asset.byHash[meta.hash] = asset;`;

const newAndroidBlock =
`            if (Platform.OS === 'android' && !uri.includes(':') && (meta.width || meta.height)) {
                asset.localUri = asset.uri;
                asset.downloaded = true;
            }
            // iOS embedded assets: file:// URI is already on device — skip downloadAsync().
            if (Platform.OS === 'ios' && uri.startsWith('file://')) {
                asset.localUri = asset.uri;
                asset.downloaded = true;
            }
            Asset.byHash[meta.hash] = asset;`;

let assetJs = fs.readFileSync(assetPath, 'utf8');
if (assetJs.includes(oldAndroidBlock)) {
  assetJs = assetJs.replace(oldAndroidBlock, newAndroidBlock);
  fs.writeFileSync(assetPath, assetJs, 'utf8');
  console.log('[fix-expo-asset] Asset.js: added iOS file:// shortcut (skip downloadAsync)');
} else if (assetJs.includes("Platform.OS === 'ios' && uri.startsWith('file://')")) {
  console.log('[fix-expo-asset] Asset.js: already patched, skipping');
} else {
  console.warn('[fix-expo-asset] Asset.js: pattern not found — check the file');
}
