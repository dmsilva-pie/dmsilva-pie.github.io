import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';

import Divider from '@material-ui/core/Divider';

import SurfaceListItem from './SurfaceListItem';

import useMediaQuery from '@material-ui/core/useMediaQuery';

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    backgroundColor: theme.palette.background.paper,
    position: 'relative',
    //overflow: 'scroll',
    maxHeight: 300,
  },
  listSection: {
    backgroundColor: 'inherit'
  },
  ul: {
    backgroundColor: 'inherit',
    padding: 0,
  },
}));

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

export default function SurfaceList(props) {
	const classes = useStyles();
	const matches = useMediaQuery('(min-width:600px)');

	return (
		<div style={styles.root}>
		<div style={styles.subroot} className='hide-scrollbar'>
		<List className={classes.root}>
				<Divider />
				{[...Array(props.model_props.face_number).keys()].map(item => (
				<div key={item}>
				  <SurfaceListItem 
					item={item}
					isMobile={!matches}
					title={props.model_props.faces[item].title}
					model_props={props.model_props}
					updateFunction={props.updateFunction} 
				  />
				  <Divider />
				</div>
				))}
		</List>
		</div>
		</div>
	  );
}