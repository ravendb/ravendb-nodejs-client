
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
