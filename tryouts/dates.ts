import * as moment from 'moment';

const dateString: string = '2017-06-04T18:39:05.1230000';
const format: string = 'YYYY-MM-DDTHH:mm:ss.SSS0000';

const date: Date = moment(dateString, format).toDate();

console.log(date.getFullYear());
console.log(date.getMonth());
console.log(date.getDate());
console.log(date.getHours());
console.log(date.getMinutes());
console.log(date.getSeconds());
console.log(date.getMilliseconds());
console.log(moment(date).format(format));
