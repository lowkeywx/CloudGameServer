import {IComponent} from "pinus/lib/interfaces/IComponent";
import {Application, getLogger} from 'pinus';
import Timer = NodeJS.Timer;
import {JobServerRecord, JobServerState} from "../servers/jobServerRecorder/remote/jobServerRecorderRemoter";
import {JobManageService} from "../service/jobManageService";

let logger = getLogger('pinus');

export interface JobServerCmOptions {
    updateDiff?: number;
}
//这里和jobManageService有点重复了, 以后需要整合. 基本上一个服务器一个component, 这个component中包含各种service
//不同的service实现不同的逻辑
export class JobServerComponent implements IComponent {
    name: string = '__JobServerComponent__';
    app: Application;
    opts: JobServerCmOptions;
    private record:JobServerRecord;
    private ts: Timer;
    private jobMgr: JobManageService;
    constructor(app: Application, opts: JobServerCmOptions) {
        this.app = app;
        this.opts = opts || {updateDiff: 1000 * 0.9};
        this.record = new JobServerRecord(this.app.serverId);
        this.jobMgr = this.app.get('JobManagement');
        app.set('JobServerComponent', this, true);
    }

    // beforeStart(cb: () => void){
    //
    // }
    start(cb: () => void) {
        //这里获得workerMgr
        process.nextTick(cb);
    }

    afterStartAll(){
        this.ts = setInterval(this.update.bind(this),this.opts.updateDiff);
    }
    private update(){
        if (!this.jobMgr){
            this.jobMgr = this.app.get('JobManagement');
        }
        if (!this.jobMgr) return;
        if (this.jobMgr.isIdle()){
            this.record.state = JobServerState.JobStatus_Idle;
        }else if (this.jobMgr.isOK()){
            this.record.state = JobServerState.JobStatus_Normal;
        }else if (this.jobMgr.isOverload()){
            this.record.state = JobServerState.JobStatus_Overload;
        }
        this.app.rpc.jobServerRecorder.jobServerRecorderRemoter.RecordServerInfo(null,this.record);
    }
}