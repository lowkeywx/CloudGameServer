import {IComponent} from "pinus/lib/interfaces/IComponent";
import {Application, getLogger} from 'pinus';
import Timer = NodeJS.Timer;

let logger = getLogger('pinus');

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
        return record.state >= JobServerState.JobStatus_OffLine;
    }
    static canUse(record: JobServerRecord){
        return record.state < JobServerState.JobStatus_Overload;
    }
}

export interface JobServerRecorderCmOptions {
    updateDiff: number;
}

export class JobServerRecorderCom implements IComponent{
    name: string = '__JobServerRecorderCom__';
    app: Application;
    opts: JobServerRecorderCmOptions;
    private ts: Timer;
    private serverRecordList:JobServerRecord[];

    constructor(app: Application, opts: JobServerRecorderCmOptions) {
        this.app = app;
        this.opts = opts || {updateDiff: 1000 * 10};
        app.set('JobServerRecorderCom', this, true);
        this.serverRecordList = new Array<JobServerRecord>();

    }

    beforeStart(cb: () => void){
        process.nextTick(cb);
    }
    start(cb: () => void) {
        process.nextTick(cb);
    }

    afterStartAll(){
        this.ts = setInterval(this.update.bind(this),this.opts.updateDiff);
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
            logger.info('[getBestServer][job服务器记录列表为空, 将首次初始化此列表, 所有服务器状态为离线!]');
            let serverList = this.app.getServersByType('job');
            for (let server of serverList){
                let serverNode: JobServerRecord = new JobServerRecord(server.id);
                this.serverRecordList.push(serverNode);
            }
        }
        for (let server of this.serverRecordList){
            logger.info(`[getBestServer][遍历job服务器列表, 服务器ID: ${server.serverId}!, 服务器状态:${server.state}]`);
            if (JobServerRecord.invalid(server)){
                break;
            }
            if(JobServerRecord.canUse(server)){
                return server.serverId;
            }
        }
        logger.info('[getBestServer][没有可用的服务器!]');
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
    }
}