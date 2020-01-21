var Koa = new require('koa');
var cluster = require('cluster');
const app = new Koa();

app.use(async (ctx, next) => {
  ctx.body = 'hello world. worker ' + cluster.worker.id;
});
app.isAgent = true;
app.port = 8889;
app.hostname = '127.0.0.1';

module.exports = app;