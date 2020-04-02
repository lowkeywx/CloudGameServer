import {Application, getLogger} from 'pinus';
import {IComponent} from "pinus/lib/interfaces/IComponent";

let logger = getLogger('pinus');

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

export interface ExperimentServiceOptions {
    maxRunningNum?: number;
    durationTime?: number;
}

export class ExperimentService implements IComponent{
    name:string;
    app: Application;
    opts: ExperimentServiceOptions;
    experimentsCondition: Map<string,Condition>;
    constructor(app: Application, opts ?: ExperimentServiceOptions) {
        this.app = app;
        this.opts = opts || {maxRunningNum: 2,durationTime: 1000 * 60 * 5};
        this.experimentsCondition = new Map();
    }
    beforeStart(cb: () => void){
        process.nextTick(cb);
    }
    start(cb: () => void) {
        //一下数据应该从数据库读取
        let condition: Condition = new Condition();
        condition.durationTime = this.opts.durationTime;  //最大运行时间
        condition.maxRunningNum = this.opts.maxRunningNum;            //最大运行数量
        this.experimentsCondition['tanks'] = condition;
        process.nextTick(cb);

    }

    afterStartAll(){
    }
    checkExperimentCondition(experiment: ExperimentRecord) {
        if (!experiment || !experiment.experimentId){
            logger.info('[checkExperimentCondition][实验记录不存在或实验id无效.]')
            return false;
        }
        let condition: Condition = this.experimentsCondition[experiment.experimentId];
        if (!condition) {
            logger.info('[checkExperimentCondition][没有找到实验的限制条件对象.]')
            return false;
        }
        //如果限制请求次数为3的话, 协成< 3或者<=2;
        return experiment.StartedCount < condition.maxRunningNum;
        //这里运行时间的判断还有问题
        // let durationTime: number = experiment.experimentTime.endTime.getTime() - experiment.experimentTime.startTime.getTime();
        // return durationTime <= condition.durationTime;
   }
}