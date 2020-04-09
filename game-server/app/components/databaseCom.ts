import {IComponent} from "pinus/lib/interfaces/IComponent";
import {Application, getLogger} from "pinus";
import {DBTableBase} from "../service/db/dbTableBase";
import {ExperimentInfoTable} from "../service/db/experimentInfoTable"
const Sequelize = require('sequelize');

let logger = getLogger("pinus");

export enum DBTableName {
    Experiment = 'experiment',
    Condition = 'condition',
    Last = 'Last'
}

export interface DatabaseComArgs {
    database: string;
    host: string;
    port: number;
    username: string;
    password: string;
    dialect: string;
}

export class DatabaseCom implements IComponent{
    name: string = '__DatabaseCom__';
    app: Application;
    opts: DatabaseComArgs;
    private dbConnect: any;
    private tableList: Map<string,DBTableBase>;
    private factory: Map<string, any>;

    constructor(app: Application, opts: DatabaseComArgs) {
        this.opts = opts || {database: 'StaticInfo',
            host: '10.0.19.15',
            port: 3306,
            username:'root',
            password: '123456',
            dialect:'mysql'};
        app.set('DatabaseCom', this, true);
        this.tableList = new Map<string, DBTableBase>();
        this.factory = new Map<string, any>();
    }
    // beforeStart(cb: () => void){
    //
    // }
    start(cb: () => void) {
        this.initAllTableFactory();
        this.dbConnect = new Sequelize(
            `${this.opts.dialect}://${this.opts.username}:${this.opts.password}@${this.opts.host}:${this.opts.port}/${this.opts.database}`);
        this.initAllTable();
        this.syncAllTable();
        process.nextTick(cb);
    }

    afterStartAll(){

    }
    private initAllTableFactory(){
        this.factory.set(DBTableName.Experiment,ExperimentInfoTable);

    }
    private initAllTable(){
        this.factory.forEach(function (f) {
            let tb = new f(this.app,this.dbConnect);
            if (!tb){
                logger.error(`[getTable][创建表${tb.name}失败]`);
                return;
            }
            tb.initTable({});
            this.tableList.set(tb.name,tb);
        }.bind(this));
    }
    private syncAllTable(){
        this.tableList.forEach(function (t) {
            t.sync({}).then(()=>{});
        })
    }
    public getTable(name: string){
        let tb = this.tableList.get(name);
        if (!tb){
            let f = this.factory.get(name);
            tb = new f(this.app,this.dbConnect);
            if (!tb){
                logger.error(`[getTable][创建表${name}失败]`);
                return;
            }
            tb.initTable({});
            this.tableList.set(name,tb);
        }
        return tb;
    }
}