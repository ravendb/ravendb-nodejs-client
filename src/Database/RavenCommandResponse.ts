import {IHash} from '../Utility/Hash';

export interface IRavenResponse extends IHash {};
export type RavenCommandResponse = IRavenResponse | IRavenResponse[];