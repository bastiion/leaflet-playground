import 'leaflet/dist/leaflet.css'
import L from 'leaflet/dist/leaflet'
import 'leaflet-pixi-overlay/L.PixiOverlay'
import pixiOverlayClickable from './pixiOverlayClickable'
import pixiOverlayParticles from './pixiOverlayParticles'
import elasticsearch from 'elasticsearch'


const stamenlayer = L.tileLayer('//stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png', {
  subdomains: 'abcd',
  attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
  minZoom: 2,
  maxZoom: 18
})

const centers = {leipzig: [51.3607695, 12.4013588], dresden: [51.0833, 13.73126], london: [51.505, -0.09]}
const map = L.map(document.getElementById('map'), {
  center: centers.leipzig,
  zoom: 13,
})
stamenlayer.addTo(map)


document.getElementById("loginBtn").onclick = async (e) => {
  e.preventDefault();
  const pw = document.getElementById('password').value
  const user = document.getElementById('username').value
  const host = document.getElementById('server').value


  console.log(user);
  const client = new elasticsearch.Client({
    host: host/*'elastic.de4l.timmi.gra.one'*/, log: 'error', auth: `${user}:${pw}`
  })

  async function getData(cb) {
    const {hits} = await client.search({
      index: 'de4l-timmi-index',
      size: 500000,
      body: {
        query: {
          match_all: {}
        }
      }
    })
    return cb(hits)
  }

  const overlay = await getData(d => {
    const data = d.hits.map(({_source}) => _source.data)
    //const clickableOverlay = pixiOverlayClickable(map, data)
    //clickableOverlay.addTo(map)
    pixiOverlayParticles(map, data)

  })
}


