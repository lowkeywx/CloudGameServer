export enum S2CEmitEvent{
    jobMsg = 'jobMsg',
    showInClient = 'showInClient'
}

export enum S2CMsg{
    authFail,               //验证失败
    jobFail,                //任务处理失败
    jobDispatched,          //任务已经派发
    jobInit,                //已生成任务数据,服务器正在处理.
    invalidArgs_jobType,
    invalidArgs_expId,
    maxJob,                 //超过实验最大请求数
    noIdleServer,           //无可用服务器
    end
}

export enum C2SMsg {
    
}