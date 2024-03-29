import {Application, FrontendSession, getLogger, RemoterClass} from 'pinus';
import {ExperimentRecord, ExperimentService} from "../../../service/experimentService";
import {ExperimentInfoCom} from "../../../components/experimentInfoCom";

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
    experimentConditionMgr : ExperimentService;
    experimentInfoMgr: ExperimentInfoCom;
    constructor(private app: Application) {
        this.experimentsRecord = new Map<string, ExperimentRecord>();
        this.experimentConditionMgr = this.app.get('experimentCondition');
        this.experimentInfoMgr = this.app.get('ExperimentInfoCom');
    }
    public async getAllExperimentBriefInfo(schoolId: string) {
        //这里暂时只存名字, 以后会丰富数据结构
        logger.info('[getAllExperimentBriefInfo][experiment info list will be send.]');
        return await this.experimentInfoMgr.getAllExpBriefInfoForSchool(schoolId);
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
            experiment.StartedCount = 0;
            this.experimentsRecord[experimentId] = experiment;
        }
        return this.experimentConditionMgr.checkExperimentCondition(this.experimentsRecord[experimentId]);

    }
    public async addExperimentStartRecord(experimentId: string){
        let expRecord: ExperimentRecord = this.experimentsRecord[experimentId];
        expRecord.StartedCount += 1;
        logger.info(`[IsMeetExperimentCondition][该实验累计次数将累加${experimentId}.当前请求次数:${this.experimentsRecord[experimentId].StartedCount}]`);
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
        logger.info(`[experimentShutdown][实验ID=${experimentId}将要更新实验启动记录!启动次数减一]`);
        if (expRecord.StartedCount == 0){
            logger.error(`[experimentShutdown][实验ID=${experimentId},实验启动次数为零!]`);
            return false;
        }
        expRecord.StartedCount -=1;
    }
}