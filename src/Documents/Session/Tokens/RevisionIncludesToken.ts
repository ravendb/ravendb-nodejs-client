import { QueryToken } from "./QueryToken";
import { DateUtil } from "../../../Utility/DateUtil";
import { StringBuilder } from "../../../Utility/StringBuilder";
import { StringUtil } from "../../../Utility/StringUtil";


export class RevisionIncludesToken extends QueryToken {
    private readonly _dateTime: string;
    private readonly _path: string;

    private constructor(args: { date?: string, path?: string}) {
        super();

        this._dateTime = args.date;
        this._path = args.path;
    }

    public static createForDate(dateTime: Date) {
        return new RevisionIncludesToken({
            date: DateUtil.default.stringify(dateTime),
        });
    }

    public static createForPath(path: string) {
        return new RevisionIncludesToken({
            path
        });
    }

    writeTo(writer: StringBuilder) {
        writer.append("revisions('");
        if (this._dateTime) {
            writer.append(this._dateTime);
        } else if (!StringUtil.isNullOrWhitespace(this._path)) {
            writer.append(this._path);
        }

        writer.append("')");
    }
}
