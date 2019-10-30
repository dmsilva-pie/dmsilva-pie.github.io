import React, { Component } from 'react';
import Files from 'react-files';
import { throttle } from 'lodash';

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
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup'

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

import MoveIcon from '@material-ui/icons/OpenWith';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import DeleteIcon from '@material-ui/icons/Delete';
import AddCircleIcon from '@material-ui/icons/AddCircle';

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
			img_url: this.props.def_img_url ? this.props.def_img_url : window.placeholderImage(this.props.index),
			img_file: null,
			enabled: this.props.def_res ? true : false,
			usable: this.props.def_state ? this.props.def_state : true,
			scale: this.props.def_ext ? this.props.def_ext : this.DEFAULT_SCALE,
			resolution: this.props.def_res? this.props.def_res : this.DEFAULT_RES,
			reference: this.props.def_ref ? this.props.def_ref : "positive",
			transX: this.props.def_transX,
			transY: this.props.def_transY,
			scaleX: this.props.def_scaleX,
			scaleY: this.props.def_scaleY,
			rotation: this.props.def_rotation
		};
		this.updatingSlider = false;

		this.handleOpenMenu = this.handleOpenMenu.bind(this);
		this.handleOpenTexMenu = this.handleOpenTexMenu.bind(this);
		this.handleCloseMenu = this.handleCloseMenu.bind(this);
		this.handleOpenDialog = this.handleOpenDialog.bind(this);
		this.handleCloseDialog = this.handleCloseDialog.bind(this);
		this.handleCheck = this.handleCheck.bind(this);
		this.onImageAdd = this.onImageAdd.bind(this);
		this.onImageAddError = this.onImageAddError.bind(this);
		this.onImageRemove = this.onImageRemove.bind(this);
		this.handleScaleChange =  throttle(this.handleScaleSliderChange.bind(this), 100);
		this.handleResSliderChange = this.handleResSliderChange.bind(this);
		this.handleRefTypeChange = this.handleRefTypeChange.bind(this);
		this.handleTexturePositionChange = this.handleTexturePositionChange.bind(this);
		this.handleTexturePositionReset = this.handleTexturePositionReset.bind(this);
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

	handleCheck(event) {
		if(this.state.usable !== event.target.checked){
			var checked = this.state.usable;
			this.setState({ usable: !checked }, () => {
				window.changeReferenceState(this.props.index, this.state.usable, this.state.scale);
			});
		}
	};

	onImageAdd(file) {
		if (file.length > 0) {
			this.setState({ img_url: file[0].preview.url, img_file: file[0], enabled: true }, () => {

				this.refs.files.setState({ files: [] });
				this.props.loading();
				window.addReference(this.props.index, this.state.img_url, this.state.resolution, this.state.scale).then(result => {
					this.props.loading();
				});
			});
		}
	}

	onImageAddError(error) {
		this.props.warningFunc(error.message);
	}

	onImageRemove() {
		this.setState({
			img_url: window.placeholderImage(this.props.index), img_file: null, enabled: false, usable: false,
			scale: this.DEFAULT_SCALE, resolution: this.DEFAULT_RES
		}, () => {
			this.refs.files.setState({ files: [] });
			this.props.loading();
			window.removeReference(this.props.index).then(result => {
				this.props.loading();
			});
		});
	}

	handleScaleSliderChange(event, newValue) {
		if(!this.updatingSlider && this.state.scale !== newValue){
			this.setState({ scale: newValue }, () => {
				window.applyReference(this.props.index, this.state.scale);
			});
		}
	}

	handleResSliderChange(event, newValue) {
		this.setState({ resolution: newValue }, () => {
			this.props.loading();
			window.updateSurface(this.props.index, this.state.resolution, this.state.scale).then(result => {
				this.props.loading();
			});
		});
	}

	handleRefTypeChange(event, newValue){
		if(this.state.reference !== newValue){
			this.setState({ reference: newValue }, () => {
				window.changeReferenceType(this.props.index, this.state.reference, this.state.scale);
				
			});
		}
	}

	handleTexturePositionChange = attr => (e, newValue) => {
		if(!this.updatingSlider && this.state[attr] !== newValue){
			this.setState({ [attr]: newValue}, () => {
				window.changeReferencePosition(this.props.index, this.state.transX, this.state.transY, this.state.scaleX, this.state.scaleY, this.state.rotation, this.state.scale);
			});
		}
		
	}

	handleTexturePositionReset(event){
		this.updatingSlider = true;
		this.setState({ transX: 0, transY: 0, scaleX: 100, scaleY: 100, rotation: 0}, () => {
			window.changeReferencePosition(this.props.index, this.state.transX, this.state.transY, this.state.scaleX, this.state.scaleY, this.state.rotation, this.state.scale);
		});
		this.updatingSlider = false
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
										backgroundSize: 'cover',
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
												<Slider
													onChange={this.handleTexturePositionChange("transX")}
													value={this.state.transX}
													aria-labelledby="discrete-slider"
													valueLabelDisplay="off"
													step={1}
													marks
													min={-100}
													max={100}
												/>
												<Typography>Translate Y</Typography>
												<Slider
													onChange={this.handleTexturePositionChange("transY")}
													value={this.state.transY}
													aria-labelledby="discrete-slider"
													valueLabelDisplay="off"
													step={1}
													marks
													min={-100}
													max={100}
												/>
												<Typography>Scale X</Typography>
												<Slider
													onChange={this.handleTexturePositionChange("scaleX")}
													value={this.state.scaleX}
													aria-labelledby="discrete-slider"
													valueLabelDisplay="off"
													step={1}
													marks
													min={50}
													max={200}
												/>
												<Typography>Scale Y</Typography>
												<Slider
													onChange={this.handleTexturePositionChange("scaleY")}
													value={this.state.scaleY}
													aria-labelledby="discrete-slider"
													valueLabelDisplay="off"
													step={1}
													marks
													min={50}
													max={200}
												/>
												<Typography>Rotate</Typography>
												<Slider
													onChange={this.handleTexturePositionChange("rotation")}
													value={this.state.rotation}
													aria-labelledby="discrete-slider"
													valueLabelDisplay="off"
													step={Math.PI/32}
													marks
													min={0}
													max={2*Math.PI}
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
												<Typography>Extrude Scale</Typography>
												<Slider
													onChange={this.handleScaleChange}
													defaultValue={this.state.scale}
													aria-labelledby="discrete-slider"
													valueLabelDisplay="auto"
													step={1}
													marks
													min={this.props.min_ext}
													max={this.props.max_ext}
												/>
												<Typography>Resolution</Typography>
												<ToggleButtonGroup
													value={this.state.resolution}
													exclusive
													onChange={this.handleResSliderChange}
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
