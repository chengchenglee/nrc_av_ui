import { BrowserWindow } from 'electron';
import { injectable } from 'inversify';
import { IBrowserWindowService } from '../../inversify/interfaces';

@injectable()
export default class BrowserWindowService implements IBrowserWindowService {
  private win!: BrowserWindow;

  init(browserWindow: BrowserWindow): void {
    this.win = browserWindow;
  }

  getBrowserWindow(): BrowserWindow {
    return this.win;
  }

  reload(): void {
    if (this.win?.webContents) {
      this.win.reload();
      this.win.once('ready-to-show', () => {
        this.win.show();
      });
    }
  }

  sendToRenderer(channel: string, data: any): void {
    if (!this.win?.webContents) return;
    this.win.webContents.send(channel, data);
  }
}
