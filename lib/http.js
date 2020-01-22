
var start = Date.now()

var http = require('http')
var cluster = require('cluster')

var args = process.argv
var app = require(args[args.length - 1])
var callback = app.callback()

var server = http.createServer()
server.on('request', callback)
server.on('checkContinue', function (req, res) {
  req.checkContinue = true
  callback(req, res)
})

// custom koa settings
// defaults to http://nodejs.org/api/http.html#http_server_maxheaderscount
server.maxHeadersCount = app.maxHeadersCount || 1000
server.timeout = app.timeout || 120000
var port = app.port || process.env.PORT
var hostname = app.hostname || process.env.HOST

server.listen(port, hostname, function (err) {
  if (err) throw err
  console.log('%s listening on port %s, started in %sms  pid %s',
    app.name || 'koa app',
    this.address().port,
    Date.now() - start,
    process.pid
  )
})

// don't try to close the server multiple times
var closing = false

// kill -9
process.on('SIGTERM', function () {
  close(0)
})

// CTRL + C
process.on('SIGINT', function () {
  close(0)
})
process.on('uncaughtException', function (err) {
  // console.error(err.stack)
  close(1)
})
process.on('exit', function () {
  console.log('exiting app worker %s', cluster.worker.id)
})

function close(code) {
  if (closing) return
  console.log('closing app worker %s', cluster.worker.id)
  closing = true

  // 30s 的时间结束
  // to do: make this an option
  var killtimer = setTimeout(function () {
    process.exit(code)
  }, 30000)

  // http://nodejs.org/api/timers.html#timers_unref
  killtimer.unref()

  // 关闭所有的请求
  server.close()
  cluster.worker.disconnect()
}