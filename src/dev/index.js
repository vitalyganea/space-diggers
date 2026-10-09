/* The dev level: a link to every system's sandbox. */
export function start(paths) {
  const names = paths.map(p => p.match(/dev\/(.+)\.js$/)[1]).filter(n => n !== 'index')
  document.body.innerHTML = '<div style="font:20px sans-serif;padding:20px"><h1>Space Diggers: dev level</h1>' +
    names.map(n => `<p><a href="?dev=${n}">${n}</a></p>`).join('') + '</div>'
}
