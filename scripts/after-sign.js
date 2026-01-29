const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (error, stdout, stderr) => {
      if (stdout) console.log(stdout.trim());
      if (stderr) console.error(stderr.trim());
      if (error) reject(error);
      else resolve();
    });
  });
}

exports.default = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') {
    console.log('[afterSign] Skip codesign: platform is not darwin');
    return;
  }

  const appOutDir = context.appOutDir;
  const appPath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const entitlementsPath = path.join(context.packager.info.projectDir, 'build', 'entitlements.mac.plist');

  if (!fs.existsSync(appPath)) {
    console.warn(`[afterSign] App not found at ${appPath}, skipping codesign`);
    return;
  }

  const args = ['--force', '--deep', '--sign', '-'];
  if (fs.existsSync(entitlementsPath)) {
    console.log(`[afterSign] Using entitlements: ${entitlementsPath}`);
    args.push('--entitlements', entitlementsPath);
  }
  args.push(appPath);

  console.log(`[afterSign] Ad-hoc signing ${appPath}`);
  await run('codesign', args);

  console.log('[afterSign] Verifying signature');
  await run('codesign', ['--verify', '--strict', '--deep', '--verbose=2', appPath]);
};
