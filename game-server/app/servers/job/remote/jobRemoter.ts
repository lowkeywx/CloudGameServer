import {Application, FrontendSession, getLogger, RemoterClass} from 'pinus';
import {JobServerRecord, JobServerState} from "../../jobServerRecorder/remote/jobServerRecorderRemoter";
import {JobManager, WorkerJob, WorkerJobEvent} from "../../../service/jobManageService";
import {S2CEmitEvent, S2CMsg} from "../../../../../shared/messageCode";
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
    //存在bug,客户端断开链接应该清除对应的job
    private record:JobServerRecord;
    private jobMgr: JobManager;
    private ts: Timer;
    readonly updateDiff: number = 1000 * 10;
    constructor(private app: Application) {
        //这部分功能应该放到一个单独的plugin中
        this.ts = setInterval(this.update.bind(this),this.updateDiff);
        this.record = new JobServerRecord(this.app.serverId);
        this.jobMgr = new JobManager(this.app);
        this.jobMgr.init();
        this.jobMgr.on(WorkerJobEvent.jobFail,function (job: WorkerJob) {
            let channelService = this.app.channelService;
            let targets = {uid: job.uid,sid: job.frontendId};
            //所有的返回消息需要改成返回码, 返回码注释文字解释错误法含义
            channelService.pushMessageByUids(S2CEmitEvent.jobMsg,{code: S2CMsg.jobFail},targets,()=>{});
        }.bind(this));
    }
    private async update(){
        if (this.jobMgr.getJobsCount() == 0){
            this.record.state = JobServerState.JobStatus_Idle;
        }else if (this.jobMgr.getJobsCount() < 2){
            this.record.state = JobServerState.JobStatus_Normal;
        }else if (this.jobMgr.getJobsCount() > 2){
            this.record.state = JobServerState.JobStatus_Overload;
        }
        await this.app.rpc.jobServerRecorder.jobServerRecorderRemoter.RecordServerInfo(null,this.record);
    }
    public async doJob (job: WorkerJob) {
        this.jobMgr.storeJob(job);
        return {code: S2CMsg.jobDispatched};
    }
    //应该添加一个record改变的接口
}