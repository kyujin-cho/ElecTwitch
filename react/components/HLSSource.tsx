import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Hls from 'hls.js'

const propTypes = {
  src: PropTypes.string.isRequired,
  type: PropTypes.string,
  video: PropTypes.object,
}

type PropType = {
  src: string
  type?: string
  video?: any
}

type StateType = {
  hls: Hls
}

export default class HLSSource extends Component<PropType, StateType> {
  public static propTypes: any
  constructor(props: PropType, context: any) {
    super(props, context)
    this.state = {
      hls: new Hls(),
    }
  }

  public componentDidMount() {
    // `src` is the property get from this component
    // `video` is the property insert from `Video` component
    // `video` is the html5 video element
    const { src, video } = this.props
    // load hls video source base on hls.js
    if (Hls.isSupported()) {
      this.state.hls.loadSource(src)
      this.state.hls.attachMedia(video)
      this.state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play()
      })
    }
  }

  public render() {
    return (
      <source
        src={this.props.src}
        type={this.props.type || 'application/x-mpegURL'}
      />
    )
  }
}

HLSSource.propTypes = propTypes
