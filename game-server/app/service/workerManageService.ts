import {Application, getLogger} from 'pinus';
import * as child_process from "child_process";
import {WorkerJob, WorkerJobState} from "./jobManageService";
import {EventEmitter} from 'events';
import {IComponent} from "pinus/lib/interfaces/IComponent";
import Timer = NodeJS.Timer;
let cmd=require('node-cmd');

let logger = getLogger('pinus');
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
    constructor(manager: WorkerManagerService) {
        //this.appPath = 'E:\\Z_DOWNLOAD\\tanks\\tanks.exe';
        this.appPath = "D:\\VSProject\\AppAgent\\output\\x64\\Debug\\AppAgent.exe";
        this.workPath = "cd D:\\VSProject\\AppAgent\\output\\x64\\Debug";
        this.state = WorkerState.WorkerState_Init;
        this.workerMgr = manager;
        this.stopImmediate = false;
        this.lastChangeTime = Date.now();
        this.workerId = this.lastChangeTime.toString();
    }
    job: WorkerJob;
    readonly workerId: string;
    private processId: number;
    readonly appPath: string;
    readonly workPath: string;
    private startTime: number;
    private state: WorkerState;
    private startArgs: any;
    private workerMgr: WorkerManagerService;
    private lastChangeTime: number;
    private stopImmediate: boolean;
    private needClean: boolean;
    readonly invalidTimeDiff = 1000 * 5;
    public start(){
        logger.info(`[start][即将启动worker程序. jobId=${this.job.jobId},workerId=${this.workerId}]`);
        this.state = WorkerState.WorkerState_Start;
        child_process.exec(`${this.appPath} -j ${this.job.jobId} -w ${this.workerId}`,function (error,stdOut,stdErr) {
            logger.log('========================= :\n\n',error);
            // logger.log('========================= :\n\n',stdOut);
            // logger.log('========================= :\n\n',stdErr);
        }); //这里除了端口id之外还可以发送jobid
        this.startTime = Date.now();
        this.lastChangeTime = this.startTime;
    }
    public shutDown(){
        if(!this.processId) return;
        cmd.get(`taskkill /pid ${this.processId} -f`,function (err, data, stderr) {
            logger.info(`err: ${err}\n data:${data}\n stderr: ${stderr}`);
        });
    }
    public getJob(){
        WorkerJob.setState(this.job,WorkerJobState.JobState_Doing);
        this.lastChangeTime = Date.now();
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
    pleasStop(){
        this.stopImmediate = true;
        this.needClean = true;
    }
    isNeedClean(){
        return this.needClean;
    }
    public isValid(){
        if (this.stopImmediate) return false;
        let diff = Date.now() - this.lastChangeTime;
        if (diff > this.invalidTimeDiff){
            this.needClean = true;
            return false;
        }
        return true;

    }
    //这里在由于是否添加修改任务状态的接口
    //可以增加一些信号,用来通知workerMgr自己状态变化等
}

export interface WorkerManagerServiceOptions {
    updateDiff?: number;
}

export class WorkerManagerService extends EventEmitter implements IComponent{
    name: string;
    app: Application;
    opts: WorkerManagerServiceOptions;
    private workerList: Array<JobWorker>;
    private ts: Timer;
    constructor(app: Application, opts ?: WorkerManagerServiceOptions) {
        super();
        this.app = app;
        this.opts = opts || {updateDiff: 1000 * 5};
        this.workerList = new Array<JobWorker>();
    }
    // beforeStart(cb: () => void){
    // }

    start(cb: () => void) {
        process.nextTick(cb);
    }

    afterStartAll(){
        this.ts = setInterval(this.update.bind(this),this.opts.updateDiff);
    }

    getWorker(workerId: string): JobWorker{
        for (let worker of this.workerList){
            //logger.info(`获取worker对象,workerId${workerId}, 当前workerid:${worker.getWorkerId()}`);
            if (worker.getWorkerId() === workerId){
                return worker;
            }
        }
        return null;
    }
    createWorkerFor(job: WorkerJob){
        let worker: JobWorker = new JobWorker(this);
        worker.job = job;
        this.workerList.push(worker);
        worker.start();
        //这个信号在这里发送不严谨, 应该worker连接上以后或者确定worker进程确实启动成功在发送
        this.emit(JobWorkerEvent.workerCreated,worker);
    }
    getWorkerCount(){
        return this.workerList.length;
    }
    reportImmediate(worker: JobWorker){
        //暂时不需要
    }
    stopJob(workerId: string){
        for (let i = 0; i < this.workerList.length; i++){
            let worker = this.workerList[i];
            if (worker.workerId == workerId){
                worker.pleasStop();
            }
        }
    }
    update(){
        this.checkAndReport();
        this.clearZombieProcess();
    }
    clearZombieProcess(){
        for (let i = 0; i < this.workerList.length; i++){
            let worker = this.workerList[i];
            if (worker.isNeedClean()){
                //杀死进程命令
                logger.info(`存在需要清理的worker对象, 对象ID=${worker.workerId}`);
                worker.shutDown();
                //这里有bug需要判断进程是否真的杀死,如果没有杀死不能从链表中清除
                this.workerList.splice(i,1);
            }
        }
    }
    checkAndReport(){
        for (let i = 0; i < this.workerList.length; i++){
            let worker = this.workerList[i];
            if (!worker.isValid()){
                //报告有的worker不行了
                logger.info(`[checkAndReport][工作者进程失联, 将清理工作者进程和任务.当前工作者进程数量: ${this.workerList.length}]`);
                this.emit(JobWorkerEvent.workerInvalid, worker);
            }
        }
    }
}