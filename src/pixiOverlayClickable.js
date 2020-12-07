import * as PIXI from 'pixi.js'
import L from 'leaflet/dist/leaflet'

let frame = null
let firstDraw = true
let prevZoom

export default ( map, data ) => {

  const markerTexture = PIXI.Texture.from( '/src/marker-icon.png' )
  const allMarkers = []
  for ( let i = 0; i < data.length; i++ ) {
    if( data[i] && data[i].geoPoint ) {
      const m = new PIXI.Sprite( markerTexture )
      m.popup = L.popup( {className: 'pixi-popup'} )
        .setLatLng( [data[i].geoPoint.lat, data[i].geoPoint.lon] )
        .setContent( `<pre>${JSON.stringify( data[i].data, null, 2 )}</pre>` )
      allMarkers.push( m )
    }
  }


  const markerLatLng = [51.0883, 13.7312]
  const marker = new PIXI.Sprite( markerTexture )
  marker.popup = L.popup( {className: 'pixi-popup'} )
    .setLatLng( markerLatLng )
    .setContent( '<b>Hello world!</b><br>I am a popup.' )

  const polygonLatLngs = [
    [51.509, 13.08],
    [51.503, 13.06],
    [51.51, 13.047],
    [51.509, 13.08]
  ]
  let projectedPolygon

  const circleCenter = [51.508, -0.11]
  let projectedCenter
  let circleRadius = 85

  const triangle = new PIXI.Graphics()
  triangle.popup = L.popup()
    .setLatLng( [51.5095, -0.063] )
    .setContent( 'I am a polygon.' )
  const circle = new PIXI.Graphics()
  circle.popup = L.popup()
    .setLatLng( circleCenter )
    .setContent( 'I am a circle.' );

  [...allMarkers, marker, triangle, circle].forEach( geo => {
    geo.interactive = true
  } )

  const pixiContainer = new PIXI.Container()
  pixiContainer.addChild( marker, triangle, circle )
  allMarkers.forEach( m => pixiContainer.addChild( m ))
  pixiContainer.interactive = true
  pixiContainer.buttonMode = true

  const doubleBuffering = /iPad|iPhone|iPod/.test( navigator.userAgent ) && !window.MSStream

  return window.L.pixiOverlay( utils => {
    if ( frame ) {
      cancelAnimationFrame( frame )
      frame = null
    }
    const zoom = utils.getMap().getZoom()
    const container = utils.getContainer()
    const renderer = utils.getRenderer()
    const project = utils.latLngToLayerPoint
    const scale = utils.getScale()

    const dataLocs = data.filter( dp => !!dp.geoPoint ).map(( {geoPoint: {lat, lon}} ) => {
      return project( [lat, lon] )
    } )
    if ( firstDraw ) {
      utils.getMap().on( 'click', e => {
        // not really nice but much better than before
        // good starting point for improvements
        const interaction = renderer.plugins.interaction
        const pointerEvent = e.originalEvent
        const pixiPoint = new PIXI.Point()
        // get global click position in pixiPoint:
        interaction.mapPositionToPoint( pixiPoint, pointerEvent.clientX, pointerEvent.clientY )
        // get what is below the click if any:
        const target = interaction.hitTest( pixiPoint, container )
        if ( target && target.popup ) {
          target.popup.openOn( map )
        }
      } )
      const markerCoords = project( markerLatLng )
      marker.x = markerCoords.x
      marker.y = markerCoords.y
      marker.anchor.set( 0.5, 1 )
      marker.scale.set( 1 / scale )
      marker.currentScale = 1 / scale
      console.log( marker.x, marker.y )

      allMarkers.forEach(( m, i ) => {
        m.x = dataLocs[i].x
        m.y = dataLocs[i].y
        m.anchor.set( 0.5, 1 )
        m.scale.set( 1 / scale )
        m.currentScale = 1 / scale
        //console.log(m.x, m.y)
      } )

      projectedPolygon = polygonLatLngs.map( function ( coords ) {
        return project( coords )
      } )

      projectedCenter = project( circleCenter )
      circleRadius = circleRadius / scale
    }
    if ( firstDraw || prevZoom !== zoom ) {
      marker.currentScale = marker.scale.x
      marker.targetScale = 1 / scale

      allMarkers.forEach(( m ) => {
        m.currentScale = m.scale.x
        m.targetScale = 1 / scale
      } )

      triangle.clear()
      triangle.lineStyle( 3 / scale, 0x3388ff, 1 )
      triangle.beginFill( 0x3388ff, 0.2 )
      triangle.x = projectedPolygon[0].x
      triangle.y = projectedPolygon[0].y
      projectedPolygon.forEach( function ( coords, index ) {
        if ( index == 0 ) triangle.moveTo( 0, 0 )
        else triangle.lineTo( coords.x - triangle.x, coords.y - triangle.y )
      } )
      triangle.endFill()

      circle.clear()
      circle.lineStyle( 3 / scale, 0xff0000, 1 )
      circle.beginFill( 0xff0033, 0.5 )
      circle.x = projectedCenter.x
      circle.y = projectedCenter.y
      circle.drawCircle( 0, 0, circleRadius )
      circle.endFill()
    }

    const duration = 100
    let start

    const animate = timestamp => {
      let progress
      if ( start === null ) start = timestamp
      progress = timestamp - start
      let lambda = progress / duration
      if ( lambda > 1 ) lambda = 1
      lambda = lambda * ( 0.4 + lambda * ( 2.2 + lambda * -1.6 ))
      marker.scale.set( marker.currentScale + lambda * ( marker.targetScale - marker.currentScale ))
      allMarkers.forEach( m =>
        m.scale.set( m.currentScale + lambda * ( m.targetScale - m.currentScale ))
      )
      renderer.render( container )
      if ( progress < duration ) {
        frame = requestAnimationFrame( animate )
      }
    }

    if ( !firstDraw && prevZoom !== zoom ) {
      start = null
      frame = requestAnimationFrame( animate )
    }

    firstDraw = false
    prevZoom = zoom
    renderer.render( container )
  }, pixiContainer, {
    doubleBuffering: doubleBuffering,
    autoPreventDefault: false
  } )

}

