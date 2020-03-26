import {Application} from 'pinus';
import * as child_process from "child_process";
import Timer = NodeJS.Timer;
import {WorkerCommunicator} from "./workerCommunicator";
import {WorkerJob} from "./jobManageService";
import {EventEmitter} from 'events';

export enum JobWorkerEvent {
    workerInvalid = 'workerInvalid',
    workerCreated = 'workerCreated'
}

enum WorkerState {
    WorkerState_Init,
    WorkerState_Start,
    WorkerState_Running
}

export class JobWorker {
    constructor(manager: WorkerManager) {
        this.appPath = '';
        this.state = WorkerState.WorkerState_Init;
        this.workerMgr = manager;
        this.workerId = this.workerMgr.getWorkerCount() + 1;
    }
    job: WorkerJob;
    readonly workerId: number;
    private processId: number;
    readonly appPath: string;
    private startTime: number;
    private state: WorkerState;
    private startArgs: any;
    private workerMgr: WorkerManager;
    private lastChangeTime: number;
    readonly invalidTimeDiff = 1000 * 5;
    public start(){
        this.state = WorkerState.WorkerState_Start;
        child_process.execFile(this.appPath,this.startArgs); //这里除了端口id之外还可以发送jobid
        this.startTime = Date.now();
        this.lastChangeTime = this.startTime;
    }
    public shutDown(){

    }
    public getJob(){
        return this.job;
    }
    public getWorkerId(){
        return this.workerId;
    }
    public getState(){
        return this.state;
    }
    public setState(state: WorkerState){
        this.state = state;
        this.lastChangeTime = Date.now();
    }
    public setProcessId(id: number){
        this.processId = id;
        this.lastChangeTime = Date.now();
    }
    public isValid(){
        let diff = Date.now() - this.lastChangeTime;
        if (diff > this.invalidTimeDiff){
            return false;
        }
        return true;
    }
    //这里在由于是否添加修改任务状态的接口
    //可以增加一些信号,用来通知workerMgr自己状态变化等
}

export class WorkerManager extends EventEmitter{
    readonly name: string = 'WorkerManager';
    private workerList: Array<JobWorker>;
    private ts: Timer;
    private updateDiff: number;
    private workerPhone: WorkerCommunicator;
    constructor(private app: Application) {
        super();
        this.workerList = new Array<JobWorker>();
        this.app.set(this.name,this);
        this.updateDiff = 1000 * 10;
        this.workerPhone = new WorkerCommunicator(this.app);
    }
    public init(){
        this.ts = setInterval(this.update.bind(this),this.updateDiff);
        this.workerPhone.init();
    }
    public getWorker(workerId: number): JobWorker{
        for (let worker of this.workerList){
            if (worker.getWorkerId() === workerId){
                return worker;
            }
        }
        return null;
    }
    public createWorkerFor(job: WorkerJob){
        let worker: JobWorker = new JobWorker(this);
        worker.job = job;
        worker.start();
        this.workerList.push(worker);
        this.emit(JobWorkerEvent.workerCreated,worker);
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
        for (let i = 0; i < this.workerList.length; i++){
            let worker = this.workerList[i];
            if (!worker.isValid()){
                //报告有的worker不行了
                this.workerList.splice(i,1);
                this.emit(JobWorkerEvent.workerInvalid, worker);
            }
        }
    }
}