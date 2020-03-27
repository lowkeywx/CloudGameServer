import {Application, getLogger} from 'pinus';
import Timer = NodeJS.Timer;
import {JobWorker, JobWorkerEvent, WorkerManagerService} from "./workerManageService";
import {EventEmitter} from 'events';
import {IComponent} from "pinus/lib/interfaces/IComponent";

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

export class WorkerJob {
    //job还需要和experimentRecord进行绑定
    constructor(manager?: JobManageService) {
        if (!manager) {
            this.state = WorkerJobState.JobState_NotInit;
            return;
        }
        this.jobMgr = manager;
        this.jobId = this.jobMgr.getJobsCount();
        this.state = WorkerJobState.JobState_Init;
    }
    jobId: number;
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
        job.jobId = job.jobMgr.getJobsCount();
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
    static isRawJob(job: WorkerJob){
        return job.state === WorkerJobState.JobState_Init;
    }
    static isFailed(job: WorkerJob){
        return job.state === WorkerJobState.JobState_Fail;
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
        this.opts = opts || {maxJob: 5,updateDiff: 1000 * 5};
        this.jobList = new Array<WorkerJob>();
        logger.info('[JobManageService][加载组件,组件初始化成功]');
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
        this.ts = setInterval(this.update.bind(this),this.updateDiff);
    }
    //这里需要调整,至少改成getJobsDoing()
    getJobsCount(){
        // let count = 0;
        // for (let job of this.jobList){
        //     if (WorkerJob.isRawJob(job)){
        //         count++;
        //     }
        // }
        return this.jobList.length;
    }
    getJob(id: number = -1){
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
            if (WorkerJob.getState(job) === WorkerJobState.JobState_Init){
                logger.info('[update][任务数据正常, 开始创建工作者.]')
                this.workerMgr.createWorkerFor(job);
                WorkerJob.setState(job,WorkerJobState.JobState_Ready);
            }
        }
    }
    async storeJob(job: WorkerJob){
        logger.info('[storeJob][收到任务将存入队列, 下一帧开始处理.]')
        if (WorkerJob.getState(job) == WorkerJobState.JobState_NotInit) {
            WorkerJob.initIfNeed(job,this);
        }
        this.jobList.push(job);
        return {jobId: job.jobId, sessionId: job.sid};
    }
    async stopJob(jobId : number){
        for (let i = 0; i < this.jobList.length; i++){
            let job = this.jobList[i];
            if (job.jobId == jobId){
                this.jobList.splice(i,1);
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
        this.jobList.splice(worker.job.jobId,1);
        this.emit(WorkerJobEvent.jobFail,worker.job);
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