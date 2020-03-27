import {JobManageService, WorkerJob} from "./jobManageService";

export class ExperimentJob extends WorkerJob{
    expPath: string;
    expId: string;
    constructor(manager: JobManageService) {
        super(manager);
    }
}