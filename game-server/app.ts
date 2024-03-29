import { pinus } from 'pinus';
import { preload } from './preload';
import {JobManagement} from "./app/components/jobManagement";
import {WorkerCommunication} from "./app/components/workerCommunication";
import {WorkerManagement} from "./app/components/workerManagement";
import {ExperimentCondition} from "./app/components/experimentCondition";
import {JobDispatchComponent} from "./app/components/jobDispatchComponent";
import {JobServerComponent} from "./app/components/jobServerComponent";
import {ExperimentInfoCom} from "./app/components/experimentInfoCom";
import {DatabaseCom} from "./app/components/databaseCom";
import {JobServerRecorderCom} from "./app/components/jobServerRecorderCom";

/**
 *  替换全局Promise
 *  自动解析sourcemap
 *  捕获全局错误
 */
preload();

/**
 * Init app for client.
 */
let app = pinus.createApp();
app.set('name', 'CloudGameServer');

// app configuration
app.configure('production|development', 'connector', function () {
    app.set('connectorConfig',
        {
            connector: pinus.connectors.hybridconnector,
            heartbeat: 3,
            useProtobuf: true
        });
});

app.configure('production|development', 'gate', function () {
    app.set('connectorConfig',
        {
            connector: pinus.connectors.hybridconnector,
            useProtobuf: true
        });
});

app.configure('production|development', 'job', function () {
    app.load(DatabaseCom);
    app.load(WorkerManagement);//没有取其他组件对象
    app.load(JobManagement);//取workerManagement组件
    app.load(WorkerCommunication);//取workerManagement组件
    app.load(JobServerComponent);//取JobManagement组件
});

app.configure('production|development', 'experimentRecorder', function () {
    app.load(DatabaseCom);
    app.load(ExperimentCondition);
    app.load(ExperimentInfoCom);
});

app.configure('production|development', 'jobDispatch', function () {
    app.load(JobDispatchComponent);
});
app.configure('production|development', 'jobServerRecorder', function () {
    app.load(JobServerRecorderCom);
});

// start app
app.start();

