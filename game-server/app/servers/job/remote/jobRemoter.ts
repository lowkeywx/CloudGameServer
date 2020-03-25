import {Application, RemoterClass, FrontendSession, getLogger} from 'pinus';
import {JobServerRecord, JobStatus} from "../../jobServerRecorder/remote/jobServerRecorderRemoter";
import {JobManager} from "../../../service/jobManageService";
import Timer = NodeJS.Timer;

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
    private record:JobServerRecord;
    private jobMgr: JobManager;
    private ts: Timer;
    readonly updateDiff: number = 1000;
    constructor(private app: Application) {
        //这部分功能应该放到一个单独的plugin中
        this.ts = setInterval(this.update.bind(this),this.updateDiff);
        this.record = new JobServerRecord(this.app.serverId);
        this.jobMgr = new JobManager(this.app);
        this.jobMgr.init();
    }
    private async update(){
        //await this.app.rpc.jobServerRecorder.jobServerRecorderRemoter.RecordServerInfo.toServer('jobServerRecorder',this.record);
    }
    public async doJob (job: any) {
        this.jobMgr.storeJob(job);
        return 'the job is doing.';
    }
    //应该添加一个record改变的接口
}