import {Application, FrontendSession, getLogger, Session} from 'pinus';
import {ExperimentJob} from "../../../service/experimentJob";
import {JobType, WorkerJob} from "../../../service/jobManageService";
import {S2CEmitEvent, S2CMsg} from "../../../../../shared/messageCode";

let logger = getLogger("pinus");

export default function (app: Application) {
    return new Handler(app);
}

export class Handler {
    readonly flushInterval: number = 1000 * 10;
    private jobs: WorkerJob[];
    private tid: NodeJS.Timer = null;
    constructor(private app: Application) {
        this.tid = setInterval(this._doJob.bind(this),this.flushInterval);
        this.jobs = new Array<WorkerJob>();
    }
    async doJob(msg:any,session: FrontendSession){
        if (typeof msg.jobType !== 'number') {
            logger.info('[doJob][无效参数: jobType]');
            return {code: S2CMsg.invalidArgs_jobType};
        }
        if (!msg.experimentId){
            logger.info('[doJob][无效参数: experimentId]');
            return {code: S2CMsg.invalidArgs_expId};
        }
        //应该先如队列，在update处理队列中的job请求
        let job: ExperimentJob = new ExperimentJob(null);
        if (msg.jobType == JobType.JobType_Experiment){
            job.uid = session.uid;
            job.frontendId = session.frontendId;
            job.sid = session.id;
            job.jobType = msg.jobType;
            job.expId = msg.experimentId;
        }else if (msg.jobType == JobType.JobType_Calculate){
        }else {
        }
        this.jobs.push(job);
        this.showMessage(null,S2CMsg.jobInit,session.frontendId,session.uid,null);
        return true;
    }
    private showMessage(route: string, msg: any, frontendId: string, uid: string, cb: (err?: Error, resp ?: any) => void){
        route = route || S2CEmitEvent.showInClient;
        let targets = {uid: uid,sid: frontendId};
        let channelService = this.app.channelService.apushMessageByUids(route,{code: msg},[targets],()=>{});
    }
    private async _doJob(){
        if (!this.jobs.length) return;
        let job: WorkerJob = this.jobs[0];
        this.jobs.shift();
        //应该提供一个conditionService以后再完善
        let expJob = <ExperimentJob>job;
        if (!await this.app.rpc.experimentRecorder.experimentRemoter.IsMeetExperimentCondition(null,expJob.expId)){
            this.showMessage(null,S2CMsg.maxJob,job.frontendId,job.uid,null);
            this.jobs.push(job);
            return false;
        }
        let bestServer = await this.app.rpc.jobServerRecorder.jobServerRecorderRemoter.getBestServer(null);
        if (!bestServer){
            this.showMessage(null,S2CMsg.noIdleServer,job.frontendId,job.uid,null);
            this.jobs.push(job);
            return false;
        }
        //push to queue
        logger.info(`[doJob][the best server is ${bestServer}]`);
        return this.app.rpc.job.jobRemoter.doJob.toServer(bestServer, job);
    }
}