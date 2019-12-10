import React from 'react';
import clsx from 'clsx';
import { makeStyles, useTheme } from '@material-ui/core/styles';

import { Swipeable } from 'react-swipeable';
import SwipeableDrawer from '@material-ui/core/SwipeableDrawer';

import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';

import OptionMenu from './OptionMenu';


//Width of the drawer/toolbar
const drawerWidth = 350;

const isMobile = window.LITHO3D.isMobile;

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginRight: 36,
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  drawerOpen: {
    width: drawerWidth,
    backgroundColor: isMobile ? "rgba(230,230,230,0)" : "rgba(255,255,255,1)",
    backgroundImage: isMobile ? "linear-gradient(to right, rgba(230,230,230,0.3), rgba(255,255,255,1) 85%)" : "linear-gradient(rgba(255,255,255,1), rgba(255,255,255,1))",
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerClose: {
    backgroundColor: isMobile ? "rgba(230,230,230,0)" : "rgba(255,255,255,1)",
    backgroundImage: isMobile ? "linear-gradient(to right, rgba(230,230,230,0.3), rgba(255,255,255,1) 85%)" : "linear-gradient(rgba(255,255,255,1), rgba(255,255,255,1))",
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    width: theme.spacing(7) + 1,
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing(7) + 1,
    },
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 8px',
    ...theme.mixins.toolbar,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
}));

export default function ToolbarMenu(props) {
  const theme = useTheme();
  const classes = useStyles(theme);
  const [open, setOpen] = React.useState(false);

  function handleDrawerOpen() {
    setOpen(true);
  }

  function handleDrawerClose() {
    setOpen(false);
  }

  function handleDrawerToggle() {
    setOpen(!open);
  }

  function handleSwipe(event){
    if(event.dir === "Left" && !open){
      handleDrawerOpen();
    }
    else if(event.dir === "Right" && open){
      handleDrawerClose();
    }
  }

  return (
    <React.Fragment>
      <Swipeable 
        onSwiping={handleSwipe}
        delta= {20}
      >
        <SwipeableDrawer
          variant="permanent"
          className={clsx(classes.drawer, {
            [classes.drawerOpen]: open,
            [classes.drawerClose]: !open,
          })}
          classes={{
            paper: clsx({
              [classes.drawerOpen]: open,
              [classes.drawerClose]: !open,
            }),
          }}
          onClose={handleDrawerClose}
          onOpen={handleDrawerOpen}
          PaperProps={{ style: { position: 'absolute' } }}
          BackdropProps={{ style: { position: 'absolute' } }}
          ModalProps={{
            container: document.getElementById('drawer-container'),
            style: { position: 'absolute' }
          }}
          open={open}
          anchor="right"
        >
          {!isMobile ? 
          <div className={classes.toolbar}>
            <IconButton onClick={handleDrawerToggle}>
              {open ? <ChevronRightIcon /> : <MenuIcon />}
            </IconButton>
          </div> : null}
          <OptionMenu open={open} openToggle={handleDrawerToggle} openFunction={handleDrawerOpen} loadingToggle={props.loadingFunction} />

        </SwipeableDrawer>
      </Swipeable>
    </React.Fragment>
  );
}