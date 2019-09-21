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
  .option('-P --port <int>', 'koa worker process bind port', parseInt, 8080)
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

forkWorkers()

var onTerminal = null
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
  
  if (typeof onTerminal == 'function') {
      Promise.resolve().then(() => {
        process.exit(0)
      })
  } else {
    process.exit(0)
  }
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
    cluster.fork()
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

// ready
function forkWorkers () {
  cluster.setupMaster({
    exec: require.resolve('../lib/http.js'),
    execArgv: ['--harmony'],
    args: [requirename],
  })

  // worker process nums
  var procs;
  
  if (program.processes) {
    procs = program.processes;
  } else {
    var cpus = require('os').cpus().length
    procs = Math.ceil(0.75 * cpus)
  }

  for (var i = 0; i < procs; i++) cluster.fork()

}


