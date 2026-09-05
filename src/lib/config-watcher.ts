import fs from 'fs';
import path from 'path';
import { createLogger } from './logger';

const log = createLogger('ConfigWatcher');

export type AppConfig = {
  maxUploadSizeMB: number;
  defaultModel: string;
  enableABHA: boolean;
  enableOCR: boolean;
  kiosk: {
    autoResetSeconds: number;
    showAyushFields: boolean;
  };
};

const CONFIG_PATH = path.resolve(process.cwd(), 'config.runtime.json');

const DEFAULT_CONFIG: AppConfig = {
  maxUploadSizeMB: 10,
  defaultModel: 'groq',
  enableABHA: true,
  enableOCR: true,
  kiosk: {
    autoResetSeconds: 120,
    showAyushFields: true,
  },
};

let currentConfig: AppConfig = { ...DEFAULT_CONFIG };

function loadConfig(): void {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      currentConfig = { ...DEFAULT_CONFIG, ...parsed };
      log.info({ config: currentConfig }, 'Config loaded from %s', CONFIG_PATH);
    } else {
      log.info('No config.runtime.json found, using defaults');
    }
  } catch (err) {
    log.error({ err }, 'Failed to parse config file, keeping previous values');
  }
}

let watcher: fs.FSWatcher | null = null;

export function startConfigWatcher(): void {
  loadConfig();

  try {
    // Use Node built-in fs.watch for cross-platform compatibility
    const dir = path.dirname(CONFIG_PATH);
    const filename = path.basename(CONFIG_PATH);

    watcher = fs.watch(dir, (eventType, changedFile) => {
      if (changedFile === filename) {
        log.info('Config file changed (%s), hot-reloading...', eventType);
        loadConfig();
      }
    });

    log.info('[ConfigWatcher] watching %s for changes', CONFIG_PATH);
  } catch (err) {
    log.warn({ err }, 'Could not start config watcher, config will be static');
  }
}

export function stopConfigWatcher(): void {
  watcher?.close();
  watcher = null;
}

export function getConfig(): AppConfig {
  return currentConfig;
}
