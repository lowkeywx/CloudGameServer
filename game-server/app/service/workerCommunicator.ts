import {Application, getLogger} from 'pinus';
import {EventEmitter} from 'events';
import {JobWorker, WorkerManagerService} from "./workerManageService";
import {ExperimentJob, JobType, WorkerJob} from "./jobManageService";
import {IComponent} from "pinus/lib/interfaces/IComponent";

let logger = getLogger('pinus');

var PROTO_PATH = 'D:\\CloudGame\\CloudGameServer\\shared\\renderCommunicator.proto';
var grpc = require('grpc');
var protoLoader = require('@grpc/proto-loader');

var packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });

var renderCommunicator_proto = grpc.loadPackageDefinition(packageDefinition).renderCommunicator;

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
    }
    // beforeStart(cb: () => void){
    //
    // }
    start(cb: () => void) {
        //这里获得workerMgr
        this.workerMgr = this.app.get('WorkerManagement');
        this.startRPCServer();
        process.nextTick(cb);
    }
    afterStartAll(){
        setInterval(this.update.bind(this),this.opts.updateDiff);
    }
    private startRPCServer(){
        this.server = new grpc.Server();
        this.server.addService(renderCommunicator_proto.JobGetter.service, {GetJobInfo: this.getJobInfo.bind(this)});
        this.server.addService(renderCommunicator_proto.RenderInfoReport.service, {ReportRenderInfo: this.ReportRenderInfo.bind(this)});
        this.server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
        this.server.start();
    }
    private update(){

    }


    getJobInfo(call, callback){
        let workerId = call.request.workerId;
        logger.info(`[getJobInfo][worker id: ${workerId}, request get job info.]`);
        let worker = this.workerMgr.getWorker(workerId);
        if (!worker){
            logger.info(`[getJobInfo][worker id: ${workerId}, get worker error.]`);
            callback(null,{'jobId': '','experimentPath': ''});
            return;
        }
        let job: WorkerJob = worker.getJob();
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
        if (!worker){
            logger.info(`[getJobInfo][worker id: ${workerId}, get worker error.]`);
            callback(null,{'code': -1});
            return;
        }
        worker.setProcessId(call.request.renderProcessId);
        worker.setState(call.request.renderStatus);
        logger.info(`[ReportRenderInfo][worker id : ${workerId}], state : ${call.request.renderStatus}`);
        callback(null,{'code': 1});
    }
}


