import {Application, FrontendSession, Session} from 'pinus';
import Timer = NodeJS.Timer;
import {JobWorker, JobWorkerEvent, WorkerManager} from "./workerManageService";
import {EventEmitter} from 'events';

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
    constructor(manager?: JobManager) {
        if (!manager) {
            this.setState(WorkerJobState.JobState_NotInit);
            return;
        }
        this.jobMgr = manager;
        this.jobId = this.jobMgr.getJobsCount();
        this.setState(WorkerJobState.JobState_Init);
    }
    jobId: number;
    jobType: JobType;
    uid: string;
    frontendId: string;
    sid: number;
    worker: JobWorker;
    private state: WorkerJobState;
    private jobMgr: JobManager;
    private beginTime: number;
    private endTime: number;
    public getState(){
        return this.state;
    }
    public setState(state: WorkerJobState){
        this.state = state;
    }
    public initIfNeed(manager: JobManager){
        this.jobMgr = manager;
        this.jobId = this.jobMgr.getJobsCount();
        this.setState(WorkerJobState.JobState_Init);
    }
    public begin(){
        this.beginTime = Date.now();
        this.state = WorkerJobState.JobState_Doing;
    }
    public stop(){
        this.endTime = Date.now();
        this.state = WorkerJobState.JobState_Finish;
    }
}
//这里应该写成父类,父类不具有update只有简单的创建job和存储功能,用来前端服务器使用. 后端丰富update和workerMgr
export class JobManager extends EventEmitter{
    readonly name: string = 'JobManager';
    private jobList: WorkerJob[];
    private ts: Timer;
    private workerMgr: WorkerManager;
    private updateDiff: number;
    constructor(private app: Application) {
        super();
        this.app.set(this.name,this);
        this.updateDiff = 1000 * 2;
        this.jobList = new Array<WorkerJob>();
        this.workerMgr = new WorkerManager(this.app);
    }
    public init(){
        this.ts = setInterval(this.update.bind(this),this.updateDiff);
        this.workerMgr.init();
        this.exportEvent(this.workerMgr,JobWorkerEvent.workerInvalid,WorkerJobEvent.jobFail);
        this.exportEvent(this.workerMgr,JobWorkerEvent.workerCreated,WorkerJobEvent.jobBindWorker);
    }
    public getJobsCount(){
        return this.jobList.length;
    }
    public getJob(id: number = -1){
        for (let job of this.jobList){
            if (job.jobId === id){
                return job;
            }
        }
        return new WorkerJob(this);
    }
    private update(){
        for (let job of this.jobList){
            if (job.getState() === WorkerJobState.JobState_Init){
                this.workerMgr.createWorkerFor(job);
            }
        }
    }
    public storeJob(job: WorkerJob){
        if (job.getState() == WorkerJobState.JobState_NotInit) {
            job.initIfNeed(this);
        }
        this.jobList.push(job);
    }
    private exportEvent(source: EventEmitter,inEvent: string,outEvent: string){
        source.on(inEvent,function (worker: JobWorker) {
            if (inEvent == WorkerJobEvent.jobBindWorker){
                worker.job.worker = worker;
            }else if(inEvent == WorkerJobEvent.jobFail){
                worker.job.setState(WorkerJobState.JobState_Fail);
            }
            this.emit(outEvent, worker.job);
        }.bind(this));
    }
}