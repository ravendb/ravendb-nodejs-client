import {
    AbstractIndexCreationTask,
    IDocumentStore,
    IndexDefinition,
    PutIndexesOperation,
} from "../../src/index";
import {FacetBase} from "../../src/Documents/Queries/Facets/FacetBase";
import {Facet} from "../../src/Documents/Queries/Facets/Facet";
import {RangeFacet} from "../../src/Documents/Queries/Facets/RangeFacet";

export class FacetTestContext {
    public async createCameraCostIndex(store: IDocumentStore) {
        const index = new CameraCostIndex();
        await store.maintenance.send(new PutIndexesOperation(index.createIndexDefinition()));
    }

    public async insertCameraData(store: IDocumentStore, cameras: Camera[]) {
        {
            const session = store.openSession();

            for (const camera of cameras) {
                await session.store(camera);
            }
        }
    }

    public getFacets(): FacetBase[] {
        const facet1 = new Facet();
        facet1.fieldName = "manufacturer";

        const costRangeFacet = new RangeFacet();
        costRangeFacet.ranges = [
            "cost <= 200",
            "cost >= 200 and cost <= 400",
            "cost >= 400 and cost <= 600",
            "cost >= 600 and cost <= 800",
            "cost >= 800"
        ];

        const megaPixelsRangeFacet = new RangeFacet();
        megaPixelsRangeFacet.ranges = [
            "megapixels <= 3",
            "megapixels >= 3 and megapixels <= 7",
            "megapixels >= 7 and megapixels <= 10",
            "megapixels >= 10"
        ];

        return [facet1, costRangeFacet, megaPixelsRangeFacet];
    }

    private static features = ["Image Stabilizer", "Tripod", "Low Light Compatible", "Fixed Lens", "LCD"];
    private static manufacturers = ["Sony", "Nikon", "Phillips", "Canon", "Jessops"];
    private static models = ["Model1", "Model2", "Model3", "Model4", "Model5"];

    public static getCameras(numCameras: number): Camera[] {
        const cameraList = [];

        for (let i = 1; i <= numCameras; i++) {
            const camera = new Camera();

            camera.dateOfListing =
                new Date(
                    1980 + Math.floor(30 * Math.random()),
                    Math.floor(12 * Math.random()),
                    Math.floor(27 * Math.random()));
            camera.manufacturer = this.manufacturers[Math.floor(this.manufacturers.length * Math.random())];
            camera.model = this.models[Math.floor(this.models.length * Math.random())];
            camera.cost = Math.random() * 900 + 100;
            camera.zoom = Math.random() * 10 + 1;
            camera.megapixels = Math.random() * 10 + 1;
            camera.imageStabilizer = Math.random() > 0.6;
            camera.advancedFeatures = ["??"];
            cameraList.push(camera);
        }

        return cameraList;
    }
}

export class CameraCostIndex extends AbstractIndexCreationTask {

    public createIndexDefinition() {
        const indexDefinition = new IndexDefinition();
        indexDefinition.maps = new Set(["from camera in docs.Cameras select new  { camera.manufacturer,\n" +
        "                            camera.model,\n" +
        "                            camera.cost,\n" +
        "                            camera.dateOfListing,\n" +
        "                            camera.megapixels" +
        " }"]);

        return indexDefinition;
    }

    public getIndexName() {
        return "CameraCost";
    }
}

export class Camera {
    public id: string;

    public dateOfListing: Date;
    public manufacturer: string;
    public model: string;
    public cost: number;

    public zoom: number;
    public megapixels: number;
    public imageStabilizer: boolean;
    public advancedFeatures: string[];
}
