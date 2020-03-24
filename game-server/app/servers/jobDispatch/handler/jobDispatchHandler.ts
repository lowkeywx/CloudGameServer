import {Application, FrontendSession, getLogger, scheduleJob} from 'pinus';
import {Session} from "pinus/lib/index";
import {ScheduleOptions} from "pinus/lib/interfaces/IPushScheduler";
import {SID} from "pinus/lib/util/constants";

let loger = getLogger("pinus");

export default function (app: Application) {
    return new Handler(app);
}

class JobInfo {
    session: FrontendSession;
    jobType: string;
    experimentId: string;
    originalMsg: any;
}

export class Handler {
    flushInterval: number;
    jobs: JobInfo[];   // sid -> msg queue
    tid: NodeJS.Timer = null;
    constructor(private app: Application) {
        this.flushInterval = 20;
        this.tid = setInterval(this._doJob.bind(this),this.flushInterval);
    }
    async doJob(msg:any,session: FrontendSession){
        if (!msg.jobType) return 'jobType is Invalid ';
        //应该先如队列，在update处理队列中的job请求
        let job: JobInfo;
        if (msg.jobType == 'experiment'){
            job.session = session;
            job.jobType = msg.jobType;
            job.experimentId = msg.experimentId;
            job.originalMsg = msg;
        }else if (msg.jobType == 'computing'){
        }else {
        }
        this.jobs.push(job);
        this.showMessage(null,'已生成任务数据,服务器正在处理.',session.id,null);
        return true;
    }
    private showMessage(route: string, msg: any, sid: number, cb: (err?: Error, resp ?: any) => void){
        let connector = this.app.components.__connector__;
        let opts = { type: 'push', userOptions: {}, isPush: true};
        route = route || 'showInClient';
        connector.send(null,route,msg,[sid],opts as any,cb);
    }
    private async _doJob(){
        if (!this.jobs.length) return;
        let job: JobInfo = this.jobs[0];
        if (!await this.app.rpc.experimentRecorder.experimentRemoter.IsMeetExperimentCondition(job.session,job.experimentId)){
            this.showMessage(null,`超过实验最大请求数,您前面还有${this.jobs.length}人`,job.session.id,null);
            this.jobs.shift();
            this.jobs.push(job);
            return false;
        }
        let bestServer = await this.app.rpc.jobServerRecorder.jobServerRecorderRemoter.getBestServer(job.session);
        if (!bestServer){
            this.showMessage(null,`无可用服务器,请耐心等待. 您前面还有${this.jobs.length}人`,job.session.id,null);
            return false;
        }
        //push to queue
        loger.info(`[doJob][the best server is ${bestServer}]`);
        this.jobs.shift();
        return this.app.rpc.job.jobRemoter.doJob.toServer(bestServer, job);
    }
}