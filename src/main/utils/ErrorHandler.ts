import { Logger } from './Logger'

export class AppError extends Error {
  public code: string
  public statusCode?: number

  constructor(message: string, code = 'INTERNAL_ERROR', statusCode?: number) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
  }
}

export class ErrorHandler {
  public static handle(error: unknown, contextMessage: string): { success: false; error: string; code: string } {
    Logger.error(`${contextMessage}:`, error)

    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        code: error.code
      }
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        code: 'UNHANDLED_ERROR'
      }
    }

    return {
      success: false,
      error: 'An unknown system error occurred',
      code: 'UNKNOWN_ERROR'
    }
  }
}
