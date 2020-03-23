import {Application, RemoterClass, FrontendSession} from 'pinus';

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
    constructor(private app: Application) {

    }
    private serverInfoList:[any];
    public async getBestServer () {
        return 'job-server-1';
    }

    public async RecordServerInfo(serverInfo: any) {
        this.serverInfoList.push(serverInfo);
    }
}