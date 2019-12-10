import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';

import List from '@material-ui/core/List';
import SurfaceListItem from './SurfaceListItem';

import Divider from '@material-ui/core/Divider';


const useStyles = makeStyles(theme => ({
	root: {
		width: '100%',
		height: '100%',
		overflow: 'hidden'
	},
	subroot: {
		width: '100%',
		height: '100%',
		overflow: 'auto',
		paddingRight: '20px'
	},
	root2: {
		width: '100%',
		backgroundColor: window.LITHO3D.isMobile ? "rgba(230,230,230,0)" : "rgba(255,255,255,1)",
		position: 'relative',
		maxHeight: 250,
	},
}));

export default function SurfaceList(props) {
	const classes = useStyles();

	const warningFunc = props.warningFunc;
	const [properties, setProperties] = useState(null);

	function hasProperty(surface, property) {
		return properties !== null && properties[surface.name] && properties[surface.name].hasOwnProperty(property);
	};

	/* Acquire surface properties JSON. These are used to control premade model default ranges and values. */
	useEffect(() => {
		if(props.model_def_uri && props.model_def_uri !== ""){
			fetch(props.model_def_uri)
			.then(response => response.json())
			.then(data => {
				setProperties(data);
			})
			.catch((error) => {
				warningFunc(error.message);
			});
		}
	}, [props.model_def_uri, warningFunc]);


	function defaultProperty(surface, property){
		var isMobile = window.LITHO3D.isMobile;

		switch(property){
			case "low":
				return isMobile ? surface.med - 2 : surface.med - 1;
			case "med":
				return isMobile ? surface.med - 1 : surface.med;
			case "high":
				return isMobile ? surface.med : surface.med + 1;
			case "ultra":
				return isMobile ? surface.med + 1 : surface.med + 2;
			case "min":
				return -10;
			case "max":
				return 10;
			default:
				return 0;
		}
	}

	return (
		<div className={classes.root}>
			<div className={classes.subroot+' hide-scrollbar'}>
				<List className={classes.root2}>
					<Divider />
					{props.surfaces.length > 0 ?
						props.surfaces.map((surface, index) => (
							props.isUpload || (hasProperty(surface, "exclude") && !properties[surface.name].exclude) ?
							<div key={`li-${index}-${surface.name}`}>
								<SurfaceListItem
									index={index}
									item={surface.name}
									isMobile={window.LITHO3D.isMobile}
									title={hasProperty(surface, "title") ? properties[surface.name].title : surface.name}
									low_res={hasProperty(surface, "low_div_rate") ? properties[surface.name].low_div_rate : defaultProperty(surface, "low")}
									med_res={hasProperty(surface, "med_div_rate") ? properties[surface.name].med_div_rate : defaultProperty(surface, "med")}
									high_res={hasProperty(surface, "high_div_rate") ? properties[surface.name].high_div_rate : defaultProperty(surface, "high")}
									ultra_res={hasProperty(surface, "ultra_div_rate") ? properties[surface.name].ultra_div_rate : defaultProperty(surface, "ultra")}
									min_ext={hasProperty(surface, "min_extrusion_rate") ? properties[surface.name].min_extrusion_rate : defaultProperty(surface, "min")}
									max_ext={hasProperty(surface, "max_extrusion_rate") ? properties[surface.name].max_extrusion_rate : defaultProperty(surface, "max")}
									def_ext={surface.extrusion ? surface.extrusion : null}
									def_res={surface.resolution ? surface.resolution : null}
									def_transX={surface.transX ? surface.transX : 0}
									def_transY={surface.transY ? surface.transY : 0}
									def_scaleX={surface.scaleX ? surface.scaleX : 1}
									def_scaleY={surface.scaleY ? surface.scaleY : 1}
									def_rotation={surface.rotation ? surface.rotation : 0}
									def_ref={surface.reference ? surface.reference : "positive"}
									def_state={surface.hasOwnProperty("state") ? surface.state : true}
									def_img_url={surface.img_url ? surface.img_url : null}
									loading={props.loading}
									warningFunc={props.warningFunc}
								/>
								<Divider />
							</div> : null
						)) :
						<div>No customizable surfaces were found.</div>}
				</List>
			</div>
		</div>
	);
}