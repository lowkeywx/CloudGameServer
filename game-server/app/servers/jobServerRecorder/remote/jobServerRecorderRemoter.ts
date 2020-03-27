import {Application, RemoterClass, FrontendSession, getLogger} from 'pinus';
import Timer = NodeJS.Timer;

let logger = getLogger('pinus');

export default function (app: Application) {
    return new jobServerRecorderRemoter(app);
}

// UserRpc的命名空间自动合并
declare global {
    interface UserRpc {
        jobServerRecorder: {
            // 一次性定义一个类自动合并到UserRpc中
            jobServerRecorderRemoter: RemoterClass<FrontendSession, jobServerRecorderRemoter>;
        };
    }
}

export enum JobServerState {
    JobStatus_Idle,
    JobStatus_Normal,
    JobStatus_Overload,
    JobStatus_OffLine,
    JobStatus_Error
}

//这些数据会定期同步到数据库,共后台查询
export class JobServerRecord {
    serverId: string;
    processId: number;
    state: JobServerState;//1空闲 2正常 3超载 4离线 5异常
    lastReportTime: number;
    startTime: number;
    workerCount: number;
    cupUsed: number;
    memoryUsed: number;
    readonly invalidDiff: number;
    //这里暂时只传入id,以后有需求在穿Application
    constructor(serverId: string) {
        this.invalidDiff = 1000 * 60;
        this.serverId = serverId;
        this.workerCount = 0;
        this.lastReportTime = 0;
        this.state = JobServerState.JobStatus_OffLine;
        this.processId = 0;
    }
    static invalid(record: JobServerRecord){
        if (Date.now() - record.lastReportTime > record.invalidDiff){
            record.state = JobServerState.JobStatus_Error;
        }
        return record.state <= 3;
    }
}

export class jobServerRecorderRemoter {
    private serverRecordList:JobServerRecord[];
    readonly updateDiff: number;
    private ts: Timer;
    constructor(private app: Application) {
        this.serverRecordList = new Array<JobServerRecord>();
        this.updateDiff = 1000 * 10;
        if (this.app.serverType == 'jobServerRecorder'){
            this.ts = setInterval(this.update.bind(this),this.updateDiff);
        }
    }
    private update(){
        for (let record of this.serverRecordList){
            logger.info(`[update][serverId is : ${record.serverId}. server state: ${record.state}, last reportTime: ${record.lastReportTime}]`);
            if (JobServerRecord.invalid(record)){

            }
        }
    }
    public async getBestServer () {
        if (!this.serverRecordList.length){
            let serverList = this.app.getServersByType('job');
            for (let server of serverList){
                let serverNode: JobServerRecord = new JobServerRecord(server.id);
                this.serverRecordList.push(serverNode);
            }
        }
        for (let server of this.serverRecordList){
            if(server.state <= 2){
                return server.serverId;
            }
        }
        logger.info('[getBestServer][no available server!]');
        return '';
    }

    public async RecordServerInfo(serverInfo: JobServerRecord) {
        for (let i = 0; i < this.serverRecordList.length; i++){
            //logger.info(`[RecordServerInfo][receive report msg: serverId is : ${serverInfo.serverId}. state is : ${serverInfo.state}]`);
            let server = this.serverRecordList[i];
            if(server.serverId == serverInfo.serverId){
                //logger.info('[server][change server state!]');
                serverInfo.lastReportTime = Date.now();
                this.serverRecordList[i] = serverInfo;
            }
        }

        for (let server of this.serverRecordList){

        }
    }
}