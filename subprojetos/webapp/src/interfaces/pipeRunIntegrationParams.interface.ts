import { IServicoPipeRun } from "./servicoPipeRun.interface";

export interface IPipeRunIntegrationParams {
    servicos: IServicoPipeRun[];
    hashFunil: string;
}
