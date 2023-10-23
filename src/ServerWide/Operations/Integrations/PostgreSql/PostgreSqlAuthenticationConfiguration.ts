import { PostgreSqlUser } from "./PostgreSqlUser";

export interface PostgreSqlAuthenticationConfiguration {
    users: PostgreSqlUser[];
}
