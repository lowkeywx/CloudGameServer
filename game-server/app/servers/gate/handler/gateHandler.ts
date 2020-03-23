import { Application, FrontendSession } from 'pinus';
import {Dispatch} from '../../../util/dispatcher'
import {getLogger} from "pinus-logger";

let logger = getLogger('pinus');

export default function (app: Application) {
    return new Handler(app);
}

export class Handler {
    constructor(private app: Application) {

    }

    async queryEntry (msg, session) {
        var uid = msg.uid;
        if (!uid) return;
        // get all connectors
        let connectors = this.app.getServersByType('connector');
        if (!connectors) return;
        // select connector
        return Dispatch.dispatch(uid, connectors);
    };





}