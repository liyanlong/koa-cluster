
# Koa Cluster Plus
> fork by koa-plus, support more custom options

<a href="https://communityinviter.com/apps/koa-js/koajs" rel="KoaJs Slack Community">![KoaJs Slack](https://img.shields.io/badge/Koa.Js-Slack%20Channel-Slack.svg?longCache=true&style=for-the-badge)</a>

Lightweight, opinionated clustering for Koa apps.
Use this if you don't want the complexity of other process managers.


## Usage

```bash
koa-cluster-plus app.js
koa-cluster-plus app.js --entry ./master.js
koa-cluster-plus app.js --agent ./agent.js --entry ./master.js
```

## Koa App

You must export your Koa app like:

```js
var app = module.exports = koa();
app.port = 'xxx'; // default: use process.env.PORT
app.host = 'xxx'; // default: use process.env.HOST
```

Make sure you don't create a `http` server yourself.
Don't call `app.listen()`.
This will handle it automatically.

## Koa Agent
master
- one agent
- multips worker

## Koa Master Entry
```js

module.exports = () => {
  // run master.js
 
  return () => {
    return new Promise((resolve) => {
      resolve();
    })
  }
}

```

### Check Continue

This automatically utilizes the `checkContinue` event.
You should handle this wherever appropriate in your Koa app:

```js
app.use(function* () {
  if (this.req.checkContinue) this.res.writeContinue();
  var body = yield parse(this);
})
```

### Settings

Custom settings are checked on the `app` that aren't part of Koa.
You can set them however you'd like.
These settings are:

- `name` - your app's name
- `port`
- `hostname`
- `maxHeadersCount`
- `timeout`

You can also setting options in command-cli


### Examples
```bash
koa-cluster-plus --help/-h
koa-cluster-plus ./app.js  -e entry.js
koa-cluster-plus ./app.js  -e entry.js -P 8000 -H 0.0.0.0
```

## License

The MIT License (MIT)

Copyright (c) 2014 Jonathan Ong me@jongleberry.com
Copyright (c) 2019 liyanlong Ong 295697141@qq.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
