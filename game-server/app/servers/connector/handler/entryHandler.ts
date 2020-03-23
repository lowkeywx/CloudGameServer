import {Application, FrontendSession, getLogger} from 'pinus';

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
            loger.info('auth pass, whill get experiment info.');
            session.set("userName", msg.userName);
            session.set("password", msg.password);
            session.set("passAuth", true);
            session.pushAll(()=>{});
            return this.app.rpc.experimentRecorder.experimentRemoter.getAllExperimentBriefInfo(session,msg.schollId);
        }
        return ;
    }

    async leave(msg:any,session:FrontendSession){

    }

}