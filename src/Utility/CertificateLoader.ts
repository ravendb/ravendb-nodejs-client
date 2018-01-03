import { IAuthOptions } from '../Typedef/IAuthOptions';
import { IDocumentStoreAuthOptions } from '../Typedef/IDocumentStoreAuthOptions';
import { InvalidOperationException, RavenException, NotSupportedException } from '../Database/DatabaseExceptions';

const fs = require('fs');
const path = require('path');

export class CertificateLoader implements IAuthOptions {
   public type?:string;
   public validate?: boolean;
   public password?: string;
   public certificate?: any[];
   public key?: any[];
   public root?: any[];

    constructor( type: string, validate:boolean = true, file: string, certificate?:string,  root?: string, pfxPassword?: string) {
        
        this.key = fs.readFileSync(this.createFilePath(file));

        if(root){
            this.root = fs.readFileSync(this.createFilePath(root));
        }

        if (pfxPassword) {
            this.password = pfxPassword;
        }

        if(certificate){
           this.certificate = fs.readFileSync(this.createFilePath(certificate))
        }

        this.validate = validate; 
        this.type = type;
    }


    private createFilePath(file: string): string {

        if (fs.existsSync(path.resolve(file))) {
            return path.resolve(file);
        }

        if (path.isAbsolute(file) && !fs.existsSync(file)) {
            throw new InvalidOperationException('Cannot find file ' + file);
        } else {
            let filePath = path.join(process.cwd(), file);

            if (!fs.existsSync(filePath)) {
                throw new InvalidOperationException('Cannot find file ' + file);
            } else {
                return filePath;
            }
        }
    }

    public static loadPem(file: string, certificate?: string, root?: string, validate?: boolean): IDocumentStoreAuthOptions {
        return new CertificateLoader('pem', validate, file, certificate, root);
    }

    public static loadPfx(file: string, pfxPassword?: string, root?: string, validate?: boolean): IDocumentStoreAuthOptions {
        return new CertificateLoader('pfx', validate, file, null, root, pfxPassword);
    }

}