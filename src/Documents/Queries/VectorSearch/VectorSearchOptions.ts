import { VectorEmbeddingType } from "./VectorEmbeddingType.js";

export interface IVectorOptions {
    numberOfCandidates?: number;
    similarity?: number;
    isExact?: boolean;
}

export interface FieldVectorOptions {
    dimensions?: number;
    sourceEmbeddingType: VectorEmbeddingType;
    destinationEmbeddingType: VectorEmbeddingType;
    numberOfEdges?: number;
    numberOfCandidatesForIndexing?: number;
}

export interface IVectorOptionsJson {
    SourceEmbeddingType?: VectorEmbeddingType;
    DestinationEmbeddingType?: VectorEmbeddingType;
    Dimensions?: number;
    NumberOfEdges?: number;
    NumberOfCandidates?: number;
    Similarity?: number;
    IsExact?: boolean;
    SourceFieldName?: string;
}


export class VectorOptions implements IVectorOptions {

    public isExact?: boolean;
    /**
     * Minimum similarity threshold for results (higher means more similar)
     */
    public similarity?: number;

    /**
     * Source embedding type
     */
    public sourceEmbeddingType?: VectorEmbeddingType;

    /**
     * Destination embedding type
     */
    public destinationEmbeddingType?: VectorEmbeddingType;

    /**
     * Number of candidates to consider during indexing
     */
    public numberOfCandidates?: number;

    /**
     * Number of edges in the graph
     */
    public numberOfEdges?: number;

    constructor(
        sourceEmbeddingType: VectorEmbeddingType = "Single",
        destinationEmbeddingType: VectorEmbeddingType = "Single",
        numberOfEdges?: number,
        numberOfCandidates?: number,
        similarity?: number,
        isExact?: boolean
    ) {
        this.sourceEmbeddingType = sourceEmbeddingType;
        this.destinationEmbeddingType = destinationEmbeddingType;
        this.numberOfCandidates = numberOfCandidates;
        this.numberOfEdges = numberOfEdges;
        this.similarity = similarity;
        this.isExact = isExact;
    }

    protected static fromJson(json: IVectorOptionsJson): VectorOptions {
        return new VectorOptions(
            json.SourceEmbeddingType,
            json.DestinationEmbeddingType,
            json.Dimensions,
            json.NumberOfEdges,
            json.NumberOfCandidates,
        );
    }

    protected toJson(): IVectorOptionsJson {
        return {
            SourceEmbeddingType: this.sourceEmbeddingType,
            DestinationEmbeddingType: this.destinationEmbeddingType,
            NumberOfCandidates: this.numberOfCandidates,
            NumberOfEdges: this.numberOfEdges,
            Similarity: this.similarity
        };
    }
}

export class AutoVectorOptions extends VectorOptions {
    public sourceFieldName?: string;

    constructor(
        sourceEmbeddingType: VectorEmbeddingType = "Single",
        destinationEmbeddingType: VectorEmbeddingType = "Single",
        dimensions?: number,
        numberOfEdges?: number,
        numberOfCandidates?: number,
        sourceFieldName?: string
    ) {
        super(
            sourceEmbeddingType,
            destinationEmbeddingType,
            dimensions,
            numberOfEdges,
            numberOfCandidates
        );
        this.sourceFieldName = sourceFieldName;
    }

    public static fromVectorOptions(vectorOptions: VectorOptions): AutoVectorOptions {
        return new AutoVectorOptions(
            vectorOptions.sourceEmbeddingType,
            vectorOptions.destinationEmbeddingType,
            vectorOptions.numberOfEdges,
            vectorOptions.numberOfCandidates
        );
    }

    protected static fromJson(json: IVectorOptionsJson): AutoVectorOptions {
        const vectorOptions = VectorOptions.fromJson(json);
        const autoVectorOptions = AutoVectorOptions.fromVectorOptions(vectorOptions);
        autoVectorOptions.sourceFieldName = json.SourceFieldName;
        return autoVectorOptions;
    }

    protected toJson(): IVectorOptionsJson {
        const json = super.toJson();
        json.SourceFieldName = this.sourceFieldName;
        return json;
    }
}