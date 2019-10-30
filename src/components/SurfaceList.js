import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';

import Divider from '@material-ui/core/Divider';

import SurfaceListItem from './SurfaceListItem';

//import useMediaQuery from '@material-ui/core/useMediaQuery';

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
		paddingright: '20px'
	},
	root2: {
		width: '100%',
		backgroundColor: theme.palette.background.paper,
		position: 'relative',
		maxHeight: 250,
	},
}));

export default function SurfaceList(props) {
	const classes = useStyles();
	//const matches = useMediaQuery('(min-width:600px)');

	//const DEFAULT_PROP = matches ? [0,0,0,0,-50,50] : [0,0,0,0,-50,50];

	const [properties, setProperties] = useState("");

	function hasProperty(surface, property) {
		return properties !== "" && properties[surface.name][property];
	};

	/* Acquire surface properties JSON */
	useEffect(() => {
		var container = document.getElementById("root");
		container.hasAttribute('model_def_uri');
		if(properties === "" && container.hasAttribute('model_def_uri') && container.getAttribute('model_def_uri') !== "" 
				&& props.model_def_uri && props.model_def_uri !== ""){
			fetch(props.model_def_uri)
			.then(response => response.json())
			.then(data => {
				setProperties(data);
			})
			.catch((error) => {
				console.error(error);
			});
		}
	}, [props.model_def_uri, properties]);


	function defaultProperty(surface, property){
		var isMobile = window.isMobile;

		switch(property){
			case "low":
				return isMobile ? surface.med - 2 : surface.med - 1;
			case "med":
				return isMobile ? surface.med - 1 : surface.med;
			case "high":
				return isMobile ? surface.med : surface.med + 1;
			case "ultra":
				return isMobile ? surface.med + 1 : surface.med + 3;
			case "min":
				return -25;
			case "max":
				return 25;
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
							<div key={`li-${index}-${surface.name}`}>
								<SurfaceListItem
									index={index}
									item={surface.name}
									isMobile={window.isMobile}
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
									def_scaleX={surface.scaleX ? surface.scaleX : 100}
									def_scaleY={surface.scaleY ? surface.scaleY : 100}
									def_rotation={surface.rotation ? surface.rotation : 0}
									def_ref={surface.reference ? surface.reference : "positive"}
									def_state={surface.state ? surface.state : true}
									def_img_url={surface.img_url ? surface.img_url : null}
									loading={props.loading}
									warningFunc={props.warningFunc}
								/>
								<Divider />
							</div>
						)) :
						<div>No customizable surfaces were found.</div>}
				</List>
			</div>
		</div>
	);
}