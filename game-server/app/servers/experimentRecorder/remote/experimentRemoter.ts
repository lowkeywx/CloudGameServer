import {Application, RemoterClass, FrontendSession, getLogger} from 'pinus';
import expService, {ExperimentRecord, ExperimentService} from "../../../service/experimentService";

let logger = getLogger('pinus');

export default function (app: Application) {
    return new experimentRemoter(app);
}

// UserRpc的命名空间自动合并
declare global {
    interface UserRpc {
        experimentRecorder: {
            // 一次性定义一个类自动合并到UserRpc中
            experimentRemoter: RemoterClass<FrontendSession, experimentRemoter>;
        };
    }
}

export class experimentRemoter {
    experimentsRecord: Map<string, ExperimentRecord>;
    experimentService : ExperimentService;
    constructor(private app: Application) {
        this.experimentsRecord = new Map<string, ExperimentRecord>();
        this.experimentService = expService(app);
    }
    public async getAllExperimentBriefInfo(schoolId: string) {
        if (schoolId){
            //从数据库获取，根据学校id
        }else {
            //从数据库获取所有
        }
        //这里暂时只存名字, 以后会丰富数据结构
        let expInfo:string[] = new Array<string>();
        expInfo.push('tanks');
        logger.info('[getAllExperimentBriefInfo][expriment info list will be send.]');
        return expInfo;
    }

    public async  IsMeetExperimentCondition(experimentId:any){
        if (!this.experimentsRecord[experimentId]){
            let experiment: ExperimentRecord = new ExperimentRecord();
            experiment.experimentId = experimentId;
            experiment.StartedCount = 1;
            this.experimentsRecord[experimentId] = experiment;
        }else {
            let expRecord: ExperimentRecord = this.experimentsRecord[experimentId];
            expRecord.StartedCount += 1;
        }
        return await this.experimentService.checkExperimentCondition(this.experimentsRecord[experimentId]);

    }

    public async experimentShutdown(experimentId: string){
        if (!experimentId){
            logger.error('[experimentShutdown][experimentId is invalid!]');
            return false;
        }
        let expRecord: ExperimentRecord = this.experimentsRecord[experimentId];
        if (!expRecord){
            logger.error(`[experimentShutdown][do not find experimentRecord by id ${experimentId}]`);
            return false;
        }
        if (expRecord.StartedCount == 0){
            logger.error('[experimentShutdown][no running experiment need to be shutdown!]');
            return false;
        }
        expRecord.StartedCount -=1;
    }
}