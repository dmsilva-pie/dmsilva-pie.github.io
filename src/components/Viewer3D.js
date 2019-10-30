import React, { Component } from 'react';
//import '../css/App.css';

//import Paper from '@material-ui/core/Paper';
//import Grid from '@material-ui/core/Grid';

//import 3DViewer from './3DViewer';
//import OptionMenu from './OptionMenu';

import Fade from '@material-ui/core/Fade';
import CircularProgress from '@material-ui/core/CircularProgress';

export default class Viewer3D extends Component {

	constructor(props) {
		super(props);
		this.state = {
			loading: false
		};
	}

	componentDidMount() {
		window.createScene();
	}

	render() {
		return (
			<div id="viewer">
				<div id="loadingScreen">
					<Fade
						in={this.props.loading}
						style={{
							transitionDelay: this.state.loading ? '800ms' : '0ms',
						}}
						unmountOnExit
					>
						<CircularProgress disableShrink size={100} />
					</Fade>
				</div>
			</div>
		);
	}
}
