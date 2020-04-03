import {Application, getLogger} from 'pinus';
import Timer = NodeJS.Timer;
import {JobWorker, JobWorkerEvent, WorkerManagerService} from "./workerManageService";
import {EventEmitter} from 'events';
import {IComponent} from "pinus/lib/interfaces/IComponent";
import {S2CEmitEvent, S2CMsg} from "../../../shared/messageCode";

let logger = getLogger('pinus');

export enum WorkerJobEvent{
    jobFail = 'jobFail',
    jobBindWorker = 'jobBindWorker',
    jobDoing = 'jobDoing'
}

export enum WorkerJobState {
    JobState_NotInit,
    JobState_Init,
    JobState_Ready,
    JobState_Doing,
    JobState_Finish,
    JobState_Fail
}

export enum JobType {
    JobType_Experiment,
    JobType_Calculate
}

export class JobInitArgs {
    constructor() {
    }
    uid: string;
    frontendId: string;
    sid: number;
    jobType: JobType;
    expId: string;
    //关于游戏程序路径放在哪里获取待定
    expPath: string;
}

export class WorkerJob {
    //job还需要和experimentRecord进行绑定
    constructor(manager?: JobManageService) {
        if (!manager) {
            this.state = WorkerJobState.JobState_NotInit;
            return;
        }
        this.jobMgr = manager;
        this.jobId = Date.now().toString();
        this.state = WorkerJobState.JobState_Init;
    }
    jobId: string;
    jobType: JobType;
    uid: string;
    frontendId: string;
    sid: number;
    worker: JobWorker;
    private state: WorkerJobState;
    private jobMgr: JobManageService;
    private beginTime: number;
    private endTime: number;
    static getState(job: WorkerJob){
        return job.state;
    }
    static setState(job: WorkerJob,state: WorkerJobState){
        job.state = state;
    }
    static initIfNeed(job: WorkerJob,manager: JobManageService){
        job.jobMgr = manager;
        job.jobId = Date.now().toString();
        job.state = WorkerJobState.JobState_Init;
    }
    static begin(job: WorkerJob){
        job.beginTime = Date.now();
        job.state = WorkerJobState.JobState_Doing;
    }
    static stop(job: WorkerJob){
        job.endTime = Date.now();
        job.state = WorkerJobState.JobState_Finish;
    }
    static isInit(job: WorkerJob){
        return job.state !== WorkerJobState.JobState_NotInit;
    }
    static isRawJob(job: WorkerJob){
        return job.state === WorkerJobState.JobState_Init;
    }
    static isFailed(job: WorkerJob){
        return job.state === WorkerJobState.JobState_Fail;
    }
}

export class ExperimentJob extends WorkerJob{
    expPath: string;
    expId: string;
    constructor(manager: JobManageService) {
        super(manager);
    }
}

export interface JobManagerServiceOptions {
    updateDiff?: number;
    maxJob?: number;
}
//这里应该写成父类,父类不具有update只有简单的创建job和存储功能,用来前端服务器使用. 后端丰富update和workerMgr
export class JobManageService extends EventEmitter implements IComponent{
    name: string;
    app: Application;
    opts: JobManagerServiceOptions;
    private jobList: WorkerJob[];
    private ts: Timer;
    private workerMgr: WorkerManagerService;
    private updateDiff: number;
    constructor(app: Application, opts ?: JobManagerServiceOptions) {
        super();
        this.app = app;
        this.opts = opts || {maxJob: 2,updateDiff: 1000 * 5};
        this.jobList = new Array<WorkerJob>();
        this.workerMgr = this.app.get('WorkerManagement');
    }
    // beforeStart(cb: () => void){
    //
    // }
    start(cb: () => void) {
        //这里获得workerMgr
        this.workerMgr.on(JobWorkerEvent.workerCreated,this.onWorkerCreate.bind(this));
        this.workerMgr.on(JobWorkerEvent.workerInvalid,this.onWorkerInvalid.bind(this));
        process.nextTick(cb);
    }

    afterStartAll(){
        this.addListener(WorkerJobEvent.jobFail,this.onJobFailed.bind(this));
        this.ts = setInterval(this.update.bind(this),this.updateDiff);
    }
    private sendMessage(job: JobInitArgs | WorkerJob,code: any,msg: any){
        let channelService = this.app.channelService;
        let targets = {uid: job.uid, sid: job.frontendId};
        //所有的返回消息需要改成返回码, 返回码注释文字解释错误法含义
        channelService.pushMessageByUids(S2CEmitEvent.jobMsg,{code: code,msg:msg},[targets],()=>{});
    }
    //这里需要调整,至少改成getJobsDoing()
    getJobsCount(){
        return this.jobList.length;
    }
    isOK() {
       return this.getJobsCount() <= this.opts.maxJob
    }
    //这个方法还不能使用
    getJob(id: string = ''){
        for (let job of this.jobList){
            if (job.jobId === id){
                return job;
            }
        }
        return new WorkerJob(this);
    }
    update(){
        for (let i = 0; i < this.jobList.length; i++){
            let job = this.jobList[i];
            if (WorkerJob.isRawJob(job)){
                logger.info('[update][任务数据正常, 开始创建工作者.]')
                this.workerMgr.createWorkerFor(job);
                WorkerJob.setState(job,WorkerJobState.JobState_Ready);
            }
        }
    }
    private onJobFailed(job: WorkerJob){
        //所有的返回消息需要改成返回码, 返回码注释文字解释错误法含义
        logger.info(`[sendMessage][任务处理失败, 现有任务数量: ${this.getJobsCount()}]`);
        this.sendMessage(job, S2CMsg.jobFail,"");
        this.app.rpc.experimentRecorder.experimentRemoter.experimentShutdown(null,(<ExperimentJob>job).expId);
        //这里以后会给jobRecorder服务器发送任务记录
        //通知connectorServer关闭链接
    }
    //这里应该修改一下,传入参数是jobInitArg, new一个新的WorkerJob然后将jobInitArg的值逐一赋值到新的job对象中
    async storeJob(job: JobInitArgs){
        //传入参数job是一个残缺的job对象
        logger.info('[storeJob][收到任务将存入队列, 下一帧开始处理.]');
        let fullJob;
        if (job.jobType == JobType.JobType_Experiment){
            fullJob = new ExperimentJob(this);
            fullJob.uid = job.uid;
            fullJob.sid = job.sid;
            fullJob.frontendId = job.frontendId;
            fullJob.jobType = job.jobType;
            fullJob.expId = job.expId;
            fullJob.expPath = job.expPath;
        }else if (job.jobType == JobType.JobType_Calculate){
        }else {
        }
        if (!fullJob) return null;
        if (!WorkerJob.isInit(fullJob)) {
            WorkerJob.initIfNeed(fullJob,this);
        }
        this.jobList.push(fullJob);
        return {jobId: fullJob.jobId, sessionId: fullJob.sid};
    }
    async stopJob(jobId : string){
        for (let i = 0; i < this.jobList.length; i++){
            let job = this.jobList[i];
            if (job.jobId == jobId){
                this.workerMgr.stopJob(job.worker.workerId);
            }
        }
    }
    onWorkerCreate(worker: JobWorker){
        worker.job.worker = worker;
        this.emit(WorkerJobEvent.jobBindWorker,worker.job);
    }
    onWorkerInvalid(worker: JobWorker){
        logger.info('[onWorkerInvalid][收到工作者失效信号, 处理关联任务.]')
        WorkerJob.setState(worker.job,WorkerJobState.JobState_Fail);
        for (let i = 0; i < this.jobList.length; i++){
            let job = this.jobList[i];
            if (job.jobId == worker.job.jobId){
                this.jobList.splice(i,1);
                logger.info('[onWorkerInvalid][发送任务处理失败信号.]')
                this.emit(WorkerJobEvent.jobFail,worker.job);
            }
        }
    }
    // exportEvent(source: EventEmitter,inEvent: string,outEvent: string){
    //     source.on(inEvent,function () {
    //         if (inEvent == WorkerJobEvent.jobBindWorker){
    //
    //         }else if(inEvent == WorkerJobEvent.jobFail){
    //
    //         }
    //         this.emit(outEvent, worker.job);
    //     }.bind(this));
    // }
}