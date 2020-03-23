import {Application, RemoterClass, FrontendSession} from 'pinus';

export default function (app: Application) {
    return new ExperimentService(app);
}

class ExperimentTime {
    startTime: Date;
    endTime: Date;
}

class Condition {
    maxRunningNum: number;
    durationTime: number;
}
export class ExperimentRecord{
    experimentId: string;
    experimentTime: ExperimentTime;
    StartedCount: number;

}

export class ExperimentService {
    experimentsCondition: Map<string,Condition>;
    constructor(private app: Application) {
        //一下数据应该从数据库读取
        let condition: Condition;
        condition.durationTime = 1000 * 60 * 5;  //最大运行时间
        condition.maxRunningNum = 3;            //最大运行数量
        this.experimentsCondition['tanks'] = condition;
    }

   async checkExperimentCondition(experiment: ExperimentRecord) {
        if (!experiment || !experiment.experimentId){
            return false;
        }
        let condition: Condition = this.experimentsCondition[experiment.experimentId];
        if (!condition) return false;
        if(experiment.StartedCount <= condition.maxRunningNum) return false;
        let duaringTime: number = experiment.experimentTime.endTime.getTime() - experiment.experimentTime.startTime.getTime();
        return duaringTime <= condition.durationTime;
   }
}