import React, { Component } from 'react'
import {
  GridListTile,
  GridListTileBar,
  Paper,
  Typography,
  GridList,
} from '@material-ui/core'
import { withRouter, RouteComponentProps } from 'react-router-dom'
import { MyStreamsType } from '../constants'

interface IProps extends RouteComponentProps {
  streams: MyStreamsType[]
}

class FollowStreams extends Component<IProps, any> {
  constructor(props: IProps) {
    super(props)
    this.openStream = this.openStream.bind(this)
  }

  private openStream(stream: string) {
    this.props.history.push('/' + stream)
  }
  public render() {
    let div
    const games = JSON.parse(window.localStorage.getItem('Games-JSON')!)
    if (this.props.streams.length > 0) {
      div = this.props.streams.map((item, index) => {
        console.log(item)
        return (
          <GridListTile key={index} onClick={() => this.openStream(item.login)}>
            <img
              src={item.thumbnail_url
                .replace('{width}', '300')
                .replace('{height}', '200')}
              alt={item.title}
            />
            <GridListTileBar
              title={item.display_name + ' playing ' + games[item.game_id].name}
              className={'root title'}
            />
          </GridListTile>
        )
      })
    }
    return (
      <div className={'following-streams'}>
        <Paper className={'paper'} elevation={4}>
          <div className="inside">
            {div ? (
              <GridList className={'gridList'} cols={2}>
                {div}
              </GridList>
            ) : (
              <div> No Stream Yet! </div>
            )}
          </div>
        </Paper>
      </div>
    )
  }
}

export default withRouter(FollowStreams)
