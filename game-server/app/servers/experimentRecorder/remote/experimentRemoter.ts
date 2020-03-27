import {Application, FrontendSession, getLogger, RemoterClass} from 'pinus';
import {ExperimentRecord, ExperimentService} from "../../../service/experimentService";

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
    experimentsList: string[];

    constructor(private app: Application) {
        this.experimentsRecord = new Map<string, ExperimentRecord>();
        this.experimentService = this.app.get('experimentCondition');
        this.experimentsList = new Array<string>();
        this.experimentsList.push('tanks');
    }
    public async getAllExperimentBriefInfo(schoolId: string) {
        if (schoolId){
            //从数据库获取，根据学校id
        }else {
            //从数据库获取所有
        }
        //这里暂时只存名字, 以后会丰富数据结构
        logger.info('[getAllExperimentBriefInfo][expriment info list will be send.]');
        return this.experimentsList;
    }
    public async IsMeetExperimentCondition(experimentId: string){
        if (!experimentId){
            logger.info('[IsMeetExperimentCondition][--实验id为空!--]')
            return false;
        }
        if (!this.experimentsRecord[experimentId]){
            logger.info('[IsMeetExperimentCondition][首次请求实验, 生成实验数据.]');
            let experiment: ExperimentRecord = new ExperimentRecord();
            experiment.experimentId = experimentId;
            experiment.StartedCount = 1;
            this.experimentsRecord[experimentId] = experiment;
        }
        if (await this.experimentService.checkExperimentCondition(this.experimentsRecord[experimentId])){
            let expRecord: ExperimentRecord = this.experimentsRecord[experimentId];
            expRecord.StartedCount += 1;
            return true;
        }
        return false;
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