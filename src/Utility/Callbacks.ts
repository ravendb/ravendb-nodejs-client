export type EntityCallback<T> = (entity?: T, error?: Error) => void;
export type EntitiesArrayCallback<T> = (entities?: T[], error?: Error) => void;
export type EntitiesCountCallback = (entitiesCount?: number, error?: Error) => void;