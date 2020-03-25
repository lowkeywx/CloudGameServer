import {Application, FrontendSession} from 'pinus';
import Timer = NodeJS.Timer;
import {WorkerManager} from "./workerManageService";

enum WorkerJobState {
    JobState_Init,
    JobState_Doing,
    JobState_Finish
}

export class WorkerJob {
    constructor(manager: JobManager) {
        this.jobMgr = manager;
        this.jobId = this.jobMgr.getJobsCount();
    }
    jobId: number;
    state: WorkerJobState;
    private beginTime: number;
    private endTime: number;
    expId: string;
    expPath: string;
    private jobMgr: JobManager;
    session: FrontendSession;
    public setState(state: WorkerJobState){
        this.state = state;
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

export class JobManager {
    readonly name: string = 'JobManager';
    private jobList: WorkerJob[];
    private ts: Timer;
    private workerMgr: WorkerManager;
    private updateDiff: number;
    constructor(private app: Application) {
        this.app.set(this.name,this);
        this.updateDiff = 1000;
        this.jobList = new Array<WorkerJob>();
        this.workerMgr = new WorkerManager(this.app);
    }
    public init(){
        this.ts = setInterval(this.update.bind(this),this.updateDiff);
        this.workerMgr.init();
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
            if (job.state === WorkerJobState.JobState_Init){
                this.workerMgr.createWorkerFor(job);
            }
        }
    }
    public storeJob(job: WorkerJob){
        this.jobList.push(job);
    }
}