export type SpatialUnit = 'Kilometers' | 'Miles';

export class SpatialUnits {
  public static readonly DefaultDistanceErrorPct: number = 0.025;
  public static readonly EarthMeanRadiusKm: number = 6371.0087714;
  public static readonly MilesToKm: number = 1.60934;

  public static readonly Kilometers: SpatialUnit = 'Kilometers';
  public static readonly Miles: SpatialUnit = 'Miles';
}