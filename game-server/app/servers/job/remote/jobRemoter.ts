import {Application, FrontendSession, getLogger, RemoterClass} from 'pinus';
import {JobServerRecord, JobServerState} from "../../jobServerRecorder/remote/jobServerRecorderRemoter";
import {JobManageService, WorkerJob, WorkerJobEvent} from "../../../service/jobManageService";
import {S2CEmitEvent, S2CMsg} from "../../../../../shared/messageCode";
import Timer = NodeJS.Timer;
import {ExperimentJob} from "../../../service/experimentJob";

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
    private jobMgr: JobManageService;
    private ts: Timer;
    private jobSession: any[];
    readonly updateDiff: number = 1000 * 5;
    constructor(private app: Application) {
        this.record = new JobServerRecord(this.app.serverId);
        this.jobSession = new Array<any>();
        //这部分功能应该放到一个单独的plugin中
        if (this.app.serverType == 'job'){
            this.ts = setInterval(this.update.bind(this),this.updateDiff);
            this.app.get('JobManagement').on(WorkerJobEvent.jobFail,this.onJobFailed.bind(this));
        }
    }
    private sendMessage(job: WorkerJob,msg: any){
        let channelService = this.app.channelService;
        let targets = {uid: job.uid,sid: job.frontendId};
        //所有的返回消息需要改成返回码, 返回码注释文字解释错误法含义
        channelService.pushMessageByUids(S2CEmitEvent.jobMsg,{code: msg},[targets],()=>{});
    }
    private onJobFailed(job: WorkerJob){
        //所有的返回消息需要改成返回码, 返回码注释文字解释错误法含义
        logger.info(`[sendMessage][任务处理失败, 现有任务数量: ${this.jobMgr.getJobsCount()}]`);
        this.sendMessage(job,S2CMsg.jobFail);
        this.app.rpc.experimentRecorder.experimentRemoter.experimentShutdown(null,(<ExperimentJob>job).expId);
        //这里以后会给jobRecorder服务器发送任务记录
        //通知connectorServer关闭链接
    }
    private async update(){
        if (!this.jobMgr){
            this.jobMgr = this.app.get('JobManagement');
        }
        if (!this.jobMgr) return;
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
        logger.info('[doJob][收到新的任务,加入到任务队列,下一次循环处理.]')
        let info = this.jobMgr.storeJob(job);
        this.jobSession.push(info);
        this.sendMessage(job,S2CMsg.jobDispatched);
    }
    public async onClientClose(sessionId: string){
        for (let info of this.jobSession){
            if (info.sessionId == sessionId){
                await this.jobMgr.stopJob(info.jobId);
            }
        }
    }
    //应该添加一个record改变的接口
}