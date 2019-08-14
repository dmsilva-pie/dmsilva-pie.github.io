import React, { Component } from 'react';

import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import Typography from '@material-ui/core/Typography';
import ListItemIcon from '@material-ui/core/ListItemIcon';

import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';


import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ColorLensIcon from '@material-ui/icons/ColorLens';
import SettingsIcon from '@material-ui/icons/Settings';
import BuildIcon from '@material-ui/icons/Build';
import InfoIcon from '@material-ui/icons/Info';
import ViewIcon from '@material-ui/icons/RemoveRedEye';

import { TwitterPicker } from 'react-color';

import SurfaceList from './SurfaceList';

const styles = {
  root: {
    width: '100%',
	height: '100%',
	overflow: 'hidden'
  },
  subroot: {
	width: '100%',
    height: '100%',
	overflow: 'auto',
	paddingright: '20px'
  },
  heading: {
    fontSize: 15,
    fontWeight: 300,
  },
};

export default class OptionMenu extends Component {
	
	
	constructor(props) {
		super(props);
        this.state = {
			model_props: {
				"model_id": undefined,
				"face_number": 0,
				"faces": []
			},
			model_settings: {
				"imageMappings": [],
				"scaleValues": [],
				"resolutionValues": []
			},
			color: '#FCB900',
			wireframeView: false,
			textureView: false,
			expandedMenu: null,
			viewDisplay: "color"
		};
		
		this.handleMenuChange = this.handleMenuChange.bind(this);
		this.handleViewCheck = this.handleViewCheck.bind(this);
		this.handleUpdatedSurface = this.handleUpdatedSurface.bind(this);
		
    }
	
	
	componentDidMount(){
		this.props.loadingFunction();
		window.loadModel()
			.then(props => {
				this.setState({model_props: props.info, model_settings: props.settings});
				this.props.loadingFunction();
			});
	}
	
	handleViewCheck(event) {
		this.props.loadingFunction();
		this.setState({viewDisplay: event.target.value, wireframeView: event.target.value === "wireframe",  textureView: event.target.value === "texture"}, () => {
			window.updateModel(this.state.model_settings, this.state.color, this.state.wireframeView, this.state.textureView)
			.then(result =>{
				this.props.loadingFunction();
				});
		});
	};
	
	handleMenuChange = panel => (event, isExpanded) => {
		this.setState({expandedMenu : isExpanded ? panel : false});
    };
	
	handleColorChange = (color, event) => {
		this.props.loadingFunction();
		this.setState( { color: color.hex }, () => {
			window.updateModel(this.state.model_settings, this.state.color, this.state.wireframeView, this.state.textureView)
			.then(result =>{
				this.props.loadingFunction();
				});
		});
	};

	handleUpdatedSurface(index, img_url, img_file, scale, resolution, enabled){
		this.props.loadingFunction();
		var model_param = {
                        modelSelected: this.state.model_props.model_id,
						numberFaces: this.state.model_props.face_number, 
                        imageMappings: this.state.model_settings.imageMappings.map(item => item.index === index ? {"index": item.index, "img": img_url, "enabled": enabled} : item),
                        scaleValues: this.state.model_settings.scaleValues,
                        resolutionValues: this.state.model_settings.resolutionValues,
                        textureBounds: [1, 0, 1, 0],
                        isUpdate: false,
                        wireframeView: this.state.wireframeView,
                        textureView: this.state.textureView,
                        color: this.state.color
                    };
					
		model_param.resolutionValues[index]=resolution;
		model_param.scaleValues[index]=scale;
		
		this.setState({model_settings: model_param}, ()=> {
			window.updateModel(this.state.model_settings, this.state.color, this.state.wireframeView, this.state.textureView)
			.then(result =>{
				this.props.loadingFunction();
				});
			});
		
		
	}
	
	render() {
	  return (
		<div style={styles.root}>
		<div style={styles.subroot} className='hide-scrollbar'>
		
		
		<ExpansionPanel disabled color="LightGrey">
			<ExpansionPanelSummary
			  expandIcon={<InfoIcon />}
			  aria-controls="panel3a-content"
			  id="panel3a-header"
			>
			  <Typography>Customize your model</Typography>
			</ExpansionPanelSummary>
		  </ExpansionPanel>
		
		
		  <ExpansionPanel expanded={this.state.expandedMenu === 'color'} onChange={this.handleMenuChange('color')}>
			<ExpansionPanelSummary
			  expandIcon={<ExpandMoreIcon />}
			  aria-controls="panel1a-content"
			  id="panel1a-header"
			>
			  <ListItemIcon><ColorLensIcon/></ListItemIcon><Typography>Color</Typography>
			</ExpansionPanelSummary>
			<ExpansionPanelDetails>
				
				 <TwitterPicker
					 width="100%"
                     color={this.state.color}
                     onChangeComplete={this.handleColorChange}
                  />
			</ExpansionPanelDetails>
		  </ExpansionPanel>
		  
		  
		  
		  <ExpansionPanel expanded={this.state.expandedMenu === 'surfaces'} onChange={this.handleMenuChange('surfaces')}>
			<ExpansionPanelSummary
			  expandIcon={<ExpandMoreIcon />}
			  aria-controls="panel2a-content"
			  id="panel2a-header"
			>
			  <ListItemIcon><BuildIcon/></ListItemIcon><Typography>Edit Surfaces</Typography>
			</ExpansionPanelSummary>
			<ExpansionPanelDetails>
			  <SurfaceList updateFunction={this.handleUpdatedSurface} model_props={this.state.model_props}/>
			</ExpansionPanelDetails>
		  </ExpansionPanel>
		  
		  <ExpansionPanel expanded={this.state.expandedMenu === 'options'} onChange={this.handleMenuChange('options')}>
			<ExpansionPanelSummary
			  expandIcon={<ExpandMoreIcon />}
			  aria-controls="panel2a-content"
			  id="panel2a-header"
			>
			  <ListItemIcon><SettingsIcon/></ListItemIcon><Typography>Settings</Typography>
			</ExpansionPanelSummary>
			<ExpansionPanelDetails>
				<FormControl component="fieldset">
					<FormLabel component="legend"><ListItemIcon><ViewIcon/></ListItemIcon><Typography>Viewer Display</Typography></FormLabel>
					<RadioGroup
					  aria-label="display"
					  name="display1"
					  value={this.state.viewDisplay}
					  onChange={this.handleViewCheck}
					>
					  <FormControlLabel value="color" control={<Radio />} label="Color/Material" />
					  <FormControlLabel value="texture" control={<Radio />} label="Texture Mapping" />
					  <FormControlLabel value="wireframe" control={<Radio />} label="Wireframe View" />
					</RadioGroup>
			  </FormControl>
			</ExpansionPanelDetails>
		  </ExpansionPanel>
		  
		  <ExpansionPanel disabled color="LightGrey">
			<ExpansionPanelSummary
			  aria-controls="panel3a-content"
			  id="panel3a-header"
			>
			  <Typography> </Typography>
			</ExpansionPanelSummary>
		  </ExpansionPanel>
		  
		  
		 </div> 
		</div>
	  );
	}
}
