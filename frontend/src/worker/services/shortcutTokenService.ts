import { newSecret, sha256Hex } from '../utils/crypto'
import { nowIso } from '../utils/time'

export class ShortcutTokenService {
  constructor(private readonly database: D1Database) {}

  async rotate(): Promise<string> {
    const token = newSecret(32)
    const now = nowIso()
    await this.database.batch([
      this.database.prepare('UPDATE shortcut_tokens SET revoked_at = ? WHERE revoked_at IS NULL').bind(now),
      this.database.prepare('INSERT INTO shortcut_tokens (id, token_hash, created_at) VALUES (?, ?, ?)')
        .bind(crypto.randomUUID(), await sha256Hex(token), now),
    ])
    return token
  }

  async configured(): Promise<boolean> {
    return Boolean(await this.database.prepare('SELECT id FROM shortcut_tokens WHERE revoked_at IS NULL LIMIT 1').first())
  }

  async verify(token: string): Promise<boolean> {
    return Boolean(await this.database.prepare('SELECT id FROM shortcut_tokens WHERE token_hash = ? AND revoked_at IS NULL LIMIT 1')
      .bind(await sha256Hex(token))
      .first())
  }
}
