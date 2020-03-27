import {IComponent} from "pinus/lib/interfaces/IComponent";
import {Application} from "pinus/lib/application";
import {ExperimentService, ExperimentServiceOptions} from "../service/experimentService";

export class ExperimentCondition extends ExperimentService implements IComponent {
    constructor(app: Application, opts: ExperimentServiceOptions) {
        super(app , opts);
        app.set('experimentCondition', this, true);
    }
    name = '__experimentCondition__';
}