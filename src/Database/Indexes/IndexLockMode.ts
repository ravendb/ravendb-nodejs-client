export type IndexLockMode = 'Unlock' | 'LockedIgnore' | 'LockedError' | 'SideBySide';

export class IndexLockModes {
  public static readonly Unlock: IndexLockMode = 'Unlock';
  public static readonly LockedIgnore: IndexLockMode = 'LockedIgnore';
  public static readonly LockedError: IndexLockMode = 'LockedError';
  public static readonly SideBySide: IndexLockMode = 'SideBySide';
}