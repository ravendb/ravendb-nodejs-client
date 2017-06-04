/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {Serializer} from "../../src/Json/Serializer";
import {DateUtil} from "../../src/Utility/DateUtil";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {DocumentConstructor} from "../../src/Documents/Conventions/DocumentConventions";
import {Foo} from "../BaseTest";

describe('Document serializing test', () => {
  let json : object;
  let nestedObjectTypes: IRavenObject<DocumentConstructor>;
  
  beforeEach(() => {
    json = {
      '@metadata': {},
      stringProp: "string",
      numberProp: 2,
      numberFloatProp: 2.5,
      booleanProp: true,
      nullProp: null,
      undefinedProp: undefined,
      objectProp: {
        stringProp: "string",
        numberProp: 2,
        numberFloatProp: 2.5,
        booleanProp: true,
        nullProp: null,
        arrayProp: [1, 2, 3]
      },
      arrayProp: [1, 2, 3],
      deepObjectProp: {
        someProp: "someValue",
        someObject: {
          someProp: "someValue"
        }
      },
      deepArrayProp: [
        1, 2, [3, 4]
      ],
      deepArrayObjectProp: [
        1, 2, {
          someProp: "someValue",
          someArray: [3, 4]
        }, [5, 6], [7, 8, {
          someProp: "someValue",
        }]
      ],
      dateProp: '2017-06-04T18:39:05.1230000',
      deepFooProp: {
        '@metadata': {},
        id: 'foo1',
        name: 'Foo #1',
        order: 1
      },
      deepArrayFooProp: [{
        '@metadata': {},
        id: 'foo2',
        name: 'Foo #2',
        order: 2
      },{
        '@metadata': {},
        id: 'foo3',
        name: 'Foo #3',
        order: 3
      }]
    };

    nestedObjectTypes = {
      dateProp: Date,
      deepFooProp: Foo,
      deepArrayFooProp: Foo
    };
  });
  
  describe('create()', () => {
    it('should parse scalars', () => {
      let document: IRavenObject = {};
      Serializer.fromJSON(document, json, {}, nestedObjectTypes);

      expect(document.stringProp).to.be.a('string');
      expect(document.stringProp).to.equals('string');
      expect(document.numberProp).to.be.a('number');
      expect(document.numberProp).to.equals(2);
      expect(document.numberFloatProp).to.be.a('number');
      expect(document.numberFloatProp).to.equals(2.5);
      expect(document.booleanProp).to.be.a('boolean');
      expect(document.booleanProp).to.equals(true);
      expect(document.nullProp).to.be.null;
    });

    it('should skip undefined props', () => {
      let document: IRavenObject = {};
      Serializer.fromJSON(document, json, {}, nestedObjectTypes);

      expect(document).to.not.have.property('undefinedProp');
    });

    it('should parse arrays', () => {
      let document: IRavenObject = {};
      Serializer.fromJSON(document, json, {}, nestedObjectTypes);

      expect(document.arrayProp).to.be.a('array');
      expect(document.arrayProp).to.have.length(3);
      expect(document.arrayProp).to.deep.equal([1, 2, 3]);
    });

    it('should parse deep arrays', () => {
      let document: IRavenObject = {};
      Serializer.fromJSON(document, json, {}, nestedObjectTypes);

      const deep: number[] = document.deepArrayProp[2];

      expect(document.deepArrayProp).to.be.a('array');
      expect(document.deepArrayProp).to.have.length(3);
      expect(document.deepArrayProp).to.deep.equal([1, 2, [3, 4]]);

      expect(deep).to.be.a('array');
      expect(deep).to.have.length(2);
      expect(deep).to.deep.equal([3, 4]);
    });

    it('should parse Objects', () => {
      let document: IRavenObject = {};
      Serializer.fromJSON(document, json, {}, nestedObjectTypes);
      
      expect(document.objectProp).to.be.a('object');
      expect(document.objectProp).to.have.property('stringProp');
      expect(document.objectProp).to.have.property('numberProp');
      expect(document.objectProp).to.have.property('numberFloatProp');
      expect(document.objectProp).to.have.property('booleanProp');
      expect(document.objectProp).to.have.property('nullProp');
      expect(document.objectProp).to.have.property('arrayProp');

      expect(document.objectProp.stringProp).to.be.a('string');
      expect(document.objectProp.stringProp).to.equals('string');
      expect(document.objectProp.numberProp).to.be.a('number');
      expect(document.objectProp.numberProp).to.equals(2);
      expect(document.objectProp.numberFloatProp).to.be.a('number');
      expect(document.objectProp.numberFloatProp).to.equals(2.5);
      expect(document.objectProp.booleanProp).to.be.a('boolean');
      expect(document.objectProp.booleanProp).to.equals(true);
      expect(document.objectProp.nullProp).to.be.null;

      expect(document.objectProp.arrayProp).to.be.a('array');
      expect(document.objectProp.arrayProp).to.have.length(3);
      expect(document.objectProp.arrayProp).to.deep.equal([1, 2, 3]);
    });

    it('should parse deep Objects', () => {
      let document: IRavenObject = {};
      Serializer.fromJSON(document, json, {}, nestedObjectTypes);

      const deep: object = document.deepObjectProp.someObject;
      
      expect(document.deepObjectProp).to.be.a('object');
      expect(document.deepObjectProp).to.have.property('someProp', 'someValue');

      expect(deep).to.be.a('object');
      expect(deep).to.have.property('someProp', 'someValue');
    });

    it('should parse mixed deep arrays/Objects', () => {
      let document: IRavenObject = {};
      Serializer.fromJSON(document, json, {}, nestedObjectTypes);

      const deepObject: IRavenObject = <IRavenObject>document.deepArrayObjectProp[2];
      const deepArrayInObject: number[] = deepObject.someArray;
      const deepArray: any[] = document.deepArrayObjectProp[4];
      const deepObjectInArray: object = deepArray[2];
      
      expect(deepObject).to.be.a('object');
      expect(deepObject).to.have.property('someProp', 'someValue');    

      expect(deepArrayInObject).to.be.a('array');
      expect(deepArrayInObject).to.have.length(2);
      expect(deepArrayInObject).to.deep.equal([3, 4]);

      expect(deepArray).to.be.a('array');
      expect(deepArray).to.have.length(3);
      expect(deepArray[0]).to.equal(7);      
      expect(deepArray[1]).to.equal(8);      

      expect(deepObjectInArray).to.be.a('object');
      expect(deepObjectInArray).to.have.property('someProp', 'someValue');
    });

    it('should parse dates', () => {
      let document: IRavenObject = {};
      Serializer.fromJSON(document, json, {}, nestedObjectTypes);
      
      expect(document.dateProp).to.be.a('object');
      expect(document.dateProp).to.be.an.instanceOf(Date);
      expect(DateUtil.stringify(document.dateProp)).to.equal((<IRavenObject>json).dateProp);
    });

    it('should parse deep objects and arrays according to specified nested objects types', () => {
      let document: IRavenObject = {};
      Serializer.fromJSON(document, json, {}, nestedObjectTypes);
      
      expect(document.deepArrayFooProp).to.be.an('array');

      const target: IRavenObject[] = [document.deepFooProp].concat(document.deepArrayFooProp);
      const source: IRavenObject[] = [(<IRavenObject>json).deepFooProp].concat((<IRavenObject>json).deepArrayFooProp);

      target.forEach((item: IRavenObject, index: number) => {
        expect(item).to.be.a('object');
        expect(item).to.be.an.instanceOf(Foo);
        expect(item).to.have.property('id', (<IRavenObject>source[index]).id);
        expect(item).to.have.property('name', (<IRavenObject>source[index]).name);
        expect(item).to.have.property('order', (<IRavenObject>source[index]).order);
      });
    });

    it('should serialize back to source json', () => {
      let document: IRavenObject = {};
      Serializer.fromJSON(document, json, {}, nestedObjectTypes);
      
      let serialized: object = Serializer.toJSON(document, {});

      expect(serialized).to.deep.equals(json);
    });
  });
});

