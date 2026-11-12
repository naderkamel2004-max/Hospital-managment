import { app, BrowserWindow, dialog } from 'electron';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const resources = process.resourcesPath;
const isPackaged = app.isPackaged;
const testUserDataArg = process.argv.find(argument => argument.startsWith('--hms-user-data='));
const requestedUserData = process.env.HMS_TEST_USER_DATA || testUserDataArg?.slice('--hms-user-data='.length);
if (requestedUserData) {
  const resolvedUserData = path.resolve(requestedUserData);
  // Create the directory as the current Windows user before Electron starts writing to it.
  fs.mkdirSync(resolvedUserData, { recursive: true });
  app.setPath('userData', resolvedUserData);
}
const userData = app.getPath('userData');
const logFile = path.join(userData, 'startup.log');
const serverRoot = isPackaged ? path.join(resources, 'server') : path.resolve(here, '../server');
const postgresRoot = isPackaged ? path.join(resources, 'postgres') : '';
const bundledNode = isPackaged ? path.join(resources, 'node', 'node.exe') : process.execPath;
const dataRoot = path.join(userData, 'database');
const port = 4000;
let postgres;
let postgresBin;
let postgresStartupError;
let httpServer;
let startupWindow;
let shuttingDown = false;
let shutdownPromise;

function log(level, message, error) {
  const details = error ? '\n' + (error.stack || String(error)) : '';
  const line = '[' + new Date().toISOString() + '] ' + level + ': ' + message + details + '\n';
  try {
    fs.mkdirSync(userData, { recursive: true });
    fs.appendFileSync(logFile, line, 'utf8');
  } catch {}
}

function setStatus(message, details = '') {
  if (!startupWindow || startupWindow.isDestroyed()) return Promise.resolve();
  const script = 'document.getElementById("status").textContent = ' + JSON.stringify(message) +
    '; document.getElementById("details").textContent = ' + JSON.stringify(details) + ';';
  return startupWindow.webContents.executeJavaScript(script).catch(error => log('WARN', 'Could not update startup screen', error));
}

function runNodeScript(script, args, env) {
  return new Promise((resolve, reject) => {
    log('INFO', 'Running Node script: ' + script + ' ' + args.join(' '));
    const child = spawn(bundledNode, [script, ...args], {
      cwd: serverRoot,
      env: { ...process.env, ...env },
      windowsHide: true,
      stdio: 'pipe'
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk.toString(); });
    child.stderr.on('data', chunk => { output += chunk.toString(); });
    child.once('error', error => {
      log('ERROR', 'Could not launch bundled Node.js process', error);
      reject(error);
    });
    child.once('exit', code => {
      if (code === 0) {
        log('INFO', 'Node script completed successfully: ' + script);
        resolve(output);
      } else {
        const error = new Error(output || ('Command failed: ' + script + ' (exit code ' + code + ')'));
        log('ERROR', 'Node script failed: ' + script, error);
        reject(error);
      }
    });
  });
}

function runBinary(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true, ...options });
    let output = '';
    child.stdout?.on('data', chunk => { output += chunk.toString(); });
    child.stderr?.on('data', chunk => { output += chunk.toString(); });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve(output) : reject(new Error(output || ('Process failed: ' + executable + ' (exit code ' + code + ')'))));
  });
}

async function waitForDatabase(pgIsReady) {
  for (let attempt = 0; attempt < 90; attempt++) {
    if (postgresStartupError) throw postgresStartupError;
    if (postgres && postgres.exitCode !== null) {
      throw new Error('The PostgreSQL process exited before the database became ready. See startup.log.');
    }
    try {
      await runBinary(pgIsReady, ['-h', '127.0.0.1', '-p', '55432', '-U', 'hms', '-d', 'hms']);
      log('INFO', 'Local PostgreSQL is accepting connections.');
      return;
    } catch (error) {
      if (attempt === 0 || (attempt + 1) % 15 === 0) {
        log('INFO', 'Waiting for local PostgreSQL (' + (attempt + 1) + '/90).', error);
        await setStatus('Starting local database…', 'This first startup can take a minute. Please keep this window open.');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('The local database did not become ready within 90 seconds. See startup.log for details.');
}

async function startDatabase() {
  fs.mkdirSync(userData, { recursive: true });
  const hasInitializedDatabase = fs.existsSync(path.join(dataRoot, 'PG_VERSION'));
  if (!hasInitializedDatabase && fs.existsSync(dataRoot)) {
    // A previous startup may have left an incomplete directory. It is not a valid database cluster.
    log('WARN', 'Removing incomplete PostgreSQL data directory before retrying initialization: ' + dataRoot);
    fs.rmSync(dataRoot, { recursive: true, force: true });
  }
  const bin = path.join(postgresRoot, 'bin');
  postgresBin = bin;
  const initdb = path.join(bin, 'initdb.exe');
  const postgresExe = path.join(bin, 'postgres.exe');
  const pgIsReady = path.join(bin, 'pg_isready.exe');
  for (const executable of [initdb, postgresExe, pgIsReady]) {
    if (!fs.existsSync(executable)) throw new Error('A required PostgreSQL file is missing: ' + executable);
  }
  const passwordFile = path.join(userData, 'db-password.tmp');
  const dbPasswordPath = path.join(userData, 'database-password.txt');
  const password = fs.existsSync(dbPasswordPath) ? fs.readFileSync(dbPasswordPath, 'utf8') : randomBytes(32).toString('hex');
  const env = { ...process.env, PATH: bin + ';' + path.join(postgresRoot, 'lib') + ';' + (process.env.PATH || '') };
  if (!fs.existsSync(dbPasswordPath)) fs.writeFileSync(dbPasswordPath, password, { mode: 0o600 });

  if (!fs.existsSync(path.join(dataRoot, 'PG_VERSION'))) {
    await setStatus('Initializing the hospital database…', 'This happens only once on this computer.');
    log('INFO', 'Initializing PostgreSQL data directory: ' + dataRoot);
    fs.writeFileSync(passwordFile, password, { mode: 0o600 });
    try {
      const output = await runBinary(initdb, ['-D', dataRoot, '-U', 'hms', '-A', 'scram-sha-256', '--pwfile', passwordFile, '--encoding=UTF8'], { env });
      log('INFO', 'PostgreSQL initialization completed. ' + output);
    } finally {
      fs.rmSync(passwordFile, { force: true });
    }
  }

  await setStatus('Starting the local database…', 'Please keep this window open.');
  postgres = spawn(postgresExe, ['-D', dataRoot, '-h', '127.0.0.1', '-p', '55432', '-c', 'listen_addresses=127.0.0.1'], {
    windowsHide: true, env, stdio: 'pipe'
  });
  postgres.stdout?.on('data', chunk => log('POSTGRES', chunk.toString().trim()));
  postgres.stderr?.on('data', chunk => log('POSTGRES', chunk.toString().trim()));
  postgres.once('error', error => {
    postgresStartupError = error;
    log('ERROR', 'Could not launch PostgreSQL. Check Windows security software and required runtime libraries.', error);
  });
  postgres.once('exit', code => {
    if (!shuttingDown && code !== 0) {
      postgresStartupError = new Error('PostgreSQL stopped unexpectedly with exit code ' + code);
      log('ERROR', 'PostgreSQL stopped unexpectedly', postgresStartupError);
    }
  });
  await waitForDatabase(pgIsReady);

  return 'postgresql://hms:' + encodeURIComponent(password) + '@127.0.0.1:55432/hms?schema=public';
}

async function startApi(databaseUrl) {
  const env = {
    NODE_ENV: 'production',
    PORT: String(port),
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: randomBytes(48).toString('hex'),
    CORS_ORIGIN: 'http://127.0.0.1:' + port
  };
  await setStatus('Preparing the hospital database…', 'Applying database updates.');
  await runNodeScript(path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js'), ['migrate', 'deploy'], env);

  await setStatus('Creating the administrator account…', 'Preparing the first login.');
  const adminEmail = 'admin@hospital.local';
  const adminPassword = randomBytes(18).toString('base64url');
  await runNodeScript(path.join(serverRoot, 'prisma', 'seed.js'), [], {
    ...env, SEED_ADMIN_EMAIL: adminEmail, SEED_ADMIN_PASSWORD: adminPassword,
    SEED_ADMIN_NAME: 'Hospital Administrator'
  });

  Object.assign(process.env, env);
  await setStatus('Starting hospital services…', 'Almost ready.');
  const { app: api } = await import(pathToFileURL(path.join(serverRoot, 'src', 'app.js')).href);
  const express = (await import(pathToFileURL(path.join(serverRoot, 'node_modules', 'express', 'index.js')).href)).default;
  const frontend = path.join(app.getAppPath(), 'dist');
  if (!fs.existsSync(path.join(frontend, 'index.html'))) {
    throw new Error('The frontend files are missing from the installed application: ' + frontend);
  }
  api.use(express.static(frontend));
  api.get(/.*/, (_req, res) => res.sendFile(path.join(frontend, 'index.html')));
  httpServer = await new Promise((resolve, reject) => {
    const server = api.listen(port, '127.0.0.1', () => resolve(server));
    server.once('error', reject);
  });
  log('INFO', 'Hospital API is listening on 127.0.0.1:' + port);
  return { adminEmail, adminPassword };
}

async function createStartupWindow() {
  startupWindow = new BrowserWindow({
    width: 680, height: 430, resizable: false, show: true,
    autoHideMenuBar: true, backgroundColor: '#0b1220',
    title: 'Hospital Management - Starting',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  const html = '<!doctype html><html><head><meta charset="utf-8"><title>Hospital Management</title><style>' +
    'body{margin:0;background:#0b1220;color:#e5edf8;font:16px Segoe UI,Arial,sans-serif;display:grid;place-items:center;height:100vh}' +
    'main{width:78%;text-align:center} .mark{margin:auto auto 22px;width:64px;height:64px;border-radius:18px;background:#123b39;color:#5eead4;display:grid;place-items:center;font-size:27px;font-weight:700}' +
    'h1{font-size:25px;margin:0 0 14px} #status{font-size:17px;color:#5eead4;margin:24px 0 10px} .bar{height:5px;background:#263449;border-radius:10px;overflow:hidden}.bar:after{content:"";display:block;width:38%;height:100%;background:#2dd4bf;animation:move 1.5s infinite ease-in-out alternate}' +
    '@keyframes move{to{transform:translateX(160%)}} p{color:#9fb0c5;font-size:13px;line-height:1.6} pre{white-space:pre-wrap;text-align:left;color:#fca5a5;font-size:11px;max-height:90px;overflow:auto}' +
    '</style></head><body><main><div class="mark">HMS</div><h1>Hospital Management System</h1><div id="status">Preparing startup…</div><div class="bar"></div><p id="details">The first startup may take a little longer. Please keep this window open.</p><pre></pre></main></body></html>';
  await startupWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  startupWindow.show();
}

async function shutdown() {
  if (shutdownPromise) return shutdownPromise;
  shuttingDown = true;
  shutdownPromise = (async () => {
    if (httpServer) await new Promise(resolve => httpServer.close(resolve));
    if (postgres && !postgres.killed && postgresBin) {
      try {
        await runBinary(path.join(postgresBin, 'pg_ctl.exe'), ['-D', dataRoot, '-m', 'fast', '-w', 'stop'], {
          env: { ...process.env, PATH: postgresBin + ';' + path.join(postgresRoot, 'lib') + ';' + (process.env.PATH || '') }
        });
        log('INFO', 'PostgreSQL shut down cleanly.');
      } catch (error) {
        log('WARN', 'Graceful PostgreSQL shutdown failed; terminating the process.', error);
        try { postgres.kill(); } catch {}
      }
    }
  })();
  return shutdownPromise;
}

process.on('uncaughtException', error => log('FATAL', 'Uncaught exception in the Electron main process.', error));
process.on('unhandledRejection', reason => log('FATAL', 'Unhandled promise rejection in the Electron main process.', reason instanceof Error ? reason : new Error(String(reason))));

app.whenReady().then(async () => {
  try {
    fs.mkdirSync(userData, { recursive: true });
    log('INFO', 'Application startup. packaged=' + isPackaged + ', appPath=' + app.getAppPath() + ', resources=' + resources + ', userData=' + userData);
    await createStartupWindow();
    await setStatus('Checking local files…', 'Preparing the hospital system.');
    const databaseUrl = await startDatabase();
    const credentials = await startApi(databaseUrl);
    await setStatus('Opening the hospital system…');
    await startupWindow.loadURL('http://127.0.0.1:' + port);
    startupWindow.setTitle('Hospital Management System');
    startupWindow.maximize();
    startupWindow.show();
    log('INFO', 'Application window opened successfully.');
    if (!fs.existsSync(path.join(userData, 'admin-credentials-shown'))) {
      await dialog.showMessageBox(startupWindow, {
        type: 'info', title: 'First-time administrator account',
        message: 'Your local administrator account is ready.',
        detail: 'Email: ' + credentials.adminEmail + '\nTemporary password: ' + credentials.adminPassword + '\n\nSave this password securely. This message is shown only once.',
        buttons: ['OK']
      });
      fs.writeFileSync(path.join(userData, 'admin-credentials-shown'), new Date().toISOString());
    }
  } catch (error) {
    log('FATAL', 'Hospital Management could not start.', error);
    const details = (error?.stack || String(error)) + '\n\nLog file: ' + logFile;
    await setStatus('Startup failed', details);
    if (startupWindow && !startupWindow.isDestroyed()) {
      await dialog.showMessageBox(startupWindow, {
        type: 'error',
        title: 'Hospital Management could not start',
        message: 'The application could not finish starting.',
        detail: details,
        buttons: ['Close']
      });
    } else {
      dialog.showErrorBox('Hospital Management could not start', details);
    }
    await shutdown();
    app.quit();
  }
});

app.on('before-quit', event => {
  if (shuttingDown) return;
  event.preventDefault();
  void shutdown().finally(() => app.exit(0));
});
app.on('window-all-closed', () => app.quit());
