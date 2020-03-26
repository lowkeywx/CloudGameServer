import {JobManager, WorkerJob} from "./jobManageService";

export class ExperimentJob extends WorkerJob{
    expPath: string;
    expId: string;
    constructor(manager: JobManager) {
        super(manager);
    }
}