export type ReadBehavior = 'LeaderOnly' | 'LeaderWithFailover' | 'RoundRobin' | 'FastestNode'
  | 'LeaderWithFailoverWhenRequestTimeSlaThresholdIsReached'
  | 'RoundRobinWithFailoverWhenRequestTimeSlaThresholdIsReached';

export class ReadBehaviors {
  public static readonly LeaderOnly: ReadBehavior = 'LeaderOnly';
  public static readonly LeaderWithFailover: ReadBehavior = 'LeaderWithFailover';
  public static readonly RoundRobin: ReadBehavior = 'RoundRobin';
  public static readonly FastestNode: ReadBehavior = 'FastestNode';

  public static readonly LeaderWithFailoverWhenRequestTimeSlaThresholdIsReached: ReadBehavior
    = 'LeaderWithFailoverWhenRequestTimeSlaThresholdIsReached';

  public static readonly RoundRobinWithFailoverWhenRequestTimeSlaThresholdIsReached: ReadBehavior
    = 'RoundRobinWithFailoverWhenRequestTimeSlaThresholdIsReached';
}