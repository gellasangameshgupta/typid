const { execSync } = require('child_process');
const semver = require('semver');
const pkg = require('../package.json');

function latestTagVersion() {
  try {
    execSync('git fetch --tags --quiet', { stdio: 'ignore' });
  } catch (err) {
    console.warn('[check-version] Could not fetch tags:', err.message);
  }

  const tagsRaw = execSync("git tag -l 'v*' --sort=-v:refname", { encoding: 'utf8' }).trim();
  if (!tagsRaw) return null;
  const latestTag = tagsRaw.split('\n').find(Boolean);
  return latestTag ? latestTag.replace(/^v/, '') : null;
}

function main() {
  const version = pkg.version;
  if (!semver.valid(version)) {
    console.error(`[check-version] package.json version is invalid semver: ${version}`);
    process.exit(1);
  }

  const latest = latestTagVersion();
  if (!latest) {
    console.log('[check-version] No existing tags found; version is acceptable.');
    return;
  }

  if (!semver.valid(latest)) {
    console.warn(`[check-version] Latest tag ${latest} is not valid semver; skipping comparison.`);
    return;
  }

  if (!semver.gt(version, latest)) {
    console.error(`[check-version] package.json version ${version} must be greater than latest tag v${latest}.`);
    process.exit(1);
  }

  console.log(`[check-version] OK: ${version} > v${latest}`);
}

main();
