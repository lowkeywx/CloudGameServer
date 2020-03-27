import {IComponent} from "pinus/lib/interfaces/IComponent";
import {Application} from "pinus/lib/application";
import {JobManageService, JobManagerServiceOptions} from "../service/jobManageService";

export class JobManagement extends JobManageService implements IComponent {
    constructor(app: Application, opts: JobManagerServiceOptions) {
        super(app , opts);
        app.set('JobManagement', this, true);
    }
    name = '__JobManagement__';
}