import React, { Component } from 'react';
import Files from 'react-files';

import ListItem from '@material-ui/core/ListItem';

import Tooltip from '@material-ui/core/Tooltip';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';

import Button from '@material-ui/core/Button';
import ButtonBase from '@material-ui/core/ButtonBase';
import Menu from '@material-ui/core/Menu';
import IconButton from '@material-ui/core/IconButton';
import Checkbox from '@material-ui/core/CheckBox';
import Divider from '@material-ui/core/Divider';
import Slider from '@material-ui/core/Slider';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import DeleteIcon from '@material-ui/icons/Delete';
import AddCircleIcon from '@material-ui/icons/AddCircle';



export default class SurfaceListItem extends Component {
	
	constructor(props) {
		super(props);
		
		this.DEFAULT_RES = this.props.isMobile ? 5 : 7;
		this.DEFAULT_SCALE = 200;
		
        this.state = {
			anchorEl: undefined,
			dialogOpen: false,
			loading: false,
			img_url: `../img/${this.props.item+1}.png`,
			img_file: null,
			enabled: false,
			usable: false,
			scale: this.DEFAULT_SCALE ,
			resolution: this.DEFAULT_RES,
		};
		
		this.handleOpenMenu = this.handleOpenMenu.bind(this);
		this.handleCloseMenu = this.handleCloseMenu.bind(this);
		this.handleOpenDialog = this.handleOpenDialog.bind(this);
		this.handleCloseDialog = this.handleCloseDialog.bind(this);
		this.handleCheck = this.handleCheck.bind(this);
		this.onImageAdd = this.onImageAdd.bind(this);
		this.onImageAddError = this.onImageAddError.bind(this);
		this.onImageRemove = this.onImageRemove.bind(this);
		this.handleScaleSliderChange = this.handleScaleSliderChange.bind(this);
		this.handleResSliderChange = this.handleResSliderChange.bind(this);
    }
	
	 handleOpenMenu(event) {
		this.setState({anchorEl : event.currentTarget});
	  }

	  handleCloseMenu() {
		this.setState({anchorEl: null});
	  }
	  
	  handleOpenDialog() {
		this.setState({dialogOpen:true});
	  }

	  handleCloseDialog() {
		this.setState({dialogOpen:false});
	  }
	  
	  handleCheck(event) {
		var checked = this.state.usable;
		this.setState({usable: !checked }, ()=>{
		console.log("check!");
		
		//Send state upwards.
		this.props.updateFunction(this.props.item, this.state.img_url, this.state.img_file, this.state.scale, this.state.resolution, this.state.usable);
				
		});
	  };
	  
	  onImageAdd(file){
		  if(file.length !== 0){
			this.setState({img_url: file[0].preview.url, img_file: file[0], enabled: true, usable: true}, ()=>{
				
			this.refs.files.setState({files: []});
			
			//Send state upwards.
			this.props.updateFunction(this.props.item, this.state.img_url, this.state.img_file, this.state.scale, this.state.resolution, this.state.usable);
			});
		  }
	  }
	  
	  onImageAddError(error){
		  console.log(error);
	  }
	  
	  onImageRemove(){
		  this.setState({img_url: `../img/${this.props.item+1}.png`, img_file: null, enabled: false, usable: false, 
						 scale: this.DEFAULT_SCALE, resolution: this.DEFAULT_RES}, ()=>{
			this.refs.files.setState({files: []});
			
			//Send state upwards.
			this.props.updateFunction(this.props.item, this.state.img_url, this.state.img_file, this.state.scale, this.state.resolution, this.state.usable);
			});
	  }
	  
	  handleScaleSliderChange(event, newValue){
		  this.setState({scale: newValue}, ()=>{
			
			//Send state upwards.
			this.props.updateFunction(this.props.item, this.state.img_url, this.state.img_file, this.state.scale, this.state.resolution, this.state.usable);
				
			});
	  }
	  
	  handleResSliderChange(event, newValue){
		  this.setState({resolution: newValue}, ()=>{
			
			//Send state upwards.
			this.props.updateFunction(this.props.item, this.state.img_url, this.state.img_file, this.state.scale, this.state.resolution, this.state.usable);
				
			});
	  }
	
	render() {
	  return (
		<div>
		<ListItem key={`item-${this.props.item}`}>
		
			<Box width="100%" height={80} display="flex">
				
				<Files
                            className='files-dropzone'
                            ref='files'
                            onChange={this.onImageAdd}
                            onError={this.onImageAddError}
                            accepts={['image/*']}
                            maxFiles={1}
                            maxFileSize={10000000}
                            minFileSize={0}
                            clickable
                        >
					<Box width={80} height={80}  alignSelf="flex-start">
							
							<ButtonBase
							  focusRipple
							  key={this.props.item+1}
							  style={{
								width: "100%",
								height: "100%",
								backgroundImage: `url(${this.state.img_url})`,
								backgroundSize: 'cover',
							  }}
							>
							  <span className="showonfocus">
								  <Tooltip title={this.state.enabled ? "Change Image" : "Add Image"} enterDelay={100}>
									  <AddCircleIcon 
										style={{
											color:"white",
											opacity: 0.6,
											width: "50%",
											height: "50%"
										  }}
									  />
								</Tooltip>
							  </span>
							</ButtonBase>
					</Box>
				</Files>
				
				
				<Box height={80} flexDirection='column' flexGrow={1} alignSelf="center">
				
						<Box height={40} pl={3} display="flex" flexGrow={1}  alignItems="center">
							<Typography> 
								{this.props.title}
							</Typography>
						</Box>
						
						<Divider />
						
						<Box height={40} pl={1} display="flex" flexGrow={1}  alignItems="center">
						
							{this.state.enabled ? 
								<Tooltip title="Clear" enterDelay={100}>
									<IconButton aria-label="delete" onClick={this.handleOpenDialog}><DeleteIcon /></IconButton>
								</Tooltip> :
								<IconButton disabled={!this.state.enabled} aria-label="delete" onClick={this.handleOpenDialog}><DeleteIcon /></IconButton>
							}
							
							<IconButton disabled={!this.state.enabled} aria-controls={"simple-menu"+this.props.item} aria-haspopup="true" onClick={this.handleOpenMenu}>
								<ExpandMoreIcon />
							</IconButton >
							<Menu
									id={"simple-menu"+this.props.item} 
									anchorEl={this.state.anchorEl}
									keepMounted
									open={Boolean(this.state.anchorEl)}
									onClose={this.handleCloseMenu}
							>
							  <Box px={2} py={1} display="flex"  flexDirection='column' flexGrow={1}  alignItems="center">
								<Typography>Extrude Scale</Typography>
								<Slider
									onChangeCommitted={this.handleScaleSliderChange}
									defaultValue={this.state.scale}
									aria-labelledby="discrete-slider"
									valueLabelDisplay="auto"
									step={1}
									marks
									min={this.props.model_props.faces[this.props.item].min_extrude}
									max={this.props.model_props.faces[this.props.item].max_extrude}
								  />
								<Typography>Resolution</Typography>
								<Slider
									onChangeCommitted={this.handleResSliderChange}
									defaultValue={this.state.resolution}
									aria-labelledby="discrete-slider"
									valueLabelDisplay="auto"
									step={1}
									marks
									min={this.props.model_props.faces[this.props.item].min_res}
									max={this.props.model_props.faces[this.props.item].max_res}
								  />
								</Box>
								
							  </Menu>
						</Box>
				</Box>
				
				<Box width={40} height={80} display="flex" alignItems="center" alignSelf="flex-end">
						<Checkbox 
							disabled={!this.state.enabled}
							checked={this.state.usable}
							onChange={this.handleCheck}
						/>	
				</Box>
				
			</Box>
			
        </ListItem>
		<Dialog
			open={this.state.dialogOpen}
			onClose={this.handleCloseDialog}
			aria-labelledby="alert-dialog-title"
			aria-describedby="alert-dialog-description"
		  >
			<DialogTitle id="alert-dialog-title">{"Clear surface?"}</DialogTitle>
			<DialogContent>
			  <DialogContentText id="alert-dialog-description">
				Do you wish to clear the data on the selected surface?
			  </DialogContentText>
			</DialogContent>
			<DialogActions>
			  <Button onClick={()=> {this.handleCloseDialog();this.onImageRemove();}} color="primary">
				Confirm
			  </Button>
			  <Button onClick={this.handleCloseDialog} color="primary" autoFocus>
				Cancel
			  </Button>
			</DialogActions>
		  </Dialog>
		</div>
	  );
	}
}
