import {IComponent} from "pinus/lib/interfaces/IComponent";
import {Application} from "pinus/lib/application";
import {WorkerCommunicator, WorkerCommunicatorOptions} from "../service/workerCommunicator";

export class WorkerCommunication extends WorkerCommunicator implements IComponent {
    constructor(app: Application, opts: WorkerCommunicatorOptions) {
        super(app , opts);
        app.set('WorkerCommunication', this, true);
    }
    name = '__WorkerCommunication__';
}