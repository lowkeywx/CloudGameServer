import {Application} from 'pinus';
import  {EventEmitter} from 'events';
import {JobWorker, WorkerManager} from "./workerManageService";
import {WorkerJob} from "./jobManageService";

var grpc = require('grpc');
var PROTO_PATH = 'D:\\CloudGame\\CloudGameServer\\shared\\renderCommunicator.proto';
//var renderCommunicator_proto = grpc.load(PROTO_PATH).renderCommunicator;

export class WorkerCommunicator extends EventEmitter{
    readonly name: string = 'WorkerCommunicator';
    private updateDiff: number = 1000;
    private server: any;
    private workerMgr: WorkerManager;
    constructor(private app: Application) {
        super();
        this.app.set(this.name,this);
    }
    public init(){
        setInterval(this.update.bind(this),this.updateDiff);
        this.startRPCServer();
        this.workerMgr = this.app.get('WorkerManager');
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
        callback(null,{'jobId': job.jobId,'experimentPath': job.expPath});
    }

    ReportRenderInfo(call, callback){
        let workerId = call.request.workerId;
        let worker: JobWorker = this.workerMgr.getWorker(workerId);
        worker.setProcessId(call.request.renderProcessId);
        worker.setState(call.request.renderStatus);
        callback(null,{'code': 1});
    }
}


