/* cdp.js (from brainrot-merge, with keys added): a headless Chrome page driven over the DevTools protocol, with
   real mouse or touch input. Shared by browse.js and playtest.js.
   No dependencies: node's own WebSocket. */
var http = require('http'), fs = require('fs'), path = require('path');
var cp = require('child_process'), os = require('os');

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function getJSON(url) {
  return new Promise(function (res, rej) {
    http.get(url, function (r) {
      var b = ''; r.on('data', function (c) { b += c; });
      r.on('end', function () { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}

function CDP(url) {
  var ws = new WebSocket(url), id = 0, waits = {}, listeners = [];
  var ready = new Promise(function (r) { ws.onopen = r; });
  ws.onmessage = function (e) {
    var m = JSON.parse(e.data);
    if (m.id && waits[m.id]) { waits[m.id](m); delete waits[m.id]; }
    else if (m.method) listeners.forEach(function (f) { f(m); });
  };
  return {
    ready: ready,
    on: function (f) { listeners.push(f); },
    close: function () { ws.close(); },
    send: function (method, params, sessionId) {
      var n = ++id;
      return new Promise(function (res, rej) {
        waits[n] = function (m) { m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result); };
        ws.send(JSON.stringify({ id: n, method: method, params: params || {}, sessionId: sessionId }));
      });
    }
  };
}

/* opts: { w, h, mobile, port }. Returns a page; one Chrome profile for its
   whole life, so reloads keep IndexedDB (the game's user:// save). */
async function launch(opts) {
  var port = opts.port || 9341;
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-profile-'));
  var chrome = cp.spawn(process.env.CHROME || 'google-chrome', [
    '--headless=new', '--hide-scrollbars', '--mute-audio',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'
  ], { stdio: 'ignore' });
  var wsUrl;
  for (var i = 0; i < 80 && !wsUrl; i++) {
    try { wsUrl = (await getJSON('http://127.0.0.1:' + port + '/json/version')).webSocketDebuggerUrl; }
    catch (e) { await sleep(250); }
  }
  var cdp = CDP(wsUrl); await cdp.ready;
  var t = await cdp.send('Target.createTarget', { url: 'about:blank' });
  var sid = (await cdp.send('Target.attachToTarget', { targetId: t.targetId, flatten: true })).sessionId;

  var page = { errors: [], prints: [], mobile: !!opts.mobile };
  cdp.on(function (m) {
    if (m.sessionId !== sid) return;
    if (m.method === 'Runtime.exceptionThrown')
      page.errors.push('exception: ' + ((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled') {
      var text = m.params.args.map(function (a) { return a.value !== undefined ? a.value : a.description; }).join(' ');
      if (m.params.type === 'error' || /SCRIPT ERROR|ERROR:/.test(text)) page.errors.push(text);
      else page.prints.push(text);
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error')
      page.errors.push('log: ' + m.params.entry.text);
  });
  await cdp.send('Runtime.enable', {}, sid);
  await cdp.send('Log.enable', {}, sid);
  await cdp.send('Page.enable', {}, sid);

  page.size = async function (w, h) {
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: w, height: h, deviceScaleFactor: page.mobile ? 2 : 1, mobile: page.mobile }, sid);
  };
  await page.size(opts.w || 1280, opts.h || 800);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: page.mobile, maxTouchPoints: page.mobile ? 2 : 1 }, sid);

  page.navigate = function (url) { return cdp.send('Page.navigate', { url: url }, sid); };
  page.reload = function () { return cdp.send('Page.reload', {}, sid); };
  page.pointer = async function (kind, x, y) {
    if (page.mobile) {
      var type = { down: 'touchStart', move: 'touchMove', up: 'touchEnd' }[kind];
      await cdp.send('Input.dispatchTouchEvent',
        { type: type, touchPoints: kind === 'up' ? [] : [{ x: x, y: y }] }, sid);
    } else {
      var mtype = { down: 'mousePressed', move: 'mouseMoved', up: 'mouseReleased' }[kind];
      await cdp.send('Input.dispatchMouseEvent',
        { type: mtype, x: x, y: y, button: 'left', buttons: kind === 'up' ? 0 : 1, clickCount: 1 }, sid);
    }
  };
  page.tap = async function (x, y) {
    await page.pointer('down', x, y); await sleep(60); await page.pointer('up', x, y); await sleep(100);
  };
  page.drag = async function (x0, y0, x1, y1) {
    var n = 12;
    await page.pointer('down', x0, y0); await sleep(50);
    for (var k = 1; k <= n; k++) {
      await page.pointer('move', x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n);
      await sleep(16);
    }
    await page.pointer('up', x1, y1); await sleep(100);
  };
  /* A key held for `ms`, as the browser itself would send it. `code` is
     the physical key (KeyW, Space, Digit1...). */
  var KEYS = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', Space: ' ', KeyE: 'e', KeyQ: 'q', KeyB: 'b', KeyP: 'p',
               Digit1: '1', Digit2: '2', Digit3: '3', Escape: 'Escape', ShiftLeft: 'Shift' };
  var VK = { KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, Space: 32, KeyE: 69, KeyQ: 81, KeyB: 66, KeyP: 80,
             Digit1: 49, Digit2: 50, Digit3: 51, Escape: 27, ShiftLeft: 16 };
  page.keyDown = function (code) {
    return cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', code: code, key: KEYS[code] || code,
      windowsVirtualKeyCode: VK[code] || 0 }, sid);
  };
  page.keyUp = function (code) {
    return cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', code: code, key: KEYS[code] || code,
      windowsVirtualKeyCode: VK[code] || 0 }, sid);
  };
  page.hold = async function (code, ms) { await page.keyDown(code); await sleep(ms); await page.keyUp(code); };
  page.mouseHold = async function (x, y, ms, button) {
    button = button || 'left';
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x, y: y, button: button, buttons: button === 'left' ? 1 : 2, clickCount: 1 }, sid);
    await sleep(ms);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x, y: y, button: button, buttons: 0, clickCount: 1 }, sid);
  };
  page.shot = async function (file) {
    var r = await cdp.send('Page.captureScreenshot', { format: 'png' }, sid);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    return file;
  };
  page.eval = async function (expr) {
    var v = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid);
    return v.result && v.result.value;
  };
  page.close = async function () {
    cdp.close();
    await new Promise(function (r) { chrome.on('exit', r); chrome.kill(); });
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  };
  return page;
}

module.exports = { launch: launch, sleep: sleep };
