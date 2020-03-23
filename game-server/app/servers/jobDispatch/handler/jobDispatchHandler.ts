import {Application, FrontendSession, getLogger} from 'pinus';

let loger = getLogger("pinus");

export default function (app: Application) {
    return new Handler(app);
}

export class Handler {
    constructor(private app: Application) {
    }
    async doJob(msg:any,session: FrontendSession){
        //应该先如队列，在update处理队列中的job请求
        loger.info(`doJob is called! msg.jobType = ${msg.jobType}`);
        if (!msg.jobType) return 'jobType is Invalid ';
        if (msg.jobType == 'experiment'){
            if (!await this.app.rpc.experimentRecorder.experimentRemoter.IsMeetExperimentCondition(session,msg.experimentId)){
                return false;
            }

            let bestServer = await this.app.rpc.jobServerRecorder.jobServerRecorderRemoter.getBestServer(session);
            if (bestServer){
                loger.info(`the best server is ${bestServer}`);
                return this.app.rpc.job.jobRemoter.doJob.toServer(bestServer);
            }else {
                //push to queue
            }

        }else if (msg.jobType == 'computing'){

        }else {

        }
    }

}