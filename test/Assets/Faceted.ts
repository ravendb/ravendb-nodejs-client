
export type Currency = "USD" | "EUR" | "NIS";

export class Order {
    public product: string;
    public total: number;
    public currency: Currency;
    public quantity: number;
    public region: number = 0;
    public at: Date;
    public tax: number;
}
