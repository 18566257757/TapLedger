import type { AuthenticatedSession } from '../types'
import { newSecret, sha256Hex } from '../utils/crypto'
import { addHours, nowIso } from '../utils/time'

interface SessionRow {
  session_id: string
  user_id: string
  username: string
  csrf_token_hash: string
  expires_at: string
}

export interface SessionCredentials {
  token: string
  csrfToken: string
  auth: AuthenticatedSession
}

export class SessionService {
  constructor(private readonly database: D1Database) {}

  async create(user: { id: string; username: string }, ttlHours = 24 * 7): Promise<SessionCredentials> {
    const token = newSecret(48)
    const csrfToken = newSecret(32)
    const createdAt = nowIso()
    const expiresAt = addHours(createdAt, ttlHours)
    const id = crypto.randomUUID()
    const csrfTokenHash = await sha256Hex(csrfToken)
    await this.database.prepare(`
      INSERT INTO user_sessions (id, user_id, token_hash, csrf_token_hash, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, user.id, await sha256Hex(token), csrfTokenHash, createdAt, expiresAt).run()
    return {
      token,
      csrfToken,
      auth: {
        user,
        session: { id, csrfTokenHash, expiresAt },
      },
    }
  }

  async getActive(token: string): Promise<AuthenticatedSession | null> {
    const row = await this.database.prepare(`
      SELECT s.id AS session_id, s.user_id, u.username, s.csrf_token_hash, s.expires_at
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
      LIMIT 1
    `).bind(await sha256Hex(token), nowIso()).first<SessionRow>()
    if (!row) return null
    return {
      user: { id: row.user_id, username: row.username },
      session: { id: row.session_id, csrfTokenHash: row.csrf_token_hash, expiresAt: row.expires_at },
    }
  }

  async rotateCsrf(sessionId: string): Promise<string> {
    const csrfToken = newSecret(32)
    await this.database.prepare('UPDATE user_sessions SET csrf_token_hash = ? WHERE id = ?')
      .bind(await sha256Hex(csrfToken), sessionId)
      .run()
    return csrfToken
  }

  async revoke(sessionId: string): Promise<void> {
    await this.database.prepare('UPDATE user_sessions SET revoked_at = ? WHERE id = ?').bind(nowIso(), sessionId).run()
  }
}
