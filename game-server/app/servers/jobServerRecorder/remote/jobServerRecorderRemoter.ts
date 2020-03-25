import {Application, RemoterClass, FrontendSession, getLogger} from 'pinus';

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

export enum JobStatus {
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
    status: JobStatus;//1空闲 2正常 3超载 4离线 5异常
    lastReportTime: number;
    startTime: number;
    workerCount: number;
    cupUsed: number;
    memoryUsed: number;
    //这里暂时只传入id,以后有需求在穿Application
    constructor(serverId: string) {
        this.serverId = serverId;
        this.workerCount = 0;
        this.lastReportTime = 0;
        this.status = JobStatus.JobStatus_OffLine;
        this.processId = 0;
    }
}

export class jobServerRecorderRemoter {
    private serverRecordList:JobServerRecord[];
    constructor(private app: Application) {
        this.serverRecordList = new Array<JobServerRecord>();
        let serverList = this.app.getServersByType('job');
        //这里可能需要改成foreach
        // for (let server of serverList){
        //     let serverNode: JobServerRecord = new JobServerRecord(this.app.serverId);
        //     this.serverRecordList.push(serverNode);
        // }
    }
    public async getBestServer () {
        for (let server of this.serverRecordList){
            if(server.status <= 2){
                return server.serverId;
            }
        }
        logger.info('[getBestServer][no available server!]');
        return '';
    }

    public async RecordServerInfo(serverInfo: JobServerRecord) {
        for (let server of this.serverRecordList){
            if(server.serverId == serverInfo.serverId){
                server = serverInfo;
            }
        }
    }
}