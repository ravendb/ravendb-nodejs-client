import * as moment from 'moment';

export class DateUtil {
  public static timestamp(): number {
    return moment().unix();
  }
  public static zeroDate(): Date {
    return moment([1, 1, 1]).toDate();
  }

  public static parseTimestamp(timestamp: string): Date {
    return moment(timestamp, 'YYYY-MM-DDTHH:mm:ss.SSS').toDate();
  }
}