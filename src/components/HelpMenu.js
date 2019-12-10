import React from 'react';

import Box from '@material-ui/core/Box';

import Button from '@material-ui/core/Button';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';


const styles = {
	helper: {
		textAlign: "left",
		display: "inline-block",
		whiteSpace: "pre-wrap",
		width: "100%",
		maxHeight: "250px",
		overflowY: 'auto',
		overflowX: "hidden"
	}
};

const helpSectionArray = [
{
    title: "What is this app?",
    text: [
        "This is an application that is capable of personalizing 3D models to your hearts content!",
        "Use the toolbar to the right to change settings and upload images, these will be used to manipulate the model's appearance."
    ]
},
{
    title: "How do I select a model?",
    text: [
        'Outside of default models, you can change the current model on scene via the "Change Models" tab.',
        'Pressing the option will bring a prompt to upload a new 3D model. Supported formats are; "OBJ" and "GLB". Maximum file size is 100MB',
        'You can also upload ZIP files containing the necessary data to recreate the model and changes, these are supplied by the application in the "Download Models" menu, where you can also acquire your final model.',
        "[NOTE: This will likely not be accessible to the user buying a product, the PREMADE configuration will give them a single default model that is assigned to each product.]"

    ]
},
{
    title: "How do I change the color of the model?",
    text: [
        'You can change colors by selecting the "Color" tab in the toolbar.',
        "Selecting a colored square will change the color of the model to that respective color. You can also input an hexadecimal color value in the box to have access to a larger range of colors!"

    ]
},
{
    title: "How can I modify the model's appearance?",
    text: [
        'You can manipulate the appearance of each individual customizable surface in the "Edit Surfaces" tab of the toolbar.',
        "In this tab you can see all the surfaces (if any) that can be edited. Click or drag images to the squares with the add prompt in order to have that image imprinted on the surface!",
        'You can then change parameters of this imprinting via the menus assigned to each surface. "Move/Rotate" will allow you to change the positioning of the imprinting, while "Volume" will allow you to change the extrusion properties of the surface.',
        'Selecting "Clear" will allow you remove that image/imprinting, while the checkmark allows you to hide or show the changes. Hidden changes will not affect the final model mesh.'

    ]
},
{
    title: "What are these additional options?",
    text: [
        'In the "Settings" tab, you have options that affect the application\'s user experience, such as changing the viewing mode of the model. These do not affect the final product.'
    ]
}
];

export default function HelpMenu() {
    const [open, setOpen] = React.useState(false);
    const [title, setTitle] = React.useState("Title");
    const [text, setText] = React.useState([]);

    const handleClickOpen = (title, text)  => () => {
        setOpen(true);
        setTitle(title);
        setText(text);
    };

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                scroll="paper"
                aria-labelledby="scroll-dialog-title"
            >
                <DialogTitle id="scroll-dialog-title">{title}</DialogTitle>
                <DialogContent dividers={true}>
                        {text.map((paragraph, index) => (
                            <DialogContentText key={index}>
                                {paragraph}
                            </DialogContentText>
                        ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Box style={styles.helper}>
                {helpSectionArray.map((help, index) => (
                    <p key={index}><button type="button" className="buttonlink" onClick={handleClickOpen(help.title, help.text)}>{help.title}</button></p>
                ))}
            </Box>
        </>
    );
}