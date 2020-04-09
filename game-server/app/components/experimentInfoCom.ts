import {IComponent} from "pinus/lib/interfaces/IComponent";
import {Application, getLogger} from "pinus";
import {ExperimentInfoTable} from "../service/db/experimentInfoTable";
import {DatabaseCom, DBTableName} from "./databaseCom";

let logger = getLogger("pinus");

export interface ExperimentInfoComArgs {
    //这里可以写需要初始化的表的名字
    name: string;
}

export class ExperimentInfoCom implements IComponent{
    name: string = '__ExperimentInfoCom__'
    app: Application;
    opts: ExperimentInfoComArgs;
    private expInfoTB: ExperimentInfoTable;
    private database: DatabaseCom;
    constructor(app: Application, opts?: ExperimentInfoComArgs) {
        this.app = app;
        this.opts = opts || {name: ''};
        app.set('ExperimentInfoCom', this, true);
    }
    // beforeStart(cb: () => void){
    //
    // }
    start(cb: () => void) {
        this.database = this.app.get('DatabaseCom');
        process.nextTick(cb);
    }

    afterStartAll(){
        this.expInfoTB = this.database.getTable(DBTableName.Experiment);
    }

    public async getAllExpBriefInfoForSchool(schoolId: string){
        let expList = await this.expInfoTB.getSource().findAll();
        let expNameArray = new Array<any>();
        for(let e of expList){
            logger.info(`[getAllExpBriefInfoForSchool][实验ID=${e.experimentId},实验路径=${e.AbsolutePath}]`);
            expNameArray.push(e.experimentId);
        }
        // expList.every((exp)=>{
        //     logger.info(`[getAllExpBriefInfoForSchool][实验ID=${exp.experimentId},实验路径=${exp.AbsolutePath}]`);
        //     let info: Map<string,string> = new Map<string,string>();
        //     info.set('experimentId',exp.experimentId);
        //     info.set('AbsolutePath',exp.AbsolutePath);
        //     expNameArray.push(info);
        // });
        return expNameArray;
    }
}