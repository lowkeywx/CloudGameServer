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
        this.experimentService = expService(app);
    }
    /**
     *
     * @param username
     * @param password
     */
    public async getAllExperimentBriefInfo(schoolId : string) {
        if (schoolId){
            //从数据库获取，根据学校id
        }else {
            //从数据库获取所有
        }
        let expInfo = [];
        expInfo.push('tanks');
        logger.info('[getAllExperimentBriefInfo][expriment info list will be send.]');
        return expInfo;
    }

    public async  IsMeetExperimentCondition(experimentId:any){
        if (!this.experimentsRecord[experimentId]){
            let experiment: ExperimentRecord;
            experiment.experimentId = experimentId;
            experiment.StartedCount = 1;
            this.experimentsRecord[experimentId] = experiment;
        }else {
            let expRecord: ExperimentRecord = this.experimentsRecord[experimentId];
            expRecord.StartedCount += 1;
        }
        return await this.experimentService.checkExperimentCondition(this.experimentsRecord[experimentId]);

    }

    public async experimentShutdow(experimentId: string){
        if (!experimentId){
            logger.error('[experimentShutdow][experimentId is invalid!]');
            return false;
        }
        let expRecord: ExperimentRecord = this.experimentsRecord[experimentId];
        if (!expRecord){
            logger.error(`[experimentShutdow][do not find experimentRecord by id ${experimentId}]`);
            return false;
        }
        if (expRecord.StartedCount = 0){
            logger.error('[experimentShutdow][no running ecperiment need to be shutdow!]');
            return false;
        }
        expRecord.StartedCount -=1;
    }
}