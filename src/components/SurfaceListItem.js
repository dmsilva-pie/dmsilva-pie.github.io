import React, { Component } from 'react';
import Files from 'react-files';
import { debounce } from 'lodash';
import { withStyles } from '@material-ui/core/styles';

import Box from '@material-ui/core/Box';
import Menu from '@material-ui/core/Menu';
import ListItem from '@material-ui/core/ListItem';
import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';

import Button from '@material-ui/core/Button';
import ButtonBase from '@material-ui/core/ButtonBase';
import IconButton from '@material-ui/core/IconButton';
import Checkbox from '@material-ui/core/CheckBox';
import Slider from '@material-ui/core/Slider';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup'

import Tooltip from '@material-ui/core/Tooltip';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

import MoveIcon from '@material-ui/icons/OpenWith';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import DeleteIcon from '@material-ui/icons/Delete';
import AddCircleIcon from '@material-ui/icons/AddCircle';


const CustomSlider = withStyles({
	root: {
		minWidth: 110,
		width: 'calc(100% - 20px)',
		height: 15,
		color: 'rgba(0, 0, 0, 1)',
	},
	thumb: {
		height: 20,
		width: 20,
		backgroundColor: '#fff',
		border: '2px solid currentColor',
		marginTop: -4,
		marginLeft: -12,
		'&:focus,&:hover,&$active': {
			boxShadow: 'inherit',
		},
	},
	mark: {
		backgroundColor: 'rgba(0, 0, 0, 0)',
		height: 8,
		width: 1,
		marginTop: -3,
	},
	active: {},
	valueLabel: {
		left: 'calc(-50% + 0px)',
		top: -22,
		color: 'rgba(0, 0, 0, 0.5)',
	},
	track: {
		height: 8,
		borderRadius: 2,
		color: 'rgba(0, 0, 0, 0)',
	},
	rail: {
		height: 10,
		borderRadius: 2,
		color: 'rgba(0, 0, 0, 1)',
	},
})(Slider);


export default class SurfaceListItem extends Component {

	constructor(props) {
		super(props);

		//Initial default values
		this.DEFAULT_RES = this.props.isMobile ? this.props.low_res : this.props.med_res;
		this.DEFAULT_SCALE = this.props.max_ext * 0.2 !== 0 ?
			Math.max(this.props.min_ext * 0.2, this.props.max_ext * 0.2) : this.props.min_ext * 0.2;

		this.state = {
			anchorEl_tex: undefined,
			anchorEl_obj: undefined,
			dialogOpen: false,
			loading: false,
			img_url: this.props.def_img_url ? this.props.def_img_url : window.LITHO3D.placeholderImage(this.props.index),
			img_file: null,
			enabled: this.props.def_res ? true : false,
			usable: this.props.hasOwnProperty("def_state") ? this.props.def_state : true,
			scale: this.props.def_ext !== null ? this.props.def_ext : this.DEFAULT_SCALE,
			resolution: this.props.def_res !== null ? this.props.def_res : this.DEFAULT_RES,
			reference: this.props.def_ref ? this.props.def_ref : "positive",
			transX: this.props.def_transX,
			transY: this.props.def_transY,
			scaleX: this.props.def_scaleX,
			scaleY: this.props.def_scaleY,
			rotation: this.props.def_rotation
		};

		this.handleOpenMenu = this.handleOpenMenu.bind(this);
		this.handleOpenTexMenu = this.handleOpenTexMenu.bind(this);
		this.handleCloseMenu = this.handleCloseMenu.bind(this);
		this.handleOpenDialog = this.handleOpenDialog.bind(this);
		this.handleCloseDialog = this.handleCloseDialog.bind(this);
		this.handleCheck = this.handleCheck.bind(this);
		this.onImageAdd = this.onImageAdd.bind(this);
		this.onImageAddError = this.onImageAddError.bind(this);
		this.onImageRemove = this.onImageRemove.bind(this);
		this.handleScaleChange = debounce(this.handleScaleSliderChange.bind(this), this.props.isMobile ? 200 : 50);
		this.handleResolutionChange = this.handleResolutionChange.bind(this);
		this.handleRefTypeChange = this.handleRefTypeChange.bind(this);
		this.handleTextureTransXChange = debounce(this.handleTextureTransXChange.bind(this), this.props.isMobile ? 200 : 10);
		this.handleTextureTransYChange = debounce(this.handleTextureTransYChange.bind(this), this.props.isMobile ? 200 : 10);
		this.handleTextureScaleXChange = debounce(this.handleTextureScaleXChange.bind(this), this.props.isMobile ? 200 : 10);
		this.handleTextureScaleYChange = debounce(this.handleTextureScaleYChange.bind(this), this.props.isMobile ? 200 : 10);
		this.handleTextureRotationChange = debounce(this.handleTextureRotationChange.bind(this), this.props.isMobile ? 200 : 10);
		this.handleTexturePositionReset = this.handleTexturePositionReset.bind(this);
		this.formatSliderScaling = this.formatSliderScaling.bind(this);
		this.formatSliderRotation = this.formatSliderRotation.bind(this);
	}

	handleOpenMenu(event) {
		this.setState({ anchorEl_obj: event.currentTarget });
	}

	handleOpenTexMenu(event) {
		this.setState({ anchorEl_tex: event.currentTarget });
	}
	handleCloseMenu() {
		this.setState({ anchorEl_tex: null, anchorEl_obj: null });
	}

	handleOpenDialog() {
		this.setState({ dialogOpen: true });
	}
	handleCloseDialog() {
		this.setState({ dialogOpen: false });
	}

	onImageAdd(file) {
		if (file.length > 0) {
			if(this.props.isMobile)
				this.props.warningFunc("Adding image to surface...", 30000);
			this.props.loading(true);

			var imgURL = URL.createObjectURL(file[0]);

			window.LITHO3D.addReference(this.props.index, imgURL, this.state.resolution, this.state.scale)
			.then(() => {
				if (this.state.img_url !== "" && this.state.img_url !== window.LITHO3D.placeholderImage(this.props.index)) 
					URL.revokeObjectURL(this.state.img_url);
				
				this.setState({ img_url: imgURL, img_file: file[0], enabled: true }, () => {
					this.refs.files.setState({ files: [] });
					this.props.loading(false);
					if(this.props.isMobile)
						this.props.warningFunc("New image reference was set.", 500);
				});
			})
			.catch(err => {
				this.props.warningFunc(err);
				URL.revokeObjectURL(imgURL);
				this.refs.files.setState({ files: [] });
				this.props.loading(false);
			});
		}
	}

	onImageAddError(error) {
		this.props.warningFunc(error.message);
	}

	onImageRemove() {
		window.LITHO3D.removeReference(this.props.index)
		.then(() => {
			if (this.state.img_url !== "" && this.state.img_url !== window.LITHO3D.placeholderImage(this.props.index)) 
				URL.revokeObjectURL(this.state.img_url);
			this.setState({
				img_url: window.LITHO3D.placeholderImage(this.props.index), img_file: null, enabled: false, usable: true,
				scale: this.props.def_ext !== null ? this.props.def_ext : this.DEFAULT_SCALE, 
				resolution: this.props.def_res !== null ? this.props.def_res : this.DEFAULT_RES
			}, () => {
				this.refs.files.setState({ files: [] });
				this.props.loading(false);
			});
		})
		.catch(err => {
			this.props.warningFunc(err);
			this.refs.files.setState({ files: [] });
			this.props.loading(false);
		});
	}

	handleCheck(event) {
		if (this.state.usable !== event.target.checked) {
			var checked = this.state.usable;
			this.props.loading(true);
			if(window.LITHO3D.changeReferenceState(this.props.index, !checked, this.state.scale)){
				this.setState({ usable: !checked }, () => {
					this.props.loading(false);
				});
			}
			else this.props.loading(false);
		}
	};

	handleScaleSliderChange(event, newValue) {
		if (this.state.scale !== newValue) {
			this.props.loading(true);
			if(window.LITHO3D.applyReference(this.props.index, newValue)){
				this.setState({ scale: newValue }, () => {
					this.props.loading(false);
				});
			}
			else this.props.loading(false);
		}
	}

	handleResolutionChange(event, newValue) {
		if (this.state.resolution !== newValue) {
			if(this.props.isMobile)
				this.props.warningFunc("Changing model resolution...", 10000);
			this.props.loading(true);
			window.LITHO3D.updateSurface(this.props.index, newValue, this.state.scale)
			.then(() => {
				this.setState({ resolution: newValue }, () => {
					this.props.loading(false);
					if(this.props.isMobile)
						this.props.warningFunc("New resolution was set.", 500);
				});
			});
		}
	}

	handleRefTypeChange(event, newValue) {
		if (this.state.reference !== newValue) {
			this.props.loading(true);
			if(window.LITHO3D.changeReferenceType(this.props.index, newValue, this.state.scale)){
				this.setState({ reference: newValue }, () => {
					this.props.loading(false);
				});
			}
			else this.props.loading(false);
		}
	}

	handleTextureTransXChange(e, newValue){
		if (this.state.transX !== newValue) {
			var oldValue = this.state.transX;
			this.setState({ transX: newValue }, () => {
				if(window.LITHO3D.changeReferencePosition(this.props.index, this.state.transX, this.state.transY, 1 / this.state.scaleX, 1 / this.state.scaleY, this.state.rotation, this.state.scale))
						this.props.loading(false);
				else 
					this.setState({ transX: oldValue }, () => {
						this.props.loading(false)});
			});
		}
	}
	handleTextureTransYChange(e, newValue){
		if (this.state.transY !== newValue) {
			var oldValue = this.state.transY;
			this.setState({ transY: newValue }, () => {
				if(window.LITHO3D.changeReferencePosition(this.props.index, this.state.transX, this.state.transY, 1 / this.state.scaleX, 1 / this.state.scaleY, this.state.rotation, this.state.scale))
						this.props.loading(false);
				else 
					this.setState({ transY: oldValue }, () => {
						this.props.loading(false)});
			});
		}
	}
	handleTextureScaleXChange(e, newValue){
		if (this.state.scaleX !== newValue) {
			var oldValue = this.state.scaleX;
			this.setState({ scaleX: newValue }, () => {
				if(window.LITHO3D.changeReferencePosition(this.props.index, this.state.transX, this.state.transY, 1 / this.state.scaleX, 1 / this.state.scaleY, this.state.rotation, this.state.scale))
						this.props.loading(false);
				else 
					this.setState({ scaleX: oldValue }, () => {
						this.props.loading(false)});
			});
		}
	}
	handleTextureScaleYChange(e, newValue){
		if (this.state.scaleY !== newValue) {
			var oldValue = this.state.scaleY;
			this.setState({ scaleY: newValue }, () => {
				if(window.LITHO3D.changeReferencePosition(this.props.index, this.state.transX, this.state.transY, 1 / this.state.scaleX, 1 / this.state.scaleY, this.state.rotation, this.state.scale))
						this.props.loading(false);
				else 
					this.setState({ scaleY: oldValue }, () => {
						this.props.loading(false)});
			});
		}
	}
	handleTextureRotationChange(e, newValue){
		if (this.state.rotation !== newValue) {
			var oldValue = this.state.rotation;
			this.setState({ rotation: newValue }, () => {
				if(window.LITHO3D.changeReferencePosition(this.props.index, this.state.transX, this.state.transY, 1 / this.state.scaleX, 1 / this.state.scaleY, this.state.rotation, this.state.scale))
						this.props.loading(false);
				else 
					this.setState({ rotation: oldValue }, () => {
						this.props.loading(false)});
			});
		}
	}

	handleTexturePositionReset(event) {
		if(window.LITHO3D.changeReferencePosition(this.props.index, 0,0,1,1,0,this.state.scale)
		){
			this.setState({ transX: 0, transY: 0, scaleX: 1, scaleY: 1, rotation: 0 }, 
				() => { this.props.loading(false);
			});
		}
	}

	formatSliderScaling(x) {
		return x.toFixed(2);
	}

	formatSliderRotation(x) {
		return x.toFixed(2);
	}

	render() {
		return (
			<React.Fragment>
				<ListItem key={`item-${this.props.item}`}>

					<Box width="100%" height={80} display="flex">

						<Files
							className='files-dropzone'
							ref='files'
							onChange={this.onImageAdd}
							onError={this.onImageAddError}
							accepts={['image/*']}
							multiple={false}
							maxFiles={1}
							maxFileSize={10000000}
							minFileSize={0}
							clickable
						>
							<Box width={80} height={80} alignSelf="flex-start">

								<ButtonBase
									focusRipple
									key={this.props.item + 1}
									style={{
										width: "100%",
										height: "100%",
										backgroundImage: `url(${this.state.img_url})`,
										backgroundSize: 'contain',
										backgroundRepeat: 'no-repeat',
										backgroundPosition: 'center'
									}}
								>
									<span className="showonfocus">
										<Tooltip title={this.state.enabled ? "Change Image" : "Add Image"} enterDelay={100}>
											<AddCircleIcon
												style={{
													color: "white",
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

							<Box height={40} pl={3} display="flex" flexGrow={1} alignItems="center">
								<Typography>
									{this.props.title}
								</Typography>
							</Box>

							<Divider />

							<Box height={40} pl={1} display="flex" flexGrow={1} alignItems="center">

								{/*CLEAR*/}
								{this.state.enabled ?
									<Tooltip title="Clear" enterDelay={100}>
										<IconButton aria-label="delete" onClick={this.handleOpenDialog}><DeleteIcon /></IconButton>
									</Tooltip> :
									<IconButton disabled={!this.state.enabled} aria-label="delete" onClick={this.handleOpenDialog}><DeleteIcon /></IconButton>
								}

								{/*MOVE MENU*/}
								{this.state.enabled ?
									<React.Fragment>
										<Tooltip title="Move/Rotate" enterDelay={100}>
											<IconButton disabled={!this.state.enabled} aria-controls={"texture-menu" + this.props.item} aria-haspopup="true" onClick={this.handleOpenTexMenu}>
												<MoveIcon />
											</IconButton >
										</Tooltip>
										<Menu
											id={"texture-menu" + this.props.item}
											anchorEl={this.state.anchorEl_tex}
											keepMounted
											open={Boolean(this.state.anchorEl_tex)}
											onClose={this.handleCloseMenu}
										>
											<Box px={2} py={1} display="flex" flexDirection='column' flexGrow={1} alignItems="center">
												<Typography>Translate X</Typography>
												<CustomSlider
													onChange={this.handleTextureTransXChange}
													value={this.state.transX}
													aria-labelledby="discrete-slider"
													valueLabelDisplay="auto"
													step={this.props.isMobile? 0.05 : 0.02}
													marks
													min={-1.5}
													max={1.5}
												/>
												<Typography>Translate Y</Typography>
												<CustomSlider
													onChange={this.handleTextureTransYChange}
													value={this.state.transY}
													aria-labelledby="discrete-slider"
													valueLabelDisplay="auto"
													step={this.props.isMobile? 0.05 : 0.02}
													marks
													min={-1.5}
													max={1.5}
												/>
												<Typography>Scale X</Typography>
												<CustomSlider
													onChange={this.handleTextureScaleXChange}
													value={this.state.scaleX}
													aria-labelledby="discrete-slider"
													valueLabelDisplay="auto"
													valueLabelFormat={this.formatSliderScaling}
													step={this.props.isMobile? 0.05 : 0.02}
													marks
													min={0.05}
													max={1.95}
												/>
												<Typography>Scale Y</Typography>
												<CustomSlider
													onChange={this.handleTextureScaleYChange}
													value={this.state.scaleY}
													aria-labelledby="discrete-slider"
													valueLabelDisplay="auto"
													valueLabelFormat={this.formatSliderScaling}
													step={this.props.isMobile? 0.05 : 0.02}
													marks
													min={0.005}
													max={2.005}
												/>
												<Typography>Rotate</Typography>
												<CustomSlider
													onChange={this.handleTextureRotationChange}
													value={this.state.rotation}
													aria-labelledby="discrete-slider"
													valueLabelDisplay="auto"
													valueLabelFormat={this.formatSliderRotation}
													step={Math.PI / 32}
													marks
													min={-Math.PI}
													max={Math.PI}
												/>
												<Button variant="contained" onClick={this.handleTexturePositionReset}>
													Reset
								  				</Button>
											</Box>

										</Menu>
									</React.Fragment>
									:
									<IconButton disabled={!this.state.enabled} aria-controls={"texture-menu" + this.props.item} aria-haspopup="true" onClick={this.handleOpenTexMenu}>
										<MoveIcon />
									</IconButton >
								}

								{/*VOLUME MENU*/}
								{this.state.enabled ?
									<React.Fragment>
										<Tooltip title="Volume" enterDelay={100}>
											<IconButton disabled={!this.state.enabled} aria-controls={"sculpting-menu" + this.props.item} aria-haspopup="true" onClick={this.handleOpenMenu}>
												<ExpandMoreIcon />
											</IconButton >
										</Tooltip>
										<Menu
											id={"sculpting-menu" + this.props.item}
											anchorEl={this.state.anchorEl_obj}
											keepMounted
											open={Boolean(this.state.anchorEl_obj)}
											onClose={this.handleCloseMenu}
										>
											<Box px={2} py={1} display="flex" flexDirection='column' flexGrow={1} alignItems="center">
												<Box pt={1} display="flex" flexDirection='column' flexGrow={1} alignItems="center">
													<Typography>Image Reference</Typography>
													<ToggleButtonGroup
														value={this.state.reference}
														exclusive
														onChange={this.handleRefTypeChange}
														aria-label="reference"
													>
														<ToggleButton value="positive" aria-label="positive" disabled={this.state.reference === "positive"}>
															Positive
													</ToggleButton>
														<ToggleButton value="negative" aria-label="negative" disabled={this.state.reference === "negative"}>
															Negative
													</ToggleButton>
													</ToggleButtonGroup>
												</Box>
												<Box pt={2} display="flex" flexDirection='column' flexGrow={1} alignItems="center">
													<Typography>Resolution</Typography>
													<ToggleButtonGroup
														value={this.state.resolution}
														exclusive
														onChange={this.handleResolutionChange}
														aria-label="resolution"
													>
														<ToggleButton value={this.props.low_res} aria-label="low" disabled={this.state.resolution === this.props.low_res}>
															low
													</ToggleButton>
														<ToggleButton value={this.props.med_res} aria-label="mid" disabled={this.state.resolution === this.props.med_res}>
															mid
													</ToggleButton>
														<ToggleButton value={this.props.high_res} aria-label="high" disabled={this.state.resolution === this.props.high_res}>
															high
													</ToggleButton>
														<ToggleButton value={this.props.ultra_res} aria-label="ultra" disabled={this.state.resolution === this.props.ultra_res}>
															ultra
													</ToggleButton>
													</ToggleButtonGroup>
												</Box>
												<Box width="100%" pt={2} display="flex" flexDirection='column' flexGrow={1} alignItems="center">
													<Typography>Extrude Scale</Typography>
													<CustomSlider
														onChange={this.handleScaleChange}
														defaultValue={this.state.scale}
														aria-labelledby="discrete-slider"
														valueLabelDisplay="auto"
														step={1}
														marks
														min={this.props.min_ext}
														max={this.props.max_ext}
													/>
												</Box>
											</Box>
										</Menu>
									</React.Fragment>
									:
									<IconButton disabled={!this.state.enabled} aria-controls={"sculpting-menu" + this.props.item} aria-haspopup="true" onClick={this.handleOpenMenu}>
										<ExpandMoreIcon />
									</IconButton >
								}

							</Box>
						</Box>

						{/*Enable/Disable Checkmark*/}
						<Box width={40} height={80} display="flex" alignItems="center" alignSelf="flex-end">
							{this.state.enabled ?
								this.state.usable ?
									<Tooltip title="Disable" enterDelay={100}>
										<Checkbox disabled={!this.state.enabled} checked={this.state.usable} onChange={this.handleCheck} />
									</Tooltip>
									:
									<Tooltip title="Enable" enterDelay={100}>
										<Checkbox disabled={!this.state.enabled} checked={this.state.usable} onChange={this.handleCheck} />
									</Tooltip>
								:
								<Checkbox
									disabled={!this.state.enabled}
									checked={this.state.usable}
									onChange={this.handleCheck}
								/>
							}
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
						<Button onClick={() => { this.handleCloseDialog(); this.onImageRemove(); }} color="primary">
							Confirm
			  			</Button>
						<Button onClick={this.handleCloseDialog} color="primary" autoFocus>
							Cancel
			  			</Button>
					</DialogActions>
				</Dialog>
			</React.Fragment>
		);
	}
}
