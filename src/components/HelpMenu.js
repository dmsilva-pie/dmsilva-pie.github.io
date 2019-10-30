import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Box from '@material-ui/core/Box';

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
        "This is an application that is capable of personalizing models to your hearts content!",
        "Use the toolbar to the right to change settings and upload images, these will be used to manipulate the model's appearance."
    ]
},
{
    title: "How do I change the color of the model?",
    text: [
        'You can change colors by selecting "Color > [Desired color square]" or "Color > [Input hex value]", in the right toolbar.'

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