import {Application, RemoterClass, FrontendSession, getLogger} from 'pinus';
import {JobServerRecord, JobServerRecorderCom} from "../../../components/jobServerRecorderCom";

let logger = getLogger('pinus');

export default function (app: Application) {
    return new jobServerRecorderRemoter(app);
}

// UserRpc的命名空间自动合并
declare global {
    interface UserRpc {
        jobServerRecorder: {
            // 一次性定义一个类自动合并到UserRpc中
            jobServerRecorderRemoter: RemoterClass<FrontendSession, jobServerRecorderRemoter>;
        };
    }
}

export class jobServerRecorderRemoter {
    private recorderMgr:JobServerRecorderCom;
    constructor(private app: Application) {
        this.recorderMgr = this.app.get('JobServerRecorderCom');
    }

    public async getBestServer () {
       return this.recorderMgr.getBestServer();
    }

    public async RecordServerInfo(serverInfo: JobServerRecord) {
        return this.recorderMgr.RecordServerInfo(serverInfo);
    }
}