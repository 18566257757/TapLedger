import type { Context } from 'hono'
import type { ZodType } from 'zod'
import type { AppEnvironment } from '../types'
import { HttpError, readJson, validationMessage } from '../utils/http'

export async function parseBody<T>(c: Context<AppEnvironment>, schema: ZodType<T>): Promise<T> {
  const result = schema.safeParse(await readJson(c))
  if (!result.success) throw new HttpError(422, validationMessage(result.error))
  return result.data
}

export function numberQuery(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new HttpError(422, 'Invalid numeric query parameter')
  return parsed
}
