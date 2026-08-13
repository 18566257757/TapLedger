import { hashPassword, verifyPassword } from '../utils/crypto'
import { HttpError } from '../utils/http'
import { nowIso } from '../utils/time'

interface UserRow {
  id: string
  username: string
  password_hash: string
}

export class AuthService {
  constructor(private readonly database: D1Database) {}

  async setupRequired(): Promise<boolean> {
    const row = await this.database.prepare('SELECT COUNT(*) AS total FROM users').first<{ total: number }>()
    return (row?.total ?? 0) === 0
  }

  async createAdmin(username: string, password: string, baseCurrency: string, timezone: string) {
    if (!(await this.setupRequired())) throw new HttpError(409, 'Administrator already exists')
    const now = nowIso()
    const user = { id: crypto.randomUUID(), username: username.trim(), passwordHash: await hashPassword(password) }
    await this.database.batch([
      this.database.prepare(`
        INSERT INTO users (id, username, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(user.id, user.username, user.passwordHash, now, now),
      this.database.prepare(`
        UPDATE app_settings
        SET base_currency = ?, timezone = ?, setup_completed = 1, updated_at = ?
        WHERE id = 1
      `).bind(baseCurrency.trim().toUpperCase(), timezone.trim(), now),
    ])
    return { id: user.id, username: user.username }
  }

  async authenticate(username: string, password: string) {
    const row = await this.database.prepare(`
      SELECT id, username, password_hash FROM users WHERE username = ? COLLATE NOCASE
    `).bind(username.trim()).first<UserRow>()
    if (!row || !(await verifyPassword(row.password_hash, password))) throw new HttpError(401, 'Invalid username or password')
    return { id: row.id, username: row.username }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const row = await this.database.prepare('SELECT id, username, password_hash FROM users WHERE id = ?').bind(userId).first<UserRow>()
    if (!row || !(await verifyPassword(row.password_hash, currentPassword))) throw new HttpError(400, 'Current password is incorrect')
    await this.database.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .bind(await hashPassword(newPassword), nowIso(), userId)
      .run()
  }
}
