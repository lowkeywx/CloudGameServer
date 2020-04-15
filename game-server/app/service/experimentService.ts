import {Application, getLogger} from 'pinus';
import {IComponent} from "pinus/lib/interfaces/IComponent";
import {DatabaseCom, DBTableName} from "../components/databaseCom";
import {ExperimentInfoTable} from "./db/experimentInfoTable";

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
    maxRunningNum?: number;//同一个实验最大请求次数
    durationTime?: number;//游戏能够运行的最大时长
}

export class ExperimentService implements IComponent{
    name:string;
    app: Application;
    opts: ExperimentServiceOptions;
    experimentsCondition: Map<string,Condition>;
    private database: DatabaseCom;
    private expInfoTB: ExperimentInfoTable;
    constructor(app: Application, opts ?: ExperimentServiceOptions) {
        this.app = app;
        this.opts = opts || {maxRunningNum: 2,durationTime: 1000 * 60 * 5};
        this.experimentsCondition = new Map();
    }
    beforeStart(cb: () => void){
        process.nextTick(cb);
    }
    start(cb: () => void) {
        this.database = this.app.get('DatabaseCom');
        //一下数据应该从数据库读取
        let condition: Condition = new Condition();
        condition.durationTime = this.opts.durationTime;  //最大运行时间
        condition.maxRunningNum = this.opts.maxRunningNum;            //最大运行数量
        //this.experimentsCondition['tanks'] = condition;
        process.nextTick(cb);

    }

    afterStartAll(){
        this.expInfoTB = this.database.getTable(DBTableName.Experiment);
    }
    async checkExperimentCondition(experiment: ExperimentRecord) {
        if (!experiment || !experiment.experimentId){
            logger.info('[checkExperimentCondition][实验记录不存在或实验id无效.]');
            return false;
        }
        let condition: Condition = this.experimentsCondition[experiment.experimentId];
        if (!condition) {

            let cons = await this.expInfoTB.getSource().findAll({
                //attributes: ['maxStart','durationTime'],
                where: {experimentId: experiment.experimentId}
            });
            if (!cons){
                logger.info('[checkExperimentCondition][没有找到实验的限制条件对象.]');
                return false;
            }
            for (let c of cons){
                logger.info(`[checkExperimentCondition][DB中实验${experiment.experimentId}的最大启动册数=${c.maxStart},持续时间${c.durationTime}]`);
                condition = new Condition();
                condition.durationTime = c.durationTime;  //最大运行时间
                condition.maxRunningNum = c.maxStart;            //最大运行数量
                this.experimentsCondition[experiment.experimentId] = condition;
            }
        }
        if (!condition){
            logger.info(`[checkExperimentCondition][没有找到实验的限制条件对象.实验ID=${experiment.experimentId}]`);
            return false;
        }
        //如果限制请求次数为3的话, 协成< 3或者<=2;
        return experiment.StartedCount < condition.maxRunningNum;
        //这里运行时间的判断还有问题
        // let durationTime: number = experiment.experimentTime.endTime.getTime() - experiment.experimentTime.startTime.getTime();
        // return durationTime <= condition.durationTime;
   }
}