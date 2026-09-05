import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const transport = isDev
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: '{msg}',
      },
    }
  : undefined;

export function createLogger(module: string) {
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    transport,
    base: { module },
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  });
}

// Pre-built module loggers
export const logQuestionFlow = createLogger('QuestionFlow');
export const logOCR = createLogger('OCR');
export const logABHA = createLogger('ABHA');
export const logSummarizer = createLogger('Summarizer');
export const logConfig = createLogger('Config');
export const logServer = createLogger('Server');
