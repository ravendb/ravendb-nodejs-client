
export class Address {
    public line1: string;
    public line2: string;
    public city: string;
    public region: string;
    public postalCode: string;
    public country: string;
}

export class Category {
    public id: string;
    public name: string;
    public description: string;
}

export class Company {
    public id: string;
    public externalId: string;
    public name: string;
    public contact: Contact;
    public address: Address;
    public phone: string;
    public fax: string;
}

export class Contact {
    public name: string;
    public title: string;
}

export class Employee {
    public id: string;
    public lastName: string;
    public firstName: string;
    public title: string;
    public address: Address;
    public hiredAt: Date;
    public birthday: Date;
    public homePhone: string;
    public extension: string;
    public reportsTo: string;
    public notes: string[];
    public territories: string[];
}

export class Order {
    public id: string;
    public company: string;
    public employee: string;
    public orderedAt: Date;
    public requiredAt: Date;
    public shippedAt: Date;
    public shipTo: Address;
    public shipVia: string;
    public freight: number;
    public lines: OrderLine[];
}

export class OrderLine {
    public product: string;
    public productName: string;
    public pricePerUnit: number;
    public quantity: number;
    public discount: number;
}

export class Product {
    public id: string;
    public name: string;
    public supplier: string;
    public category: string;
    public quantityPerUnit: string;
    public pricePerUnit: number;
    public unitsInStock: number;
    public unitsOnOrder: number;
    public discontinued: boolean;
    public reorderLevel: number;
}

export class Region {
    public id: string;
    public name: string;
    public territories: Territory[];
}

export class Shipper {
    public id: string;
    public name: string;
    public phone: string;
}

export class Supplier {
    public id: string;
    public contact: Contact;
    public name: string;
    public address: Address;
    public phone: string;
    public fax: string;
    public homePage: string;
}

export class Territory {
    public code: string;
    public name: string;
}
