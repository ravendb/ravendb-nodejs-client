import { CONSTANTS } from "../../Constants";
import { StringUtil } from "../../Utility/StringUtil";
import * as path from "path";
import * as fs from "fs";

export class BackupUtils {
    // noinspection JSUnusedLocalSymbols
    private constructor() {
    }

    private static readonly LEGACY_INCREMENTAL_BACKUP_EXTENSION = ".ravendb-incremental-dump";
    private static readonly LEGACY_FULL_BACKUP_EXTENSION = ".ravendb-full-dump";

    public static readonly BACKUP_FILE_SUFFIXES = [
        BackupUtils.LEGACY_INCREMENTAL_BACKUP_EXTENSION,
        BackupUtils.LEGACY_FULL_BACKUP_EXTENSION,
        CONSTANTS.Documents.PeriodicBackup.INCREMENTAL_BACKUP_EXTENSION,
        CONSTANTS.Documents.PeriodicBackup.FULL_BACKUP_EXTENSION
    ];

    public static isIncrementalBackupFile(extension: string): boolean {
        return StringUtil.equalsIgnoreCase(CONSTANTS.Documents.PeriodicBackup.INCREMENTAL_BACKUP_EXTENSION, extension)
            || StringUtil.equalsIgnoreCase(BackupUtils.LEGACY_INCREMENTAL_BACKUP_EXTENSION, extension);
    }

    public static comparator(o1: string, o2: string) {
        const baseName1 = path.basename(o1, path.extname(o1));
        const baseName2 = path.basename(o2, path.extname(o2));

        if (baseName1 !== baseName2) {
            return baseName1.localeCompare(baseName2);
        }

        const extension1 = path.extname(o1);
        const extension2 = path.extname(o2);

        if (extension1 !== extension2) {
            return periodicBackupFileExtensionComparator(o1, o2);
        }

        const lastModified1 = fs.statSync(o1).mtimeMs;
        const lastModified2 = fs.statSync(o2).mtimeMs;

        return lastModified1 - lastModified2;
    }

}

export function periodicBackupFileExtensionComparator(o1: string, o2: string) {
    if (path.resolve(o1) === path.resolve(o2)) {
        return 0;
    }

    if (StringUtil.equalsIgnoreCase(path.extname(o1), "." + CONSTANTS.Documents.PeriodicBackup.SNAPSHOT_EXTENSION)) {
        return -1;
    }

    if (StringUtil.equalsIgnoreCase(path.extname(o1), "." + CONSTANTS.Documents.PeriodicBackup.FULL_BACKUP_EXTENSION)) {
        return -1;
    }

    return 1;
}