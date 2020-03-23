import {Application} from "pinus";
import {crc32} from 'crc';

export default function (app: Application) {
    return new Dispatch(app);
}

export class Dispatch {
    constructor(private app: Application) {

    }

    static dispatch (uid, connectors) {
        let index = Math.abs(crc32(uid)) % connectors.length;
        return connectors[index];
    };
}
