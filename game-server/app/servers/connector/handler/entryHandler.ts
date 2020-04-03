import {Application, FrontendSession, getLogger} from 'pinus';
import {S2CMsg} from "../../../../../shared/messageCode";

let loger = getLogger('pinus');

export default function (app: Application) {
    return new Handler(app);
}

export class Handler {

    constructor(private app: Application) {

    }
    async entry(msg: any, session: FrontendSession) {
        loger.info(`calling entryHandler.entry. userName : ${msg.userName}.`);
        if (await this.app.rpc.auth.authRemoter.auth(session, msg.userName,msg.password)){
            session.bind(msg.userName,(err)=>{
                if (!err){
                }
            });
            session.on('closed',function () {
                this.app.rpc.job.jobRemoter.onClientClose(null,session.id);
                this.app.rpc.jobDispatch.jobDispatchRemoter.onClientClose(null,session.id);
            }.bind(this));
            return this.app.rpc.experimentRecorder.experimentRemoter.getAllExperimentBriefInfo(null,msg.schollId);
        }
        return S2CMsg.authFail;
    }

    async leave(msg:any,session: FrontendSession){

    }

}