import * as React from "react";
import { Component } from "../CarbonFlux";
import { DialogAction } from "./DialogActions";
import DialogRegistry from "./DialogRegistry";

interface DialogState {
    visible: boolean;
    dialogComponent?: any;
    dialogArgs?: object;
}

export default class DialogContainer extends Component<{}, DialogState>{
    constructor(props) {
        super(props);
        this.state = {
            visible: false,
            dialogComponent: null,
            dialogArgs: null
        };
    }

    canHandleActions() {
        return true;
    }
    onAction(action: DialogAction) {
        switch (action.type) {
            case "Dialog_Show":
                this.setState({ visible: true, dialogComponent: DialogRegistry.getDialog(action.dialogType), dialogArgs: action.args });
                return;
            case "Dialog_Hide":
                this.setState({ visible: false, dialogComponent: null });
                return;
        }
    }

    render() {
        if (!this.state.visible) {
            return null;
        }
        return <div className="dialog-overlay">
            <this.state.dialogComponent {...this.state.dialogArgs} />
        </div>;
    }
}