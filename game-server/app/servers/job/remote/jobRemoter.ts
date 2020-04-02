import {Application, FrontendSession, getLogger, RemoterClass} from 'pinus';
import {JobServerRecord, JobServerState} from "../../jobServerRecorder/remote/jobServerRecorderRemoter";
import {
    ExperimentJob,
    JobInitArgs,
    JobManageService,
    WorkerJob,
    WorkerJobEvent
} from "../../../service/jobManageService";
import {S2CEmitEvent, S2CMsg} from "../../../../../shared/messageCode";
import Timer = NodeJS.Timer;
import {JobServerComponent} from "../../../components/jobServerComponent";

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
    private jobMgr: JobManageService;
    private jobServerCm: JobServerComponent;
    private jobSession: any[];
    constructor(private app: Application) {
        this.jobServerCm = this.app.get('JobServerComponent');
        this.jobMgr = this.app.get('JobManagement');
        this.jobSession = new Array<any>();
    }
    private sendMessage(job: JobInitArgs | WorkerJob,code: any,msg: any){
        let channelService = this.app.channelService;
        let targets = {uid: job.uid, sid: job.frontendId};
        //所有的返回消息需要改成返回码, 返回码注释文字解释错误法含义
        channelService.pushMessageByUids(S2CEmitEvent.jobMsg,{code: code,msg:msg},[targets],()=>{});
    }
    //workerJob应该继承JobInitArg以实现兼容性
    public async doJob (job: JobInitArgs) {
        if(!job){
            logger.info('[doJob][收到错误任务信息!]');
        }
        logger.info('[doJob][收到新的任务,加入到任务队列,下一次循环处理.]')
        let info = await this.jobMgr.storeJob(job);
        if (!info) {
            this.sendMessage(job,S2CMsg.jobFail,info.jobId);
            logger.info(`[doJob][任务信息没有存储成功,}`);
        }
        this.jobSession.push(info);
        logger.info(`[doJob][info.jobId=${info.jobId}`);
        this.sendMessage(job,S2CMsg.jobDispatched,info.jobId);
    }
    //客户端断开链接后,清理正在处理和未处理的任务
    public async onClientClose(sessionId: number){
        logger.info(`[onClientClose][有客户端链接断开, sessionId=${sessionId}`);
        for (let info of this.jobSession){
            if (info.sessionId == sessionId){
                await this.jobMgr.stopJob(info.jobId);
            }
        }
    }
    //应该添加一个record改变的接口
}