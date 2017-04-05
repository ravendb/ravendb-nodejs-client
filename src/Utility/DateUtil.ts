import * as moment from 'moment';

export class DateUtil {
  public static timestamp(): number {
    return moment().unix();
  }

  public static timestampMs(): number {
    return moment().valueOf();
  }

  public static zeroDate(): Date {
    return moment([1, 1, 1]).toDate();
  }

  public static parse(dateString: string): Date {
    const stripped = dateString.substring(dateString.length - 1);
    const format = 'YYYY-MM-DDTHH:mm:ss.SSS0000';

    if (!dateString.endsWith('Z')) {
      const parsed = moment(dateString, format);

      if (parsed.isValid()) {
        return parsed.toDate();
      }
    }

    return moment(stripped, format).toDate();
  }

  public static stringify(date: Date): string {
    return moment(date).format('YYYY-MM-DDTHH:mm:ss.SSS0000');
  }
}