import React, { Component } from 'react';
import '../css/App.css';

import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';

import Viewer3D from './Viewer3D';
import OptionMenu from './OptionMenu';


export default class App extends Component {
	
	constructor(props) {
		super(props);
        this.state = {
			loading: false
		};
		this.toggleLoading = this.toggleLoading.bind(this);
    }
	
	toggleLoading(){
		var isLoading = this.state.loading;
		this.setState({loading: !isLoading});
	}
	
	componentDidMount(){
		//this.selectForm("Cube");
	}
	
	render() {
	  return (
		<div>
		  <Grid container >
			<Grid item sm={12} md={8}>
				<Box height={600} width="100%"> 
					<Viewer3D loading={this.state.loading}/>
				</Box>
			</Grid>
			<Grid item sm={12} md={4}>
				<Box height={600} width="100%"> 
					<OptionMenu loadingFunction={this.toggleLoading}/>
				</Box>
			</Grid>
		  </Grid>
		</div>
	  );
	}
    
}
