/**
 * Lockfile Integrity Verification
 *
 * Checks that package-lock.json is consistent with package.json
 * and hasn't been tampered with. Detects:
 * - Missing lockfile
 * - Lockfile out of sync with package.json
 * - Unexpected registry URLs (typosquatting indicator)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOCKFILE = path.join(ROOT, 'package-lock.json');
const PACKAGEFILE = path.join(ROOT, 'package.json');

// Trusted registries — add private registries here if needed
const TRUSTED_REGISTRIES = [
  'https://registry.npmjs.org',
  'https://registry.npmmirror.com',
];

function main() {
  console.log('Verifying lockfile integrity...\n');
  let exitCode = 0;

  // 1. Check lockfile exists
  if (!fs.existsSync(LOCKFILE)) {
    console.error('FAIL: package-lock.json not found. Run `npm install` first.');
    process.exit(1);
  }

  const lockData = JSON.parse(fs.readFileSync(LOCKFILE, 'utf-8'));
  const pkgData = JSON.parse(fs.readFileSync(PACKAGEFILE, 'utf-8'));

  // 2. Verify all declared deps appear in lockfile
  const allDeps = {
    ...pkgData.dependencies,
    ...pkgData.devDependencies,
  };

  const lockPackages = lockData.packages || {};
  const missingFromLock = [];

  for (const dep of Object.keys(allDeps)) {
    const lockKey = `node_modules/${dep}`;
    if (!lockPackages[lockKey]) {
      missingFromLock.push(dep);
    }
  }

  if (missingFromLock.length > 0) {
    console.error(`FAIL: ${missingFromLock.length} dependencies in package.json missing from lockfile:`);
    missingFromLock.forEach((d) => console.error(`  - ${d}`));
    exitCode = 1;
  } else {
    console.log(`OK: All ${Object.keys(allDeps).length} declared dependencies found in lockfile.`);
  }

  // 3. Check for untrusted registries (supply chain indicator)
  const untrustedPackages = [];

  for (const [key, pkg] of Object.entries(lockPackages)) {
    if (key === '') continue; // root entry
    const resolved = pkg.resolved;
    if (!resolved) continue;

    const isTrusted = TRUSTED_REGISTRIES.some((reg) => resolved.startsWith(reg));
    // Allow git/github URLs and file: references
    const isAllowed = resolved.startsWith('git') || resolved.startsWith('file:');

    if (!isTrusted && !isAllowed) {
      untrustedPackages.push({ name: key, resolved });
    }
  }

  if (untrustedPackages.length > 0) {
    console.warn(`\nWARN: ${untrustedPackages.length} package(s) resolved from non-standard registries:`);
    untrustedPackages.slice(0, 10).forEach((p) =>
      console.warn(`  - ${p.name}: ${p.resolved}`)
    );
    if (untrustedPackages.length > 10) {
      console.warn(`  ... and ${untrustedPackages.length - 10} more`);
    }
    // Warning only — don't fail for this, as some packages use CDNs
  } else {
    console.log('OK: All packages resolve to trusted registries.');
  }

  // 4. Check lockfile version
  if (lockData.lockfileVersion < 2) {
    console.warn('\nWARN: Lockfile version is < 2. Consider running `npm install` with npm 7+ for better security.');
  } else {
    console.log(`OK: Lockfile version ${lockData.lockfileVersion}.`);
  }

  console.log(exitCode === 0 ? '\nLockfile verification passed.' : '\nLockfile verification failed.');
  process.exit(exitCode);
}

main();
