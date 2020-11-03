import _ from 'lodash'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet/dist/leaflet'

function leafletMap() {
  const element = document.createElement('div');
  L.map(element).setView([51.505, -0.09], 13)
  return element;
}

document.body.appendChild(leafletMap());

