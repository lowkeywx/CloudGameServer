import {Application, FrontendSession, getLogger, Session} from 'pinus';
import {JobInitArgs, JobType} from "../../../service/jobManageService";
import {S2CEmitEvent, S2CMsg} from "../../../../../shared/messageCode";
import {JobDispatchComponent} from "../../../components/jobDispatchComponent";

let logger = getLogger("pinus");

export default function (app: Application) {
    return new Handler(app);
}

export class Handler {
    private dispatcher: JobDispatchComponent;
    constructor(private app: Application) {
        this.dispatcher = this.app.get('JobDispatchComponent');
    }
    async doJob(msg:any,session: FrontendSession){
        if (typeof msg.jobType !== 'number') {
            logger.info('[doJob][无效参数: jobType]');
            return {code: S2CMsg.invalidArgs_jobType};
        }

        //应该先如队列，在update处理队列中的job请求
        let jobArgs;
        if (msg.jobType == JobType.JobType_Experiment){
            if (!msg.experimentId){
                logger.info('[doJob][无效参数: experimentId]');
                return {code: S2CMsg.invalidArgs_expId};
            }
            jobArgs = new JobInitArgs();
            jobArgs.uid = session.uid;
            jobArgs.frontendId = session.frontendId;
            jobArgs.sid = session.id;
            jobArgs.jobType = msg.jobType;
            //这两个应该从数据库获取
            jobArgs.expId = msg.experimentId;
        }else if (msg.jobType == JobType.JobType_Calculate){
        }else {
        }
        if (!jobArgs) return false;
        logger.info('[doJob][jobArgs已经成功创建, 下次循环将开始处理任务.]');
        this.dispatcher.prepareJob(jobArgs);
        return true;
    }

}