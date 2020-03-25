import {Application} from 'pinus';
import * as child_process from "child_process";
import Timer = NodeJS.Timer;
import {WorkerCommunicator} from "./workerCommunicator";

enum WorkerState {
    WorkerState_Init,
    WorkerState_Start,
    WorkerState_Running,
}

export class JobWorker {
    constructor(manager: WorkerManager) {
        this.appPath = '';
        this.state = WorkerState.WorkerState_Init;
        this.workerMgr = manager;
    }
    workerId: number;
    private processId: number;
    readonly appPath: string;
    private startTime: number;
    private state: WorkerState;
    private startArgs: any;
    job: any;
    private workerMgr: WorkerManager;
    public start(){
        this.state = WorkerState.WorkerState_Start;
        child_process.execFile(this.appPath,this.startArgs); //这里除了端口id之外还可以发送jobid
        this.startTime = Date.now();
    }
    public shutDown(){

    }
    public getJob(){
        return this.job;
    }
    public setState(state: WorkerState){
        this.state = state;
    }
    public setProcessId(id: number){
        this.processId = id;
    }
}

export class WorkerManager {
    readonly name: string = 'WorkerManager';
    private workerList: Array<JobWorker>;
    private ts: Timer;
    private updateDiff: number;
    private workerPhone: WorkerCommunicator;
    constructor(private app: Application) {
        this.workerList = new Array<JobWorker>();
        this.app.set(this.name,this);
        this.updateDiff = 1000;
        this.workerPhone = new WorkerCommunicator(this.app);
    }
    public init(){
        this.ts = setInterval(this.update.bind(this),this.updateDiff);
        this.workerPhone.init();
    }
    public getWorker(workerId: number): JobWorker{
        for (let worker of this.workerList){
            if (worker.workerId === workerId){
                return worker;
            }
        }
        return null;
    }
    public createWorkerFor(job: any){
        let worker: JobWorker = new JobWorker(this);
        worker.job = job;
        worker.workerId = this.workerList.length + 1;
        worker.start();
        this.workerList.push(worker);
    }
    public getWorkerCount(){
        return this.workerList.length;
    }
    public reportImmediate(worker: JobWorker){
        //暂时不需要
    }
    private update(){
        this.checkAndReport();
    }

    private checkAndReport(){
        for (let worker of this.workerList){
            //删除异常的worker并且上报自己的状态,这部分逻辑也许不放到这里

        }
    }
}