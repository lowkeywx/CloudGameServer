import { IComponent } from 'pinus/lib/interfaces/IComponent';
import { Application } from 'pinus/lib/application';

export class RenderCommunicationComponent  implements IComponent {
    constructor(app: Application, opts: any) {
        app.set('RenderCommunication', this, true);
    }
    name = '__RenderCommunication__';

    start(cb) {
        console.log('Hello World Start');
        process.nextTick(cb);
    }

    afterStart(cb) {
        console.log('Hello World afterStart');
        process.nextTick(cb);
    }

    stop(force, cb) {
        console.log('Hello World stop');
        process.nextTick(cb);
    }
}