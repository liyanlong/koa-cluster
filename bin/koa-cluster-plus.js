#!/usr/bin/env node

var program = require('commander')
var cluster = require('cluster')

program
  .usage('<app>')
  .option('-t, --title <str>', 'title of the process')
  .option('-p, --processes <int>', 'number of processes to use', parseInt)
  .option('-s, --startsecs <int>', 'number of seconds which children needs to'
    + ' stay running to be considered a successfull start [1]', parseInt, 1)
  .option('-e, --entry <str>', 'master process entrypoint')
  .option('-A, --agent <str>', 'agent process file')
  .option('-P --port <int>', 'koa worker process bind port', 8080)
  .option('-H --host <str>', 'koa worker process bind hostname', '0.0.0.0')
  .parse(process.argv)

  // make sure the file exists
var filename = require('path').resolve(program.args[0])
var requirename = require.resolve(filename)

try {
  require('fs').statSync(requirename)
} catch (err) {
  console.error('resolved %s to %s then %s', program.args[0], filename, requirename)
  console.error('however, %s does not exist', requirename)
  process.exit(1)
}

process.env.PORT = program.port || process.env.PORT
process.env.HOST = program.host || process.env.HOST
if (program.title) process.title = program.title


var onTerminal = null

// 入口文件
if (program.entry) {
  var entryfile = require('path').resolve(program.entry)
  try {
    require('fs').statSync(entryfile)
  } catch (err) {
    console.error('entryname %s to %s', program.entry, entryfile)
    console.error('however, %s does not exist', entryfile)
    process.exit(2)
  }
  var entry = require(entryfile)
  Promise.resolve(typeof entry === 'function' ? entry() : entry).then((_onTerminal) => {
    onTerminal = typeof _onTerminal == 'function' ? _onTerminal : null
  })
}

var agentFile = null

// 查找 agent 文件是否存在
if (program.agent) {
  agentFile = require('path').resolve(program.agent)
  try {
    require('fs').statSync(agentFile)
  } catch (err) {
    console.error('agentFile %s to %s', program.agent, agentFile)
    console.error('however, %s does not exist', agentFile)
    process.exit(2)
  }
}

console.log('master process start pid %s', process.pid);
if (agentFile) {
  forkAgent().then(() => {
    forkWorkers();
  });

} else {
  forkWorkers();
}


// don't try to terminate multiple times
var terminating = false
// i'm not even sure if we need to pass SIGTERM to the workers...
function terminate() {
  if (terminating) return
  terminating = true
  // don't restart workers
  cluster.removeListener('disconnect', onDisconnect)
  // kill all workers
  Object.keys(cluster.workers).forEach(function (id) {
    console.log('sending kill signal to worker %s', id)
    cluster.workers[id].kill('SIGTERM')
  })
  
  Promise.resolve(onTerminal && onTerminal()).then(() => {
    process.exit(0)
  })
}

// remember the time which children have started in order
// to stop everything on instant failure
var startTime = process.hrtime()

function onDisconnect(worker) {
  var timeSinceStart = process.hrtime(startTime)
  timeSinceStart = timeSinceStart[0] + timeSinceStart[1] / 1e9
  if (timeSinceStart < program.startsecs) {
    console.log('worker ' + worker.process.pid + ' has died'
      + ' before startsecs is over. stopping all.')
    process.exitCode = worker.process.exitCode || 1
    terminate()
  } else {
    console.log('worker ' + worker.process.pid + ' has died. forking.')
    console.info( worker.__type)
    if (worker.__type == 'agent') {
      forkAgent();
    } else {
      forkWorker();
    }
  }
}

// http://nodejs.org/api/cluster.html#cluster_event_disconnect
// not sure if i need to listen to the `exit` event  
cluster.on('disconnect', onDisconnect)
process.on('SIGTERM', terminate)
process.on('SIGINT', terminate) 

process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE') {
    return
  }
  console.error(err.stack)
})

// 自定义reload
process.on('SIGUSR2', () => {
  // 热重启
  Object.keys(cluster.workers).forEach(function (id, index) {
    setTimeout(() => {
      console.info('reload worker %s', id);
      console.log('sending kill signal to worker %s', id)
      cluster.workers[id].kill('SIGTERM');
    }, 3000 * index);
  })

});


function forkAgent () {

  cluster.setupMaster({
    exec: require.resolve('../lib/agent.js'),
    execArgv: ['--harmony'],
    args: ['--title', agentFile],
  })
  return new Promise((resolve) => {
    const worker = cluster.fork();
    worker.__type = 'agent';
    resolve(worker);
  })
}

function forkWorker () {
  cluster.setupMaster({
    exec: require.resolve('../lib/http.js'),
    execArgv: ['--harmony'],
    args: ['--app', requirename],
  })
  let worker = cluster.fork();
  worker.process.__type = 'app';
  return worker;
}

function forkWorkers () {
  cluster.setupMaster({
    exec: require.resolve('../lib/http.js'),
    execArgv: ['--harmony'],
    args: ['--app', requirename],
  })

  // worker process nums
  var procs;
  
  if (program.processes) {
    procs = program.processes;
  } else {
    var cpus = require('os').cpus().length;
    if (agentFile) {
      cpus -= 1;
    }
    procs = Math.max(1, Math.ceil(0.75 * cpus));
  }

  for (var i = 0; i < procs; i++) {
    forkWorker();
  }

}
