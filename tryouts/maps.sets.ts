class Entity {
  constructor(
    public id: number,
    public subject: string
  ) {}

  get raw(): object {
    return {
      id: this.id,
      subject: this.subject
    };
  }
}

interface IEntityWithMetadata {
  entity: Entity;
  metadata: object
};

const entities: Entity[] = [];
const set: Set<Entity> = new Set<Entity>();
const map: Map<Entity, IEntityWithMetadata> = new Map<Entity, IEntityWithMetadata>();

for (let i = 1; i <= 10; i++) {
  let entity: Entity = new Entity(i, `subject ${i}`);

  entities.push(entity);
  set.add(entity);
  map.set(entity, {
    entity: entity,
    metadata: entity.raw
  });
}

for (let entity of map.keys()) {
  console.log(entity);
}
console.log(' ');

for (let entity of entities) {
  console.log(`set has ${entity.subject}: `, (new Set<Entity>(entities)).has(entity));
}
console.log(' ');

for (let i = 0; i < 10; i++) {
  let entity: Entity = entities[i];

  console.log(`set has ${entity.subject}: `, set.has(entity));
  console.log(`map has ${entity.subject}: `, map.has(entity));
  console.log(`get ${entity.subject} from map: `, map.get(entity));
  console.log(`delete ${entity.subject}: `, set.delete(entity), map.delete(entity));
  console.log(`set has ${entity.subject}: `, set.has(entity));
  console.log(`map has ${entity.subject}: `, map.has(entity));
  console.log(' ');
}
