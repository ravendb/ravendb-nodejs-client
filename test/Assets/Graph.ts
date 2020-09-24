
export class Dog {
    public id: string;
    public name: string;
    public likes: string[];
    public dislikes: string[];
}

export class Entity {
    public id: string;
    public name: string;
    public references: string;
}

export class Genre {
    public id: string;
    public name: string;
}

export class Movie {
    public id: string;
    public name: string;
    public genres: string[];
}

export class User {
    public id: string;
    public name: string;
    public age: number;
    public hasRated: Rating[];
}

export class Rating {
    public movie: string;
    public score: number;
}