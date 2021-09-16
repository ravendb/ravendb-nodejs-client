import { RollingIndexDeployment } from "./RollingIndexDeployment";

export interface RollingIndex {
    activeDeployments: Record<string, RollingIndexDeployment>;
}