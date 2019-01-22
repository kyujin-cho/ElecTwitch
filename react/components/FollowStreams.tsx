import React, { Component } from 'react'
import {
  GridListTile,
  GridListTileBar,
  Paper,
  Typography,
  GridList,
} from '@material-ui/core'

interface IProps {
  streams: any[]
  openStream: (userInfo: any, isClicked: boolean) => Promise<void>
}

class FollowStreams extends Component<IProps, any> {
  public render() {
    let div
    const games = JSON.parse(window.localStorage.getItem('Games-JSON')!)
    if (this.props.streams.length > 0) {
      div = this.props.streams.map((item, index) => {
        return (
          <GridListTile
            key={item.img}
            onClick={() => this.props.openStream(item.user_id, false)}
          >
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
            <Typography component="h2">Follows</Typography>
            <GridList className={'gridList'} cols={2.5}>
              {div}
            </GridList>
          </div>
        </Paper>
      </div>
    )
  }
}

export default FollowStreams
