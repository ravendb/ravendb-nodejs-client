export type FieldTermVectorOption = 'No' | 'Yes' | 'WithPositions' | 'WithOffsets' | 'WithPositionsAndOffsets';

export class FieldTermVectorOptions {
  public static readonly No: FieldTermVectorOption = 'No';
  public static readonly Yes: FieldTermVectorOption = 'Yes';
  public static readonly WithPositions: FieldTermVectorOption = 'WithPositions';
  public static readonly WithOffsets: FieldTermVectorOption = 'WithOffsets';
  public static readonly WithPositionsAndOffsets: FieldTermVectorOption = 'WithPositionsAndOffsets';
}