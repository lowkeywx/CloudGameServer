import {Application, getLogger} from "pinus";
const Sequelize = require('sequelize');
let logger = getLogger("pinus");

export class DBTableBase {
    name: string;
    app: Application;
    dbConnect: any;
    table: any;
    constructor(app: Application,dbConn: any) {
        this.app = app;
        this.dbConnect = dbConn;
    }
    public getSource(){
        return this.table;
    }
    public initTable(opts: any) {

    }
    public async sync(opts: any){
        await this.table.sync(opts);
    }
    public async create(data: any){
        await this.table.create(data);
    }
    public async update(data: any, opts: any){
        await this.table.update(data,opts);
    }
    public async query(opts: any){
        return this.table.findAll(opts);
    }
    public async del(opts: any){
        await this.table.destroy(opts);
    }
}