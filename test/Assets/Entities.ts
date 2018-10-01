export class Event {
    public name: string;
    public date: Date;

    public constructor(data: { name: string, date: Date }) {
        data = data || {} as any;
        this.name = data.name;
        this.date = data.date;
    }
}

export class User {
    public id: string;
    public name: string;
    public lastName: string;
    public addressId: string;
    public count: number;
    public age: number;
}

export class Person {
    public id: string;
    public name: string;
    public addressId: string;
}

export class GeekPerson {
    public name: string;
    public favoritePrimes: number;
    public favoriteVeryLargePrimes: number;
}

export class Address {
    public id: string;
    public country: string;
    public city: string;
    public street: string;
    public zipCode: string;
}

export class OrderLine {
    public product: string;
    public productName: string;
    public pricePerUnit: number;
    public quantity: number;
    public discount: number;
}

export class Order {
    public id: string;
    public company: string;
    public employee: string;
    public orderedAt: Date;
    public requireAt: Date;
    public shippedAt: Date;
    public shipTo: Address;
    public shipVia: string;
    public freight: number;
    public lines: OrderLine[];
}

export type CompanyType = "Public" | "Private";

export class Employee {
    public id: string;
    public firstName: string;
    public lastName: string;
}

export class Contact {
    public id: string;
    public firstName: string;
    public surname: string;
    public email: string;
}

export class Company {
    public accountsReceivable: number;
    public id: string;
    public name: string;
    public desc: string;
    public email: string;
    public address1: string;
    public address2: string;
    public address3: string;
    public contacts: Contact[];
    public phone: string;
    public type: CompanyType;
    public employeesIds: string[];
}

export class Post {
    public id: string;
    public title: string;
    public desc: string;
    public comments: Post[];
    public attachmentIds: string;
    public createdAt: Date;
}
