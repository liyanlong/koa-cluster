var Koa = new require('koa');
var app = new Koa();
var cluster = require('cluster');



process.on('message', (data) => {
  // process.send({
  //   message: 'work process ok',
  //   isWorker: cluster.isWorker
  // });
})

app.use(async (ctx, next) => {
  ctx.body = 'hello world. worker ' + cluster.worker.id;
});

app.port = 8888
app.hostname = '0.0.0.0'

module.exports = app;