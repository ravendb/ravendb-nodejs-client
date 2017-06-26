export type ConcurrencyCheckMode = 'Auto' | 'Forced' | 'Disabled';

export class ConcurrencyCheckModes {
  public static readonly Auto: ConcurrencyCheckMode = 'Auto';
  public static readonly Forced: ConcurrencyCheckMode = 'Forced';
  public static readonly Disabled: ConcurrencyCheckMode = 'Disabled';
}