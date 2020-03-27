import {Application} from 'pinus';
import {EventEmitter} from 'events';
import {JobWorker, WorkerManagerService} from "./workerManageService";
import {JobType, WorkerJob} from "./jobManageService";
import {ExperimentJob} from "./experimentJob";
import {IComponent} from "pinus/lib/interfaces/IComponent";

var grpc = require('grpc');
var PROTO_PATH = 'D:\\CloudGame\\CloudGameServer\\shared\\renderCommunicator.proto';
//var renderCommunicator_proto = grpc.load(PROTO_PATH).renderCommunicator;

export interface WorkerCommunicatorOptions {
    updateDiff?: number;
}

export class WorkerCommunicator extends EventEmitter implements IComponent{
    name: string;
    app: Application;
    opts: WorkerCommunicatorOptions;
    private server: any;
    private workerMgr: WorkerManagerService;
    constructor(app: Application, opts ?: WorkerCommunicatorOptions) {
        super();
        this.app = app;
        this.opts = opts || {updateDiff: 1000 * 5};
        this.workerMgr = this.app.get('WorkerManagement');
    }
    // beforeStart(cb: () => void){
    //
    // }
    start(cb: () => void) {
        //这里获得workerMgr
        this.startRPCServer();
        process.nextTick(cb);
    }
    afterStartAll(){
        setInterval(this.update.bind(this),this.opts.updateDiff);
    }
    private startRPCServer(){
        // this.server = new grpc.Server();
        // this.server.addService(renderCommunicator_proto.JobGetter.service, {GetJobInfo: this.getJobInfo});
        // this.server.addService(renderCommunicator_proto.RenderInfoReport.service, {ReportRenderInfo: this.ReportRenderInfo});
        // this.server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
        // this.server.start();
    }
    private update(){

    }


    getJobInfo(call, callback){
        let workerId = call.request.workerId;
        let job: WorkerJob = this.workerMgr.getWorker(workerId).getJob();
        let expJob: ExperimentJob;
        if (job.jobType == JobType.JobType_Experiment){
            expJob = <ExperimentJob>job;
        }else if (job.jobType == JobType.JobType_Calculate){

        }
        callback(null,{'jobId': job.jobId,'experimentPath': expJob ? expJob.expPath : ''});
    }

    ReportRenderInfo(call, callback){
        let workerId = call.request.workerId;
        let worker: JobWorker = this.workerMgr.getWorker(workerId);
        worker.setProcessId(call.request.renderProcessId);
        worker.setState(call.request.renderStatus);
        callback(null,{'code': 1});
    }
}


