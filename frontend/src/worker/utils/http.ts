import type { Context } from 'hono'
import type { ZodError } from 'zod'
import type { AppEnvironment } from '../types'

export class HttpError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 503,
    message: string,
  ) {
    super(message)
  }
}

export function validationMessage(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ')
}

export async function readJson(c: Context<AppEnvironment>): Promise<unknown> {
  try {
    return await c.req.json()
  } catch {
    throw new HttpError(422, 'Request body must be valid JSON')
  }
}
