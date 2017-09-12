export type SpartialRelation = 'within' | 'contains' | 'disjoint' | 'intersects';

export class SpartialRelations {
  public static readonly Within: SpartialRelation = 'within';
  public static readonly Contains: SpartialRelation = 'contains';
  public static readonly Disjoint: SpartialRelation = 'disjoint';
  public static readonly Intersects: SpartialRelation = 'intersects';
}