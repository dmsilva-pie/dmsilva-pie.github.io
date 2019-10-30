import React, { Component } from 'react';
//import { debounce } from "lodash";


import Box from '@material-ui/core/Box';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import Typography from '@material-ui/core/Typography';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import IconButton from '@material-ui/core/IconButton';

import Button from '@material-ui/core/Button';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';

import Snackbar from '@material-ui/core/Snackbar';

import HelpIcon from '@material-ui/icons/Help';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ColorLensIcon from '@material-ui/icons/ColorLens';
import SettingsIcon from '@material-ui/icons/Settings';
import BuildIcon from '@material-ui/icons/Build';
import ViewIcon from '@material-ui/icons/RemoveRedEye';
import PublishIcon from '@material-ui/icons/Publish';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import CloseIcon from '@material-ui/icons/Close';


import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';

import { TwitterPicker } from 'react-color';
import Files from 'react-files';

import SurfaceList from './SurfaceList';
import HelpMenu from './HelpMenu';

const styles = {
	root: {
		width: '100%',
		height: '100%',
		overflow: 'hidden',
	},
	subroot: {
		width: '100%',
		height: '100%',
		overflowY: 'auto',
		overflowX: 'hidden',
		paddingright: '20px',
	},
	heading: {
		fontSize: 15,
		fontWeight: 300,
	},
	colorpicker: {
		maxHeight: "80px",
		overflow: 'hidden'
	},
	helper: {
		textAlign: "left",
		display: "inline-block",
		whiteSpace: "pre-wrap",
		width: "100%",
		maxHeight: "250px",
		overflowY: 'auto',
		overflowX: "hidden"
	},
	uploader: {
		margin: "auto",
		height: "100px",
		border: "3px dotted #a3a199"
	}
};

const MODELTYPES = {
	UPLOAD: "upload",
	PREMADE: "premade",
	PREMADE_CUSTOM: "premade_custom"
};

export default class OptionMenu extends Component {

	constructor(props) {
		super(props);
		this.state = {
			model_uri: "",
			model_def_uri: "",
			model_type: "",
			surfaceList: [],
			color: '#FCB900',
			wireframeView: false,
			textureView: false,
			expandedMenu: null,
			viewDisplay: "color",
			snackbarOpen: false,
			snackbarMsg: "",
			isUpload: false,
			isUploadDialogOpen: false,
			uploadedModel: null
		};

		this.handleMenuChange = this.handleMenuChange.bind(this);
		this.handleViewCheck = this.handleViewCheck.bind(this);
		this.handleUploaderClose = this.handleUploaderClose.bind(this);
		this.handleUploaderOpen = this.handleUploaderOpen.bind(this);
		this.handleUploaderSave = this.handleUploaderSave.bind(this);
		this.handleUploaderError = this.handleUploaderError.bind(this);
		this.handleSnackbarClose = this.handleSnackbarClose.bind(this);
		this.emitWarningMessage = this.emitWarningMessage.bind(this);
	}


	componentDidMount() {
		this.props.loadingToggle();
		this.getConfiguration().then(() => {

			if (this.state.model_uri && this.state.model_uri !== "" && this.state.model_uri !== "null" && (this.state.model_type === MODELTYPES.PREMADE || this.state.model_type === MODELTYPES.PREMADE_CUSTOM)) {
				window.loadModel(this.state.model_uri, this.state.model_type, this.state.color)
					.then(surfaces => {
						this.setState({ surfaceList: surfaces }, this.props.loadingToggle);
					});
			}
			else if (this.state.model_type === MODELTYPES.UPLOAD) {
				this.setState({ isUpload: true, isUploadDialogOpen: true });
				//call dialog open
				this.props.loadingToggle();
			}

		});
	}

	/* Acquire configurations from root element */
	getConfiguration() {
		return new Promise(resolve => {
			var container = document.getElementById("root");

			this.setState({
				model_uri: container.hasAttribute('model_uri') ? container.getAttribute('model_uri') : "",
				model_def_uri: container.hasAttribute('model_def_uri') ? container.getAttribute('model_def_uri') : "",
				model_type: container.hasAttribute('model_type') ? container.getAttribute('model_type') : "upload",
				color: container.hasAttribute('defaultColor') ? container.getAttribute('defaultColor') : "#FCB900"
			}, resolve);
		});
	}

	downloadModel() {
		window.downloadOBJ(true);
	}

	downloadJSON() {
		window.downloadJSON();
	}

	handleUploaderSave(files) {
		if (files.length > 0) {
			if (files[0].extension === "obj") {
				if (this.state.uploadedModel) URL.revokeObjectURL(this.state.uploadedModel);

				this.setState({ uploadedModel: URL.createObjectURL(files[0]), isUploadDialogOpen: false }, () => {
					this.props.loadingToggle();
					window.loadModel(this.state.uploadedModel, this.state.model_type, this.state.color)
						.then(surfaces => {
							this.setState({ surfaceList: surfaces }, this.props.loadingToggle);
						});
				});
			}
			else if (files[0].extension === "json") {
				if (this.state.uploadedModel) URL.revokeObjectURL(this.state.uploadedModel);

				this.setState({ uploadedModel: URL.createObjectURL(files[0]), isUploadDialogOpen: false }, () => {
					this.props.loadingToggle();
					fetch(this.state.uploadedModel)
						.then(response => response.json())
						.then(data => {
							window.loadJSON(data).then(surfaces => {
								this.setState({ surfaceList: surfaces, color: data.color.toString(16) }, this.props.loadingToggle);
							});
						})
						.catch((error) => {
							console.error(error);
							this.props.loadingToggle();
						});

				});
			}

		}
	}

	handleUploaderError(error, file) {
		this.emitWarningMessage(error.message);
	}

	handleUploaderOpen() {
		this.setState({ isUploadDialogOpen: true });
	}

	handleUploaderClose() {
		this.setState({ isUploadDialogOpen: false });
	}

	handleSnackbarClose(event, reason) {
		if (reason === 'clickaway') { return; }
		this.setState({ snackbarOpen: false, snackbarMsg: "" });
	}

	emitWarningMessage(message) {
		this.setState({ snackbarOpen: true, snackbarMsg: message });
	}


	handleViewCheck(event) {
		var mode = event.target.value;
		if (this.state.viewDisplay !== mode) {
			this.props.loadingToggle();
			this.setState({ viewDisplay: mode }, () => {
				window.changeViewMode(mode)
					.then(result => {
						this.props.loadingToggle();
					});
			});
		}
	};

	handleMenuChange = panel => (event, isExpanded) => {
		this.setState({ expandedMenu: isExpanded ? panel : false });
		this.props.openFunction();
	};

	handleColorChange = (color, event) => {
		if (this.state.color !== color.hex) {
			this.props.loadingToggle();
			this.setState({ color: color.hex }, () => {
				window.colorize(color)
					.then(result => {
						this.props.loadingToggle();
					});
			});
		}

	};

	render() {
		return (
			<div style={styles.root}>
				<div style={styles.subroot} className='hide-scrollbar'>

					{/* MODEL UPLOAD DIALOG */}
					<Dialog open={this.state.isUploadDialogOpen} onClose={this.handleUploaderClose} aria-labelledby="form-dialog-title">
						<DialogTitle id="form-dialog-title">Upload a 3D model</DialogTitle>
						<DialogContent>
							<Files
								className='files-dropzone'
								onChange={this.handleUploaderSave}
								onError={this.handleUploaderError}
								accepts={['.obj', '.json']}
								multiple={false}
								maxFiles={1}
								maxFileSize={200000000}
								minFileSize={0}
								clickable
							>
								<Box display="flex" px={3} py={5} alignItems="center" justifyContent="center" style={styles.uploader}>
									<Typography>Drop files here or click to upload.</Typography>
								</Box>
							</Files>
						</DialogContent>
						<DialogActions>
							<Button onClick={this.handleUploaderClose} color="primary">
								Close
          					</Button>
						</DialogActions>
					</Dialog>

					{/* WARNING MESSAGES */}
					<Snackbar
						anchorOrigin={{
							vertical: 'bottom',
							horizontal: 'left',
						}}
						open={this.state.snackbarOpen}
						autoHideDuration={6000}
						onClose={this.handleSnackbarClose}
						ContentProps={{
							'aria-describedby': 'message-id',
						}}
						message={<span id="message-id">{this.state.snackbarMsg}</span>}
						action={[
							<IconButton
								key="close"
								aria-label="close"
								color="inherit"
								onClick={this.handleSnackbarClose}
							>
								<CloseIcon />
							</IconButton>,
						]}
					/>

					{/* UPLOAD MENU */}
					{this.state.isUpload ? <React.Fragment>
						<ExpansionPanel expanded={this.props.open && (this.state.expandedMenu === 'upload')} onChange={this.handleMenuChange('upload')} TransitionProps={{ unmountOnExit: true }}>
							<ExpansionPanelSummary
								expandIcon={this.props.open ? <ExpandMoreIcon /> : null}
								aria-controls="panel1a-content"
								id="panel1a-header"
							>
								{this.props.open ? <React.Fragment><ListItemIcon><PublishIcon /></ListItemIcon><Typography>Change Model</Typography></React.Fragment> :
									<Box ml={3}><ListItemIcon><PublishIcon /></ListItemIcon></Box>}
							</ExpansionPanelSummary>
							<ExpansionPanelDetails>
								<Button onClick={this.handleUploaderOpen} color="primary">Upload a new model</Button>
							</ExpansionPanelDetails>
						</ExpansionPanel></React.Fragment> : null}


					{/* COLOR CHANGE MENU */}
					<ExpansionPanel expanded={this.props.open && (this.state.expandedMenu === 'color')} onChange={this.handleMenuChange('color')} TransitionProps={{ unmountOnExit: true }}>
						<ExpansionPanelSummary
							expandIcon={this.props.open ? <ExpandMoreIcon /> : null}
							aria-controls="panel1a-content"
							id="panel1a-header"
						>
							{this.props.open ? <React.Fragment><ListItemIcon><ColorLensIcon /></ListItemIcon><Typography>Color</Typography></React.Fragment> :
								<Box ml={3}><ListItemIcon><ColorLensIcon /></ListItemIcon></Box>}
						</ExpansionPanelSummary>
						<ExpansionPanelDetails>
							<Box style={styles.colorpicker}>
								<TwitterPicker
									width="100%"
									color={this.state.color}
									onChangeComplete={this.handleColorChange}
								/>
							</Box>
						</ExpansionPanelDetails>
					</ExpansionPanel>


					{/* SURFACE EDIT MENU */}
					<ExpansionPanel expanded={this.props.open && (this.state.expandedMenu === 'surfaces')} onChange={this.handleMenuChange('surfaces')}>
						<ExpansionPanelSummary
							expandIcon={this.props.open ? <ExpandMoreIcon /> : null}
							aria-controls="panel2a-content"
							id="panel2a-header"
						>
							{this.props.open ? <React.Fragment><ListItemIcon><BuildIcon /></ListItemIcon><Typography>Edit Surfaces</Typography></React.Fragment> :
								<Box ml={3}><ListItemIcon><BuildIcon /></ListItemIcon></Box>}
						</ExpansionPanelSummary>
						<ExpansionPanelDetails>
							<SurfaceList
								loading={this.props.loadingToggle}
								model_def_uri={this.state.model_def_uri}
								surfaces={this.state.surfaceList}
								warningFunc={this.emitWarningMessage}
							/>
						</ExpansionPanelDetails>
					</ExpansionPanel>


					{/* OPTIONS MENU */}
					<ExpansionPanel expanded={this.props.open && (this.state.expandedMenu === 'options')} onChange={this.handleMenuChange('options')} TransitionProps={{ unmountOnExit: true }}>
						<ExpansionPanelSummary
							expandIcon={this.props.open ? <ExpandMoreIcon /> : null}
							aria-controls="panel2a-content"
							id="panel2a-header"
						>
							{this.props.open ? <React.Fragment><ListItemIcon><SettingsIcon /></ListItemIcon><Typography>Settings</Typography></React.Fragment> :
								<Box ml={3}><ListItemIcon><SettingsIcon /></ListItemIcon></Box>}
						</ExpansionPanelSummary>
						<ExpansionPanelDetails>
							<FormControl component="fieldset">
								<FormLabel component="legend"><ListItemIcon><ViewIcon /></ListItemIcon><Typography>Viewer Display</Typography></FormLabel>
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


					{/* HELP MENU */}
					<ExpansionPanel expanded={this.props.open && (this.state.expandedMenu === 'help')} onChange={this.handleMenuChange('help')} TransitionProps={{ unmountOnExit: true }}>
						<ExpansionPanelSummary
							expandIcon={this.props.open ? <ExpandMoreIcon /> : null}
							aria-controls="panel2a-content"
							id="panel2a-header"
						>
							{this.props.open ? <React.Fragment><ListItemIcon><HelpIcon /></ListItemIcon><Typography>Help</Typography></React.Fragment> :
								<Box ml={3}><ListItemIcon><HelpIcon /></ListItemIcon></Box>}
						</ExpansionPanelSummary>
						<ExpansionPanelDetails>
							<HelpMenu />
						</ExpansionPanelDetails>
					</ExpansionPanel>

					{/* DOWNLOAD/SERVER MENU */}
					{true ? <React.Fragment>
						<ExpansionPanel expanded={this.props.open && (this.state.expandedMenu === 'download')} onChange={this.handleMenuChange('download')} TransitionProps={{ unmountOnExit: true }}>
							<ExpansionPanelSummary
								expandIcon={this.props.open ? <ExpandMoreIcon /> : null}
								aria-controls="panel1a-content"
								id="panel1a-header"
							>
								{this.props.open ? <React.Fragment><ListItemIcon><CloudDownloadIcon /></ListItemIcon><Typography>Download Model</Typography></React.Fragment> :
									<Box ml={3}><ListItemIcon><CloudDownloadIcon /></ListItemIcon></Box>}
							</ExpansionPanelSummary>
							<ExpansionPanelDetails>
								<Button onClick={this.downloadModel} color="primary">Download OBJ</Button>
								<Button onClick={this.downloadJSON} color="primary">Download JSON</Button>
							</ExpansionPanelDetails>
						</ExpansionPanel></React.Fragment> : null}

				</div>
			</div>
		);
	}
}
