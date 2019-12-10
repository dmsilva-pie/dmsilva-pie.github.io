import React, { Component } from 'react';
import '../css/App.css';

import Box from '@material-ui/core/Box';

import Viewer3D from './Viewer3D';
import ToolbarMenu from './ToolbarMenu';


export default class App extends Component {

	constructor(props) {
		super(props);
		this.state = {
			loading: false
		};
		this.toggleLoading = this.toggleLoading.bind(this);
	}

	toggleLoading(state) {
		this.setState({ loading: state });
	}

	render() {
		return (
			<div style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden" }}>
				<Box display="flex" height="100%" width="100%">
					<Box id="viewer-container" height="100%">
						<Viewer3D loading={this.state.loading} />
					</Box>
					<Box height="100%" width="60px" id="drawer-container" position="relative">
						<ToolbarMenu loadingFunction={this.toggleLoading}>
						</ToolbarMenu>
					</Box>
				</Box>
			</div>
		);
	}

}