import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: "Maze Hunter",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Remove menu bar
  win.setMenu(null);

  // In production, load the built index.html
  // Vite builds to dist/public in this project setup
  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../dist/public/index.html'));
  } else {
    // In dev, assuming Vite runs on 5000 or similar
    // For direct executable test, loading file is safer
    win.loadFile(path.join(__dirname, '../dist/public/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
