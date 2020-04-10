import {Application, RemoterClass, FrontendSession, getLogger} from 'pinus';
import {JobDispatchComponent} from "../../../components/jobDispatchComponent";

let logger = getLogger('pinus');

export default function (app: Application) {
    return new jobDispatchRemoter(app);
}

// UserRpc的命名空间自动合并
declare global {
    interface UserRpc {
        jobDispatch: {
            // 一次性定义一个类自动合并到UserRpc中
            jobDispatchRemoter: RemoterClass<FrontendSession, jobDispatchRemoter>;
        };
    }
}

export class jobDispatchRemoter{
    private dispatcher: JobDispatchComponent;
    constructor(private app: Application) {
        this.dispatcher = this.app.get('JobDispatchComponent');
    }
    //所有sid都应该改成uid, 因为一定时间以后sid会重置
    public async onClientClose(sessionId: number){
        logger.info(`[onClientClose][收到客户端断开链接通知, 将清理任务数据]`);
        await this.dispatcher.removeBySid(sessionId);
    }

}