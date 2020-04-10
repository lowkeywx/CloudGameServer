import {IComponent} from "pinus/lib/interfaces/IComponent";
import {Application, getLogger} from "pinus";
import Timer = NodeJS.Timer;
import {JobInitArgs, JobType, WorkerJobState} from "../service/jobManageService";
import {S2CEmitEvent, S2CMsg} from "../../../shared/messageCode";
import {privateDecrypt} from "crypto";

let logger = getLogger("pinus");

export interface JobDispatchCmOptions {
    updateDiff?: number;
    maxJob?: number;//整个系统能承接任务数量, 目前没有使用
}

export class JobDispatchComponent implements IComponent{
    name: string = '__JobDispatchComponent__';
    app: Application;
    opts: JobDispatchCmOptions;
    private ts: Timer;
    private jobs: JobInitArgs[];
    constructor(app: Application, opts ?: JobDispatchCmOptions) {
        this.app = app;
        this.opts = opts || {maxJob: 5,updateDiff: 1000 * 3};
        this.jobs = new Array<JobInitArgs>();
        app.set('JobDispatchComponent', this, true);
    }

    // beforeStart(cb: () => void){
    //
    // }
    start(cb: () => void) {
        process.nextTick(cb);
    }

    afterStartAll(){
        this.ts = setInterval(this.update.bind(this),this.opts.updateDiff);
    }
    public async removeBySid(sid: number){
        for (let i = 0; i < this.jobs.length; i++){
            let job = this.jobs[i];
            if (job.sid == sid){
                logger.info(`[removeBySid][将清理任务初始化数据,sessionId=${sid}-${job.sid}, 接收服务器ID=${job.jobServerId}]`);
                await this.app.rpc.job.jobRemoter.onClientClose.toServer(job.jobServerId,job.sid);
                this.jobs.splice(i,1);
            }
        }
    }
    public prepareJob(jobArgs: JobInitArgs){
        //应该先如队列，在update处理队列中的job请求
        if (!jobArgs) return false;
        this.jobs.push(jobArgs);
        this.showMessage(null,S2CMsg.jobInit,'',jobArgs.frontendId,jobArgs.uid,null);
        return true;
    }
    private update(){
        this._doJob();
    }
    private showMessage(route: string, msg: any, data: any, frontendId: string, uid: string, cb: (err?: Error, resp ?: any) => void){
        route = route || S2CEmitEvent.showInClient;
        let targets = {uid: uid,sid: frontendId};
        this.app.channelService.apushMessageByUids(route,{code: msg,data: data},[targets],()=>{});
    }
    private async _doJob(){
        if (!this.jobs.length) {
            logger.info(`[_doJob][任务队列为空!]`);
            return;
        }

        for (let i = 0; i < this.jobs.length; i++){
            let jobArg = this.jobs[i];
            if (jobArg.state == WorkerJobState.JobState_Dispatch || jobArg.state == WorkerJobState.JobState_Receive) continue;
            if (jobArg.jobType == JobType.JobType_Experiment) {
                if (!await this.app.rpc.experimentRecorder.experimentRemoter.IsMeetExperimentCondition(null,jobArg.expId)){
                    this.showMessage(null,S2CMsg.maxJob,`您前面还有${i}人`,jobArg.frontendId,jobArg.uid,null);
                    continue;
                }
                logger.info(`[_doJob][条件检测已经通过]. 任务类型=${jobArg.jobType}, 任务关联的session=${jobArg.sid}`);
            }
            let bestServer = await this.app.rpc.jobServerRecorder.jobServerRecorderRemoter.getBestServer(null);
            if (!bestServer){
                logger.info(`[_doJob][没有找到最佳可用服务器`);
                this.showMessage(null,S2CMsg.noIdleServer,`您前面还有${i}人`,jobArg.frontendId,jobArg.uid,null);
                continue;
            }
            await this.app.rpc.experimentRecorder.experimentRemoter.addExperimentStartRecord(null,jobArg.expId)
            //这里应该判断一下,成功以后才可以删除, 没成功直接continue
            //push to queue
            logger.info(`[doJob][找到最佳可用服务器, ID: ${bestServer}]`);
            jobArg.jobServerId = bestServer;
            jobArg.state = WorkerJobState.JobState_Dispatch;
            await this.app.rpc.job.jobRemoter.doJob.toServer(bestServer, jobArg);
            jobArg.state = WorkerJobState.JobState_Receive;
        }


    }
    private async oldDoJobLogic(){
        let jobArgs: JobInitArgs = this.jobs[0];
        this.jobs.shift();
        //应该提供一个conditionService以后再完善
        //类型判断封装哼一个函数吧
        if (jobArgs.jobType == JobType.JobType_Experiment) {
            if (!await this.app.rpc.experimentRecorder.experimentRemoter.IsMeetExperimentCondition(null,jobArgs.expId)){
                this.showMessage(null,S2CMsg.maxJob,'',jobArgs.frontendId,jobArgs.uid,null);
                this.jobs.push(jobArgs);
                return false;
            }
            logger.info(`[_doJob][条件检测已经通过]. 任务类型=${jobArgs.jobType}, 任务关联的session=${jobArgs.sid}`);
        }
        let bestServer = await this.app.rpc.jobServerRecorder.jobServerRecorderRemoter.getBestServer(null);
        if (!bestServer){
            logger.info(`[doJob][没有找到最佳可用服务器`);
            this.showMessage(null,S2CMsg.noIdleServer,'',jobArgs.frontendId,jobArgs.uid,null);
            this.jobs.push(jobArgs);
            return false;
        }
        await this.app.rpc.experimentRecorder.experimentRemoter.addExperimentStartRecord(null,jobArgs.expId)
        //push to queue
        logger.info(`[doJob][找到最佳可用服务器, ID: ${bestServer}]`);
        await this.app.rpc.job.jobRemoter.doJob.toServer(bestServer, jobArgs);
    }
}

