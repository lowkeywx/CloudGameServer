import {Application, getLogger} from "pinus";
import {DBTableBase} from "./dbTableBase";
import {DBTableName} from "../../components/databaseCom";
const Sequelize = require('sequelize');
let logger = getLogger("pinus");

export class ExperimentInfoTable extends DBTableBase{
    name: string = DBTableName.Experiment;
    constructor(app: Application,dbConn: any) {
        super(app,dbConn);
    }
    public initTable(opts: any){
        super.initTable(opts);
        this.table = this.dbConnect.define(DBTableName.Experiment, {
            // 属性
            experimentId: {
                type: Sequelize.STRING,
                allowNull: false
            },
            experimentName: {
                type: Sequelize.STRING,
                allowNull: false
                // allowNull 默认为 true
            },
            experimentTag: {
                type: Sequelize.STRING,
                defaultValue: '.exe'
            },
            AbsolutePath: {
                type: Sequelize.STRING,
            },
            schoolEntry: {
                type: Sequelize.INTEGER
            },
            departmentId: {
                type: Sequelize.INTEGER
            },
            maxStart: {
                type: Sequelize.INTEGER
            },
            durationTime: {
                type: Sequelize.INTEGER
            }
        }, {
            // 参数
        });
    }
//下面特意添加这对这个表特有的方法
}