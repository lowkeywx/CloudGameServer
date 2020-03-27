import {IComponent} from "pinus/lib/interfaces/IComponent";
import {Application} from "pinus/lib/application";
import {WorkerManagerService, WorkerManagerServiceOptions} from "../service/workerManageService";

export class WorkerManagement extends WorkerManagerService implements IComponent {
    constructor(app: Application, opts: WorkerManagerServiceOptions) {
        super(app , opts);
        app.set('WorkerManagement', this, true);
    }
    name = '__WorkerManagement__';
}