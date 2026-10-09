/* The planets (row 55). The Moon, where you start, and the ones the
   rocket flies to (more come as updates). Each keeps its own world in the
   save; coins, gear, your robot and the Museum go with you.

     price    coins to open it at the Launch Pad, once; then flights are free
     gravity  noa's pull (the Moon's -10 is noa's usual)
     slip     how much less grip the ground gives (0 none)
     music    the themes up top and deep down (src/music.js)
     sky      how its sky looks (src/sky.js): the ringed planet's size and
              height, the nebula's tint, the fog
     layers   for the depth meter: [name, from y, to y, colour] */
export const PLANETS = {
  moon: {
    name: 'The Moon', price: 0, gravity: -10, slip: 0, music: ['surface', 'deep'], icon: '🌕',
    blurb: 'Grey dust, craters, meteorites. Where it all began.',
    sky: { planetSize: 200, planetElev: 0, nebula: null, fog: [0.03, 0.04, 0.09], earth: true },
    layers: [['Dust', 0, -4, '#8b8780'], ['Moon rock', -4, -35, '#76777e'], ['Dark rock', -35, -65, '#454c62'], ['Ice caves', -65, -85, '#7fbde4'], ['Crystal', -85, -99, '#7c5ce6'], ['Core', -99, -102, '#fbbf24']],
  },
  ice: {
    name: 'The Ice Moon', price: 500, gravity: -6.5, slip: 0.6, music: ['ice', 'icedeep'], icon: '🧊',
    blurb: 'Snow, crevasses and spikes of ice. Jump high! Cold silver and frost gems.',
    sky: { planetSize: 330, planetElev: 0.25, nebula: '#38bdf8', fog: [0.05, 0.08, 0.14], earth: false },
    layers: [['Snow', 0, -3, '#e8f1f8'], ['Clear ice', -3, -20, '#9fd3f0'], ['Blue ice', -20, -50, '#6fa8dc'], ['Dark rock', -50, -85, '#454c62'], ['Crystal', -85, -99, '#7c5ce6'], ['Core', -99, -102, '#fbbf24']],
  },
}
export const PLANET_KEYS = Object.keys(PLANETS)
