export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export class Logger {
  private static isDev = process.env.NODE_ENV !== 'production'

  private static formatMessage(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString()
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : ''
    return `[${timestamp}] [RC-PULSE] [${level.toUpperCase()}]: ${message}${metaStr}`
  }

  public static info(message: string, meta?: unknown): void {
    console.log(this.formatMessage('info', message, meta))
  }

  public static warn(message: string, meta?: unknown): void {
    console.warn(this.formatMessage('warn', message, meta))
  }

  public static error(message: string, meta?: unknown): void {
    console.error(this.formatMessage('error', message, meta))
  }

  public static debug(message: string, meta?: unknown): void {
    if (this.isDev) {
      console.debug(this.formatMessage('debug', message, meta))
    }
  }
}
