import * as React from "react";
import * as PropTypes from "prop-types";
import { listenTo, Component, handles, dispatch, ComponentWithImmutableState } from "../CarbonFlux";
import styled from "styled-components";
import { app, Selection, ISelectComposite } from "carbon-core";
import { FormattedMessage, defineMessages } from 'react-intl';
import * as cx from "classnames";
import appStore from "../AppStore";
import theme from "../theme";
import icons from "../theme-icons";
import IconButton from "../components/IconButton";
import ZoomBar from "./zoomBar";
import FlyoutButton from "../shared/FlyoutButton";
import CarbonActions, { CarbonAction } from "../CarbonActions";
import LinkButton from "../components/LinkButton";
import ActionLinkButton from "../components/ActionLinkButton";
import { FlyoutBody, HorizontalGroup, VerticalGroup } from "../components/CommonStyle";
import FlyoutHeader from "../components/FlyoutHeader";
import TextInput from "../components/TextInput";
import MainButton from "../components/MainButton";
import Slider from "../components/Slider";
import RepeatDropButton from "./RepeateDropButton";
import { Record } from "immutable";

interface IActionHeaderProps extends IReactElementProps {

}

interface IActionHeaderState {
    data: any;
}

const State = Record({
    selection: null,
    activeMode: null
})


export default class ActionHeader extends ComponentWithImmutableState<IActionHeaderProps, IActionHeaderState> {
    static contextTypes = {
        router: PropTypes.any,
        intl: PropTypes.object
    }

    constructor(props) {
        super(props);

        this.state = {
            data: new State({
                selection: Selection.selectComposite().elements
            })
        };
    }

    canHandleActions() {
        return true;
    }

    onAction(action: CarbonAction) {
        switch (action.type) {
            case "Carbon_Selection":
                this.onElementSelected();
                return;
        }
    }

    @listenTo(appStore)
    onChange() {
        this.mergeStateData({
            activeMode: appStore.state.activeMode
        });
    }

    onElementSelected() {
        this.mergeStateData({
            selection: Selection.selectComposite().elements
        });
    }

    undoAction() {
        app.actionManager.invoke("undo");
    }

    redoAction() {
        app.actionManager.invoke("redo");
    }

    pathUnion() {
        app.actionManager.invoke("pathUnion");
    }

    pathIntersect() {
        app.actionManager.invoke("pathIntersect");
    }

    pathDifference() {
        app.actionManager.invoke("pathDifference");
    }

    pathSubtract() {
        app.actionManager.invoke("pathSubtract");
    }

    render() {
        var hasSelection = this.state.data.selection.length > 0;

        if (this.state.data.activeMode === "prototype") {
            return <ActionHeaderComponent>

                <ZoomBar />
            </ActionHeaderComponent>;
        } else {
            return <ActionHeaderComponent>
                <IconButton icon={icons.undo} width={46} height={46} onClick={this.undoAction} />
                <IconButton icon={icons.redo} width={46} height={46} onClick={this.redoAction} />

                <RepeatDropButton />
                <FlyoutButton
                    position={{ targetVertical: "bottom", targetHorizontal: "center" }}
                    renderContent={() =>
                        <IconButton icon={icons.symbols_small} width={46} height={46} title="@symbol.menu" />
                    }>
                    <FlyoutBody>
                        <FlyoutHeader icon={icons.symbols_small} label="@symbols" />
                        <VerticalGroup>
                            <ActionLinkButton id="symbols.create" />
                            <ActionLinkButton id="symbols.markAsText" />
                            <ActionLinkButton id="symbols.markAsBackground" />
                            <ActionLinkButton id="symbols.editMaster" />
                            <ActionLinkButton id="symbols.detach" />
                        </VerticalGroup>
                    </FlyoutBody>
                </FlyoutButton>
                <FlyoutButton
                    position={{ targetVertical: "bottom", targetHorizontal: "center" }}
                    renderContent={() =>
                        <IconButton icon={icons.m_arrange} width={46} height={46} title="@arrange.menu" />
                    }>
                    <FlyoutBody>
                        <FlyoutHeader icon={icons.m_arrange} label="@arrange" />
                        <VerticalGroup>
                            <ActionLinkButton id="bringToFront" />
                            <ActionLinkButton id="sendToBack" />
                            <ActionLinkButton id="bringForward" />
                            <ActionLinkButton id="sendBackward" />
                        </VerticalGroup>
                    </FlyoutBody>
                </FlyoutButton>
                <FlyoutButton
                    position={{ targetVertical: "bottom", targetHorizontal: "center" }}
                    renderContent={() =>
                        <IconButton icon={icons.m_pathop} width={46} height={46} />
                    }>
                    <FlyoutBody>
                        <FlyoutHeader icon={icons.m_pathop} label="@path.operations" />
                        <HorizontalGroup>
                            <IconButton icon={icons.path_union} width={46} height={46} onClick={this.pathUnion} />
                            <IconButton icon={icons.path_intersect} width={46} height={46} onClick={this.pathIntersect} />
                            <IconButton icon={icons.path_difference} width={46} height={46} onClick={this.pathDifference} />
                            <IconButton icon={icons.path_subtract} width={46} height={46} onClick={this.pathSubtract} />
                        </HorizontalGroup>
                        <VerticalGroup>
                            <ActionLinkButton id="pathFlatten" />
                            <ActionLinkButton id="convertToPath" />
                        </VerticalGroup>
                    </FlyoutBody>
                </FlyoutButton>

                <FlyoutButton
                    position={{ targetVertical: "bottom", targetHorizontal: "center" }}
                    renderContent={() =>
                        <IconButton icon={icons.m_group} width={46} height={46} title="@group.menu" />
                    }>
                    <FlyoutBody>
                        <FlyoutHeader icon={icons.m_group} label="@group.operations" />
                        <VerticalGroup>
                            <ActionLinkButton id="group" />
                            <ActionLinkButton id="ungroup" />
                            <ActionLinkButton id="group.mask" />
                            <ActionLinkButton id="group.vstack" />
                            <ActionLinkButton id="group.hstack" />
                            <ActionLinkButton id="group.canvas" />
                        </VerticalGroup>
                    </FlyoutBody>
                </FlyoutButton>
                <ZoomBar />
            </ActionHeaderComponent>;
        }
    }
}

const ActionHeaderComponent = styled.div`
    white-space: nowrap;
    padding: 0 10px;
    position: relative;
    display: flex;
    height:100%;
    width:100%;
    justify-content:flex-end;
`;


