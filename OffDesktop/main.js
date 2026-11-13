const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const { exec } = require('child_process');
const os = require('os'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { createServer } = require('./server');

const PORT = 4455;
let tray, countdownWin, pairWin, timer = null, endsAt = 0;

if (!app.requestSingleInstanceLock()) app.quit();

function getPin() {
  const file = path.join(app.getPath('userData'), 'pin.txt');
  if (!fs.existsSync(file)) fs.writeFileSync(file, String(crypto.randomInt(100000, 1000000)));
  return fs.readFileSync(file, 'utf8').trim();
}
function lanUrls() {
  return Object.values(os.networkInterfaces()).flat()
    .filter((i) => i.family === 'IPv4' && !i.internal).map((i) => `http://${i.address}:${PORT}`);
}
function powerOff() {
  const cmd = process.platform === 'win32' ? 'shutdown /s /t 0'
    : process.platform === 'darwin' ? `osascript -e 'tell app "System Events" to shut down'`
    : 'systemctl poweroff';
  exec(cmd);
}
function win(file, opts) {
  const w = new BrowserWindow({ backgroundColor: '#0B0B0B', autoHideMenuBar: true, resizable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }, ...opts });
  w.loadFile(path.join(__dirname, 'renderer', file));
  return w;
}
const controller = {
  status: () => ({ active: !!timer, secondsLeft: timer ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : 0 }),
  start(seconds) {
    this.cancel();
    endsAt = Date.now() + seconds * 1000;
    if (!countdownWin || countdownWin.isDestroyed()) {
      countdownWin = win('countdown.html', { width: 340, height: 280, alwaysOnTop: true, minimizable: false, closable: false, title: 'OffDesktop' });
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      if (countdownWin && !countdownWin.isDestroyed()) countdownWin.webContents.send('tick', left);
      if (left <= 0) { clearInterval(timer); timer = null; powerOff(); }
    };
    timer = setInterval(tick, 500);
    countdownWin.webContents.once('did-finish-load', tick);
    if (!countdownWin.webContents.isLoading()) tick();
  },
  cancel() {
    if (timer) { clearInterval(timer); timer = null; }
    if (countdownWin && !countdownWin.isDestroyed()) { countdownWin.setClosable(true); countdownWin.close(); }
  },
};
function showPairing() {
  if (pairWin && !pairWin.isDestroyed()) return pairWin.focus();
  pairWin = win('pairing.html', { width: 420, height: 340, title: 'OffDesktop - Pareamento' });
}

app.on('window-all-closed', () => {});
app.whenReady().then(() => {
  app.setLoginItemSettings({ openAtLogin: true });
  ipcMain.on('cancel', () => controller.cancel());
  ipcMain.handle('info', () => ({ pin: getPin(), urls: lanUrls() }));

  createServer({ getPin, controller, publicDir: path.join(__dirname, 'public') })
    .listen(PORT, '0.0.0.0');

  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')));
  tray.setToolTip('OffDesktop');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Mostrar código de pareamento', click: showPairing },
    { label: 'Cancelar desligamento', click: () => controller.cancel() },
    { type: 'separator' },
    { label: 'Sair', click: () => app.exit(0) },
  ]));
  showPairing();
});
