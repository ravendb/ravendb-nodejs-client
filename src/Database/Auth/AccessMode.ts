export type AccessMode = 'None' | 'ReadOnly' | 'ReadWrite' | 'Admin';

export class AccessModes {
  public static readonly None: AccessMode = 'None';
  public static readonly ReadOnly: AccessMode = 'ReadOnly';
  public static readonly ReadWrite: AccessMode = 'ReadWrite';
  public static readonly Admin: AccessMode = 'Admin';
}

export interface ResourcesAccessModes {
  [resource: string]: AccessMode;
}