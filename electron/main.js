import { app, BrowserWindow, dialog } from 'electron';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const resources = process.resourcesPath;
const isPackaged = app.isPackaged;
const serverRoot = isPackaged ? path.join(resources, 'server') : path.resolve(here, '../server');
const postgresRoot = isPackaged ? path.join(resources, 'postgres') : '';
const bundledNode = isPackaged ? path.join(resources, 'node', 'node.exe') : process.execPath;
const dataRoot = path.join(app.getPath('userData'), 'database');
const port = 4000;
let postgres;
let postgresBin;
let httpServer;
let shuttingDown = false;

function runNodeScript(script, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(bundledNode, [script, ...args], {
      cwd: serverRoot,
      env: { ...process.env, ...env },
      windowsHide: true,
      stdio: 'pipe'
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk.toString(); });
    child.stderr.on('data', chunk => { output += chunk.toString(); });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve(output) : reject(new Error(output || `Command failed: ${script} (${code})`)));
  });
}

function runBinary(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true, ...options });
    let output = '';
    child.stdout?.on('data', chunk => { output += chunk.toString(); });
    child.stderr?.on('data', chunk => { output += chunk.toString(); });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve(output) : reject(new Error(output || `Process failed: ${executable} (${code})`)));
  });
}

async function waitForDatabase(pgIsReady) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await runBinary(pgIsReady, ['-h', '127.0.0.1', '-p', '55432', '-U', 'hms', '-d', 'hms']);
      return;
    } catch { await new Promise(resolve => setTimeout(resolve, 1000)); }
  }
  throw new Error('The local database did not become ready within 60 seconds.');
}

async function startDatabase() {
  fs.mkdirSync(dataRoot, { recursive: true });
  const bin = path.join(postgresRoot, 'bin');
  postgresBin = bin;
  const initdb = path.join(bin, 'initdb.exe');
  const postgresExe = path.join(bin, 'postgres.exe');
  const pgIsReady = path.join(bin, 'pg_isready.exe');
  const passwordFile = path.join(app.getPath('userData'), 'db-password.tmp');
  const dbPasswordPath = path.join(app.getPath('userData'), 'database-password.txt');
  const password = fs.existsSync(dbPasswordPath) ? fs.readFileSync(dbPasswordPath, 'utf8') : randomBytes(32).toString('hex');
  const env = { ...process.env, PATH: `${bin};${path.join(postgresRoot, 'lib')};${process.env.PATH || ''}` };
  if (!fs.existsSync(dbPasswordPath)) fs.writeFileSync(dbPasswordPath, password, { mode: 0o600 });

  if (!fs.existsSync(path.join(dataRoot, 'PG_VERSION'))) {
    fs.writeFileSync(passwordFile, password, { mode: 0o600 });
    try {
      await runBinary(initdb, ['-D', dataRoot, '-U', 'hms', '-A', 'scram-sha-256', '--pwfile', passwordFile, '--encoding=UTF8'], { env });
    } finally {
      fs.rmSync(passwordFile, { force: true });
    }
  }

  postgres = spawn(postgresExe, ['-D', dataRoot, '-h', '127.0.0.1', '-p', '55432', '-c', 'listen_addresses=127.0.0.1'], {
    windowsHide: true, env, stdio: 'ignore'
  });
  postgres.once('exit', code => {
    if (!shuttingDown && code !== 0) dialog.showErrorBox('Hospital database stopped', 'The local database stopped unexpectedly. Restart the application.');
  });
  await waitForDatabase(pgIsReady);

  return `postgresql://hms:${encodeURIComponent(password)}@127.0.0.1:55432/hms?schema=public`;
}

async function startApi(databaseUrl) {
  const env = {
    NODE_ENV: 'production',
    PORT: String(port),
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: randomBytes(48).toString('hex'),
    CORS_ORIGIN: `http://127.0.0.1:${port}`
  };
  await runNodeScript(path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js'), ['migrate', 'deploy'], env);

  const adminEmail = 'admin@hospital.local';
  const adminPassword = randomBytes(18).toString('base64url');
  await runNodeScript(path.join(serverRoot, 'prisma', 'seed.js'), [], {
    ...env, SEED_ADMIN_EMAIL: adminEmail, SEED_ADMIN_PASSWORD: adminPassword,
    SEED_ADMIN_NAME: 'Hospital Administrator'
  });

  // The API module reads these values from process.env when it initializes Prisma and middleware.
  Object.assign(process.env, env);
  const { app: api } = await import(pathToFileURL(path.join(serverRoot, 'src', 'app.js')).href);
  const express = (await import(pathToFileURL(path.join(serverRoot, 'node_modules', 'express', 'index.js')).href)).default;
  const frontend = path.join(app.getAppPath(), 'dist');
  api.use(express.static(frontend));
  api.get(/.*/, (_req, res) => res.sendFile(path.join(frontend, 'index.html')));
  httpServer = await new Promise((resolve, reject) => {
    const server = api.listen(port, '127.0.0.1', () => resolve(server));
    server.once('error', reject);
  });
  return { adminEmail, adminPassword };
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1050, minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0b1220',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  await window.loadURL(`http://127.0.0.1:${port}`);
  window.maximize();
  window.show();
}

async function shutdown() {
  shuttingDown = true;
  if (httpServer) await new Promise(resolve => httpServer.close(resolve));
  if (postgres && !postgres.killed && postgresBin) {
    try {
      await runBinary(path.join(postgresBin, 'pg_ctl.exe'), ['-D', dataRoot, '-m', 'fast', '-w', 'stop'], {
        env: { ...process.env, PATH: `${postgresBin};${path.join(postgresRoot, 'lib')};${process.env.PATH || ''}` }
      });
    } catch (error) {
      console.error('Graceful PostgreSQL shutdown failed:', error);
      postgres.kill();
    }
  }
}

app.whenReady().then(async () => {
  try {
    const databaseUrl = await startDatabase();
    const credentials = await startApi(databaseUrl);
    await createWindow();
    if (!fs.existsSync(path.join(app.getPath('userData'), 'admin-credentials-shown'))) {
      await dialog.showMessageBox({
        type: 'info', title: 'First-time administrator account',
        message: 'Your local administrator account is ready.',
        detail: `Email: ${credentials.adminEmail}\nTemporary password: ${credentials.adminPassword}\n\nSave this password securely. This message is shown only once.`,
        buttons: ['OK']
      });
      fs.writeFileSync(path.join(app.getPath('userData'), 'admin-credentials-shown'), new Date().toISOString());
    }
  } catch (error) {
    dialog.showErrorBox('Hospital Management could not start', error?.stack || String(error));
    await shutdown();
    app.quit();
  }
});

let quitInProgress = false;
app.on('before-quit', event => {
  if (quitInProgress) return;
  event.preventDefault();
  quitInProgress = true;
  void shutdown().finally(() => app.exit(0));
});
app.on('window-all-closed', () => { app.quit(); });
