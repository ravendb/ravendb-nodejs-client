import { DocumentConventions } from "../Documents/Conventions/DocumentConventions";

export interface IBroadcast {
    prepareToBroadcast(conventions: DocumentConventions): IBroadcast;
}