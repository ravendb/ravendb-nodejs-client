export type SpartialUnit = 'Kilometers' | 'Miles';

export class SpartialUnits {
  public static readonly DefaultDistanceErrorPct: number = 0.025;
  public static readonly EarthMeanRadiusKm: number = 6371.0087714;
  public static readonly MilesToKm: number = 1.60934;

  public static readonly Kilometers: SpartialUnit = 'Kilometers';
  public static readonly Miles: SpartialUnit = 'Miles';
}