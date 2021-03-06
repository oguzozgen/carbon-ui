import * as React from "react";
import * as cx from "classnames";
import * as Immutable from "immutable";

import EditorComponent from "../EditorComponent";
import ArtboardSelector from "./ArtboardSelector";

import {app} from "carbon-core";

function actionProperty(action) {
    return Immutable.Map({
        name: "actions",
        displayName: "Page Link",
        value: action.artboardId,
        options: {
            items: app.activePage.getAllArtboards().map(a=> {
                return {name: a.name, value:a.id}
            })
        }
    });
}

export default class ActionsEditor extends EditorComponent<any, any> {
    render() {
        var p = this.props.p;
        var classes = cx("prop prop_actions");
        var actions = p.get('value') || [];
        return (<div className={classes}>
            {actions.map((a,i)=> {
                return <ArtboardSelector i={i}
                                         actions={actions}
                                         e={this.props.e}
                                         p={actionProperty(a)}
                                         key={"action"+i}
                                         />;
            })}
        </div>);
    }
}