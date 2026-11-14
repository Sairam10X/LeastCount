const STORAGE_KEY_PREFIX = 'least_count_session_';
const LAST_PLAYER_NAME_KEY = 'least_count_player_name';

export interface StoredSession {
  playerId: string;
  sessionToken: string;
  roomCode: string;
}

export function getStoredSession(roomCode: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${roomCode.toUpperCase()}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredSession(session: StoredSession): void {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${session.roomCode.toUpperCase()}`,
      JSON.stringify(session)
    );
  } catch {}
}

export function clearStoredSession(roomCode: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${roomCode.toUpperCase()}`);
  } catch {}
}

export function getStoredPlayerName(): string {
  try {
    return localStorage.getItem(LAST_PLAYER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function saveStoredPlayerName(name: string): void {
  try {
    localStorage.setItem(LAST_PLAYER_NAME_KEY, name.trim());
  } catch {}
}

