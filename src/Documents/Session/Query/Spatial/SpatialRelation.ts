export type SpatialRelation = 'within' | 'contains' | 'disjoint' | 'intersects';

export class SpatialRelations {
  public static readonly Within: SpatialRelation = 'within';
  public static readonly Contains: SpatialRelation = 'contains';
  public static readonly Disjoint: SpatialRelation = 'disjoint';
  public static readonly Intersects: SpatialRelation = 'intersects';
}