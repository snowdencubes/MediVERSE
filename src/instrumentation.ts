import { startConfigWatcher } from './lib/config-watcher';
import { startStatusReporter } from './lib/status-reporter';
import { createLogger } from './lib/logger';

const log = createLogger('Bootstrap');

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    log.info('🚀 MediVERSE server starting...');
    log.info({ port: process.env.PORT || 3000, node_env: process.env.NODE_ENV }, 'Environment');

    // Start the config file watcher (hot-reload without restart)
    startConfigWatcher();

    // Start periodic status heartbeats
    startStatusReporter(30_000);

    log.info('✅ All modules initialized');
  }
}
