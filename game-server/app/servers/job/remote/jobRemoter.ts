import {Application, RemoterClass, FrontendSession, getLogger} from 'pinus';
import * as child_process from "child_process";

let logger = getLogger('pinus');

export default function (app: Application) {
    return new JobRemoter(app);
}

// UserRpc的命名空间自动合并
declare global {
    interface UserRpc {
        job: {
            // 一次性定义一个类自动合并到UserRpc中
            jobRemoter: RemoterClass<FrontendSession, JobRemoter>;
        };
    }
}

export class JobRemoter {
    constructor(private app: Application) {

    }
    public async doJob () {
        logger.info('start renderAgent!');
        return 'the job is doing.';
        //child_process.execFileSync('E:\\Z_DOWNLOAD\\tanks\\tanks.exe');
    }

}