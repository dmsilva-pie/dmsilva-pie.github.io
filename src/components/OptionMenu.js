import React, { Component } from 'react';
import '../css/App.css';

import Box from '@material-ui/core/Box';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import Typography from '@material-ui/core/Typography';

import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';

import Snackbar from '@material-ui/core/Snackbar';

import MenuIcon from '@material-ui/icons/Menu';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ListItemIcon from '@material-ui/core/ListItemIcon';
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
		paddingRight: '20px'
	},
	heading: {
		fontSize: 15,
		fontWeight: 300,
	},
	colorpicker: {
		maxHeight: "100px",
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
	},
	mobileTransparent: {
		backgroundColor: window.LITHO3D.isMobile ? "rgba(230,230,230,0.1)" : "rgba(255,255,255,1)",
	},
	toolbar: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'flex-end',
		padding: '5px 8px'
	}
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
			expandedMenu: null,
			viewDisplay: "color",
			snackbarOpen: false,
			snackbarDuration: 0,
			snackbarMsg: "",
			isUpload: true,
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
		this.downloadModelOBJ = this.downloadModelOBJ.bind(this);
		this.downloadModelSTL = this.downloadModelSTL.bind(this);
		this.downloadModelGLB = this.downloadModelGLB.bind(this);
		this.downloadJSON = this.downloadJSON.bind(this);
		this.downloadZip = this.downloadZip.bind(this);
	}

	/** On mount, load default model */
	componentDidMount() {
		this.props.loadingToggle(true);
		this.getConfiguration().then(() => {

			//Load default model, if specified.
			if (this.state.model_uri !== "") {
				var re = /(?:\.([^.]+))?$/;
				var format = re.exec(this.state.model_uri)[1];
				if (format === undefined) format = "obj";
				var isUpload = this.state.model_type === window.LITHO3D.MODELTYPES.UPLOAD;

				this.emitWarningMessage("Loading model...", 60000);
				window.LITHO3D.loadModel(this.state.model_uri, format, this.state.model_type, this.state.color)
					.then(surfaces => {
						this.setState({ isUpload: isUpload, isUploadDialogOpen: false, surfaceList: surfaces },
							this.props.loadingToggle(false));
						this.emitWarningMessage("Model loaded.", 1000);
					})
					.catch(err => {
						this.setState({ isUpload: isUpload, isUploadDialogOpen: isUpload });
						this.emitWarningMessage(err.message);
						this.props.loadingToggle(false);
					});
			}
			else
				this.props.loadingToggle(false);
		});
	}

	/** Acquire default configurations from root element */
	getConfiguration() {
		return new Promise((resolve) => {
			var container = document.getElementById("root");
			this.setState({
				model_uri: container.hasAttribute('model_uri') ? container.getAttribute('model_uri') : "",
				model_def_uri: container.hasAttribute('model_def_uri') ? container.getAttribute('model_def_uri') : "",
				model_type: container.hasAttribute('model_type') ? container.getAttribute('model_type') : "upload",
				color: container.hasAttribute('defaultColor') ? container.getAttribute('defaultColor') : "#FCB900"
			}, resolve(true));
		});
	}

	/** Download the model in STL format */
	downloadModelSTL() {
		this.emitWarningMessage("Preparing STL file...", 60000);
		this.props.loadingToggle(true);
		window.LITHO3D.downloadSTL(1, 1, 1, true, false).then(() => {
			this.props.loadingToggle(false);
			this.emitWarningMessage("File is ready for download.", 500);
		})
			.catch(err => {
				this.props.loadingToggle(false);
				this.emitWarningMessage(err.message);
			});
	}
	/** Download the model in OBJ format */
	downloadModelOBJ() {
		this.emitWarningMessage("Preparing OBJ file...", 60000);
		this.props.loadingToggle(true);
		window.LITHO3D.downloadOBJ(1, 1, 1, true).then(() => {
			this.props.loadingToggle(false);
			this.emitWarningMessage("File is ready for download.", 500);
		})
			.catch(err => {
				this.props.loadingToggle(false);
				this.emitWarningMessage(err.message);
			});
	}
	/** Download the model in GLB format */
	downloadModelGLB() {
		this.emitWarningMessage("Preparing GLTF file...", 60000);
		this.props.loadingToggle(true);
		window.LITHO3D.downloadGLTF(1, 1, 1, false, true).then(() => {
			this.props.loadingToggle(false);
			this.emitWarningMessage("File is ready for download.", 500);
		})
			.catch(err => {
				this.props.loadingToggle(false);
				this.emitWarningMessage(err.message);
			});
	}
	/** Download the model, images and settings in ZIP format */
	downloadZip() {
		this.emitWarningMessage("Preparing ZIP file...", 60000);
		this.props.loadingToggle(true);
		window.LITHO3D.downloadZip().then(res => {
			this.props.loadingToggle(false);
			this.emitWarningMessage("File is ready for download.", 500);
		})
			.catch(err => {
				this.props.loadingToggle(false);
				this.emitWarningMessage(err.message);
			});
	}
	/** Download the settings in JSON format */
	downloadJSON() {
		this.emitWarningMessage("Downloading JSON file...", 60000);
		this.props.loadingToggle(true);
		window.LITHO3D.downloadJSON().then(res => {
			this.props.loadingToggle(false);
			this.emitWarningMessage("File is ready for download.", 500);
		})
			.catch(err => {
				this.emitWarningMessage(err.message);
				this.props.loadingToggle(false);
			});
	}

	/** Process the upload of a model file or zip */
	handleUploaderSave(files) {
		if (files.length > 0) {
			if (files[0].extension !== "7z") {

				var uploadedModel = URL.createObjectURL(files[0]);

				this.setState({ isUploadDialogOpen: false }, () => {
					this.props.loadingToggle(true);
					this.emitWarningMessage("Loading model...", 60000);
					window.LITHO3D.loadModel(uploadedModel, files[0].extension, this.state.model_type, this.state.color)
						.then(surfaces => {
							this.setState({ surfaceList: [], model_def_uri: "" }, () => {
								if (this.state.uploadedModel) URL.revokeObjectURL(this.state.uploadedModel);
								this.setState({ surfaceList: surfaces, uploadedModel: uploadedModel },
									this.props.loadingToggle(false));
								this.emitWarningMessage("Model loaded.", 1000);
							});
						})
						.catch(err => {
							URL.revokeObjectURL(uploadedModel);
							if (this.refs.upload) this.refs.upload.setState({ files: [] });
							this.emitWarningMessage(err.message);
							this.props.loadingToggle(false);
							this.setState({ isUploadDialogOpen: true });
						});
				});
			}
			else if (files[0].extension === "7z") {
				this.setState({ isUploadDialogOpen: false }, () => {
					this.props.loadingToggle(true);
					this.emitWarningMessage("Unpacking zip file. Loading...", 60000);
					window.LITHO3D.loadZip(files[0])
						.then(result => {
							this.setState({
								surfaceList: [],
								model_uri: "",
								model_def_uri: ""
							}, () => {
								this.setState({
									surfaceList: result.surfaceList,
									color: result.color,
									viewDisplay: result.viewMode,
									uploadedModel: result.model_url,
									model_type: result.model_type,
									model_uri: result.model_url,
									model_def_uri: result.model_def_url
								}, () => {
									this.props.loadingToggle(false);
									this.emitWarningMessage("Model loading complete.", 500);
								})
									
							});
						})
						.catch(err => {
							if (this.refs.upload) this.refs.upload.setState({ files: [] });
							this.emitWarningMessage(err.message);
							this.props.loadingToggle(false);
							this.setState({ isUploadDialogOpen: true });
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

	emitWarningMessage(message, duration = 5000) {
		this.setState({ snackbarOpen: false, snackbarMsg: "", snackbarDuration: 0 },
			() => { this.setState({ snackbarOpen: true, snackbarMsg: message, snackbarDuration: duration }) });
	}
	handleSnackbarClose(event, reason) {
		if (reason === 'clickaway') { return; }
		this.setState({ snackbarOpen: false, snackbarMsg: "", snackbarDuration: 0 });
	}

	/** Change currently selected toolbar menu/tab */
	handleMenuChange = panel => (event, isExpanded) => {
		this.setState({ expandedMenu: isExpanded ? panel : false });
		this.props.openFunction();
	};

	/** Process the change of viewer mode */
	handleViewCheck(event) {
		var mode = event.target.value;
		if (this.state.viewDisplay !== mode) {
			this.props.loadingToggle(true);
			if (window.LITHO3D.changeViewMode(mode)) {
				this.setState({ viewDisplay: mode }, this.props.loadingToggle(false));
			}
			else {
				this.emitWarningMessage("No model is available.");
				this.props.loadingToggle(false);
			}
		}
	};

	/** Process the change of model color */
	handleColorChange = (color, event) => {
		if (this.state.color !== color.hex) {
			if(this.props.isMobile)
				this.props.warningFunc("Changing model color...", 10000);
			this.props.loadingToggle(true);
			if (window.LITHO3D.colorize(color.hex)) {
				this.setState({ color: color.hex });
				this.props.loadingToggle(false);
				if(this.props.isMobile)
					this.props.warningFunc("New model color was set.", 500);
			}
			else {
				this.emitWarningMessage("No model is available to color.");
				this.props.loadingToggle(false);
			}
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
								accepts={['.obj', '.glb', '.7z']}
								multiple={false}
								maxFiles={1}
								maxFileSize={100000000}
								minFileSize={0}
								ref='upload'
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
						autoHideDuration={this.state.snackbarDuration}
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

					{/* MENU HEADER */}
					{window.LITHO3D.isMobile ?
						<div style={styles.toolbar}>
							<IconButton onClick={this.props.openToggle}>
								{this.props.open ? <ChevronRightIcon /> : <MenuIcon />}
							</IconButton>
						</div> : null}


					{/* UPLOAD MENU */}
					{this.state.isUpload ? <React.Fragment>
						<ExpansionPanel elevation={window.LITHO3D.isMobile ? 0 : 1} style={styles.mobileTransparent} expanded={this.props.open && (this.state.expandedMenu === 'upload')} onChange={this.handleMenuChange('upload')} TransitionProps={{ unmountOnExit: true }}>
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
					<ExpansionPanel elevation={window.LITHO3D.isMobile ? 0 : 1} style={styles.mobileTransparent} expanded={this.props.open && (this.state.expandedMenu === 'color')} onChange={this.handleMenuChange('color')} TransitionProps={{ unmountOnExit: true }}>
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
					<ExpansionPanel elevation={window.LITHO3D.isMobile ? 0 : 1} style={styles.mobileTransparent} expanded={this.props.open && (this.state.expandedMenu === 'surfaces')} onChange={this.handleMenuChange('surfaces')}>
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
								isUpload={this.state.uploadedModel !== null}
								model_def_uri={this.state.model_def_uri}
								surfaces={this.state.surfaceList}
								warningFunc={this.emitWarningMessage}
							/>
						</ExpansionPanelDetails>
					</ExpansionPanel>


					{/* OPTIONS MENU */}
					<ExpansionPanel elevation={window.LITHO3D.isMobile ? 0 : 1} style={styles.mobileTransparent} expanded={this.props.open && (this.state.expandedMenu === 'options')} onChange={this.handleMenuChange('options')} TransitionProps={{ unmountOnExit: true }}>
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
					<ExpansionPanel elevation={window.LITHO3D.isMobile ? 0 : 1} style={styles.mobileTransparent} expanded={this.props.open && (this.state.expandedMenu === 'help')} onChange={this.handleMenuChange('help')} TransitionProps={{ unmountOnExit: true }}>
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
					{this.state.isUpload ? <React.Fragment>
						<ExpansionPanel elevation={window.LITHO3D.isMobile ? 0 : 1} style={styles.mobileTransparent} expanded={this.props.open && (this.state.expandedMenu === 'download')} onChange={this.handleMenuChange('download')} TransitionProps={{ unmountOnExit: true }}>
							<ExpansionPanelSummary
								expandIcon={this.props.open ? <ExpandMoreIcon /> : null}
								aria-controls="panel1a-content"
								id="panel1a-header"
							>
								{this.props.open ? <React.Fragment><ListItemIcon><CloudDownloadIcon /></ListItemIcon><Typography>Download Model</Typography></React.Fragment> :
									<Box ml={3}><ListItemIcon><CloudDownloadIcon /></ListItemIcon></Box>}
							</ExpansionPanelSummary>
							<ExpansionPanelDetails>
								<Box display="flex" flexWrap="wrap">
									<Box display="flex" flexWrap="wrap">
										<Box>
											<Button onClick={this.downloadModelOBJ} color="primary">Download OBJ</Button>
										</Box>
										<Box>
											<Button onClick={this.downloadModelGLB} color="primary">Download GLTF</Button>
										</Box>
										<Box>
											<Button onClick={this.downloadModelSTL} color="primary">Download STL</Button>
										</Box>
										<Box>
											<Button onClick={this.downloadJSON} color="primary">Download JSON</Button>
										</Box>
									</Box>
									<Box>
										<Button onClick={this.downloadZip} color="primary">Download ZIP</Button>
									</Box>
								</Box>
							</ExpansionPanelDetails>
						</ExpansionPanel></React.Fragment> : null}

				</div>
			</div>
		);
	}
}
