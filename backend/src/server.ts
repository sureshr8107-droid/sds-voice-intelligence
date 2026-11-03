import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initSocketServer } from './socket';

const app = createApp();
const server = http.createServer(app);
const io = initSocketServer(server);

const PORT = env.PORT;
const HOST = env.HOST;

server.listen(PORT, HOST, () => {
  logger.info(
    {
      port: PORT,
      host: HOST,
      env: env.NODE_ENV,
      prefix: env.API_PREFIX,
    },
    `🚀 AI Call Screening Backend API server listening on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`
  );
});

// Graceful shutdown handling
function handleGracefulShutdown(signal: string) {
  logger.info({ signal }, `Received ${signal}. Gracefully shutting down HTTP server...`);

  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error during HTTP server shutdown');
      process.exit(1);
    }
    logger.info('HTTP server closed cleanly. Exiting process.');
    process.exit(0);
  });

  // Force close after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown: Timed out waiting for connections to close.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Promise Rejection detected');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception detected. Shutting down...');
  process.exit(1);
});
