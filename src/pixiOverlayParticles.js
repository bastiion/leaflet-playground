import * as PIXI from 'pixi.js'
import 'pixi-particles'
import L from 'leaflet/dist/leaflet'
import BezierEasing from './bezier-easing'
import './MarkerContainer'
// this is used to simulate leaflet zoom animation timing:
const easing = BezierEasing( 0, 0, 0.25, 1 )

export default ( map, data ) => {
  const loader = new PIXI.loaders.Loader()
  loader.add( 'marker', '/src/marker-icon.png' )


 // const result = await fetch('./sample-data.json');
  //const data = await result.json();

  const markersLength = data.length
  loader.load(( loader, resources ) => {
    const texture = resources.marker.texture


    //map.attributionControl.setPosition( 'bottomleft' )
    //map.zoomControl.setPosition( 'bottomright' )
    const pixiLayer = (() => {
      let zoomChangeTs = null
      const pixiContainer = new PIXI.Container()
      const innerContainer = new PIXI.ParticleContainer( markersLength, {vertices: true} )
      // add properties for our patched particleRenderer:
      innerContainer.texture = texture
      innerContainer.baseTexture = texture.baseTexture
      innerContainer.anchor = {x: 0.5, y: 1}

      pixiContainer.addChild( innerContainer )
      const doubleBuffering = /iPad|iPhone|iPod/.test( navigator.userAgent ) && !window.MSStream
      let initialScale
      return window.L.pixiOverlay(( utils, event ) => {
        const zoom = utils.getMap().getZoom()
        const container = utils.getContainer()
        const renderer = utils.getRenderer()
        const project = utils.latLngToLayerPoint
        const getScale = utils.getScale
        const invScale = 1 / getScale()

        if ( event.type === 'add' ) {
          initialScale = invScale / 8
          innerContainer.localScale = initialScale
          for ( let i = 0; i < markersLength; i++ ) {
            if( !data[i].geoPoint )
              continue
            const { lat, lon } = data[i].geoPoint
            if( !lat || !lon )
              continue
            const coords = project( [lat, lon] )
            // our patched particleContainer accepts simple {x: ..., y: ...} objects as children:
            //innerContainer.cacheAsBitmap = true
            try {
              innerContainer.addChild( {
                x: coords.x,
                y: coords.y
              } )

            } catch ( e ) {
              console.error( e )
            }
          }
        }

        if ( event.type === 'zoomanim' ) {
          const targetZoom = event.zoom
          if ( targetZoom >= 16 || zoom >= 16 ) {
            zoomChangeTs = 0
            const targetScale = targetZoom >= 16 ? 1 / getScale( event.zoom ) : initialScale
            innerContainer.currentScale = innerContainer.localScale
            innerContainer.targetScale = targetScale
          }
          return
        }

        if ( event.type === 'redraw' ) {
          const delta = event.delta
          if ( zoomChangeTs !== null ) {
            const duration = 17
            zoomChangeTs += delta
            let lambda = zoomChangeTs / duration
            if ( lambda > 1 ) {
              lambda = 1
              zoomChangeTs = null
            }
            lambda = easing( lambda )
            innerContainer.localScale = innerContainer.currentScale + lambda * ( innerContainer.targetScale - innerContainer.currentScale )
          } else {
            return
          }
        }

        renderer.render( container )
      }, pixiContainer, {
        doubleBuffering: doubleBuffering,
        destroyInteractionManager: true
      } )
    } )()

    pixiLayer.addTo( map )

    const ticker = new PIXI.ticker.Ticker()
    ticker.add( delta => {
      pixiLayer.redraw( {type: 'redraw', delta: delta} )
    } )
    map.on( 'zoomstart', () => {
      ticker.start()
    } )
    map.on( 'zoomend', () => {
      ticker.stop()
    } )
    map.on( 'zoomanim', pixiLayer.redraw, pixiLayer )
  } )
}
