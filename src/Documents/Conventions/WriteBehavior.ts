export type WriteBehavior = 'LeaderOnly' | 'LeaderWithFailover';

export class WriteBehaviors {
  public static readonly LeaderOnly: WriteBehavior = 'LeaderOnly';
  public static readonly LeaderWithFailover: WriteBehavior = 'LeaderWithFailover';
}