import React, { Component } from 'react';

import Fade from '@material-ui/core/Fade';
import CircularProgress from '@material-ui/core/CircularProgress';


export default class Viewer3D extends Component {

	componentDidMount() {
		window.LITHO3D.createScene();
	}

	render() {
		return (
			<div id="viewer">
				<div id="loadingScreen">
					<Fade
						in={this.props.loading}
						style={{
							transitionDelay: this.props.loading ? '200ms' : '0ms',
						}}
						unmountOnExit
					>
						<CircularProgress disableShrink={false} size={100} />
					</Fade>
				</div>
			</div>
		);
	}
}
