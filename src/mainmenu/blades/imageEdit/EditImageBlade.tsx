import * as React from "react";
import * as PropTypes from "prop-types";
import { Component } from "../../../CarbonFlux";
import ImageDropzone from "./ImageDropzone";
import { TabContainer, TabPage, TabArea } from "../../../shared/TabContainer";
import { GuiButtonBlock, GuiButtonedInput, GuiInput, GuiButton, GuiValidatedInput } from "../../../shared/ui/GuiComponents";
import { MarkupLine } from "../../../shared/ui/Markup";
import { say } from "../../../shared/Utils";
import separatorOr from "../../../shared/SeparatorOr";
import CropEditor from "./CropEditor";
import bem from "../../../utils/commonUtils";
import { IUIElement, IPage, IArtboard, app, IRect, backend, renderer } from "carbon-core";
import { FormattedMessage } from "react-intl";
import { ArtboardSelect } from "../../../shared/ui/GuiSelect";
import { BladeBody } from "../BladePage";
import { TabPageStyled } from "../../../components/CommonStyle";

export type EditImageResult =
    { type: "url", url: string } |
    { type: "dataUrl", dataUrl: string } |
    { type: "element", element: IUIElement } |
    { type: "none" };

interface IEditImageBladeProps {
    image?: string;
    dpr: number;
    previewSize: IRect;
    allowCropping?: boolean;
    defaultTab?: "crop" | "choose";
    page?: IPage;
    onComplete: (result?: string) => void;
}

interface IEditImageBladeState {
    tabId: string;
    image?: string;
    loading?: boolean;
}

function b(a, b?, c?) { return bem("edit-image", a, b, c) }

export default class EditImageBlade extends Component<IEditImageBladeProps, IEditImageBladeState> {
    refs: {
        dropzone: ImageDropzone;
        container: TabContainer;
        cropEditor: CropEditor;
        url: GuiValidatedInput;
    }

    constructor(props: IEditImageBladeProps) {
        super(props);

        let tabId = "2";
        if (props.defaultTab !== "choose" && props.allowCropping && props.image) {
            tabId = "1";
        }

        this.state = {
            tabId,
            image: props.image
        };
    }

    componentWillReceiveProps(nextProps: IEditImageBladeProps) {
        this.setState({ image: nextProps.image });
    }

    private changeTab(tab) {
        this.setState({ tabId: "1" });
    }

    private getArtboards() {
        if (this.props.page) {
            return this.props.page.getAllArtboards();
        }
        return app.getAllArtboards()
    }

    private artboardChosen = (artboard: IArtboard) => {
        this.saveImageOption({ type: "element", element: artboard });
    }

    private saveImageOption(result: EditImageResult) {
        //todo - also cancel current dropzone upload
        let image = this.getImageUrl(result);
        if (this.props.allowCropping) {
            this.setState({ tabId: "1", image: image || this.state.image });
        }
        else {
            this.props.onComplete(image);
        }
    }

    private getImageUrl(result: EditImageResult) {
        switch (result.type) {
            case "element":
                return renderer.elementToDataUrlScaled(result.element, this.props.previewSize, this.props.dpr);
            case "dataUrl":
                return result.dataUrl;
            case "url":
                return result.url;
            case "none":
                return null;
        }
        assertNever(result);
    }

    //——————————————————————————————————————————————————————————————————————
    // Tab 1 (Edit)
    //——————————————————————————————————————————————————————————————————————

    private saveCropped = () => {
        let dataUrl = this.refs.cropEditor.toDataUrl();
        backend.fileProxy.uploadPublicImage({content: dataUrl})
            .then(response => this.props.onComplete(response.url));
    };
    private changeImage = (ev) => {
        this.setState({ "tabId": "2" });
    };

    //——————————————————————————————————————————————————————————————————————
    // Tab 2 (upload)
    //——————————————————————————————————————————————————————————————————————

    private hideAllErrors = () => {
        //hiding error messages
        this.refs.dropzone.hideUploadError();
    };

    // Upload --------------------------
    onUploadSuccess = (url: string) => {
        this.saveImageOption({ type: "url", url });
    };

    private onUseUrl = (ev) => {
        if (this.state.loading) {
            return false;
        }

        var url = this.refs.url.getValue();
        if (!url) {
            return false;
        }

        this.setState({ loading: true });

        backend.fileProxy.uploadPublicImage({ content: url })
            .then(response => this.saveImageOption({ type: "url", url: response.url }))
            .catch(() => this.refs.url.setErrorLabel("@imageEdit.urlError"))
            .finally(() => this.setState({ loading: false }));

        return false;
    };

    private renderEditTab() {
        return <TabPageStyled tabId="1">
            <MarkupLine stretch>
                <CropEditor ref="cropEditor" image={this.state.image} dpr={this.props.dpr} size={this.props.previewSize} />
            </MarkupLine>

            <MarkupLine submit>
                <GuiButtonBlock mods="equal">
                    <GuiButton
                        onClick={this.saveCropped}
                        mods="submit"
                        caption="@saveImage"
                    />
                    <GuiButton
                        onClick={this.changeImage}
                        mods="hover-white"
                        caption="@changeImage"
                    />
                </GuiButtonBlock>
            </MarkupLine>
        </TabPageStyled>
    }

    private renderUploadTab() {
        var loading = this.state.loading;

        return <TabPageStyled tabId="2" className={b('upload-page', { loading })}>
            <MarkupLine className="edit-image__make-snapshot" onClick={this.hideAllErrors} stretch>
                <p className="edit-image__message">
                    <FormattedMessage id="@imageEdit.artboardSnapshot" />
                </p>

                <div className="gui-input">
                    <ArtboardSelect
                        className="drop_down"
                        caption="@chooseArtboard"
                        items={this.getArtboards()}
                        renderItem={artboard => <p>{artboard.name}</p>}
                        onSelect={this.artboardChosen}>
                    </ArtboardSelect>
                </div>
            </MarkupLine>

            <MarkupLine stretch>{separatorOr("or")}</MarkupLine>
            <MarkupLine stretch>
                <ImageDropzone
                    ref="dropzone"
                    onSuccess={this.onUploadSuccess}
                />
            </MarkupLine>

            <MarkupLine stretch>{separatorOr("or")}</MarkupLine>

            <MarkupLine stretch className="edit-image__paste-url" onClick={this.hideAllErrors}>
                <p className="edit-image__message">
                    <FormattedMessage id="@imageEdit.pasteUrl" />
                </p>

                <GuiButtonedInput className="edit-image__paste-url-input">
                    <GuiValidatedInput ref="url" placeholder="http://example.com/image.png" onKeyDown={e => e.key === 'Enter' && this.onUseUrl(e)}/>
                    <GuiButton
                        icon="ok-white"
                        mods={[
                            loading ? "spinning" : "hover-success",
                            "square"
                        ]}
                        onClick={this.onUseUrl}
                    />
                </GuiButtonedInput>
            </MarkupLine>

            {(this.state.image || !this.props.allowCropping) &&
                <MarkupLine submit>
                    <GuiButton
                        mods="hover-cancel"
                        onClick={() => this.saveImageOption({ type: "none" })}
                        caption="@cancel"
                    />
                </MarkupLine>
            }
        </TabPageStyled>
    }

    render() {
        return <BladeBody>
            <div className="edit-image">
                <TabContainer currentTabId={this.state.tabId} type="normal" ref="container">
                    <TabArea className="gui-pages">
                        {this.renderEditTab()}
                        {this.renderUploadTab()}
                    </TabArea>
                </TabContainer>
            </div>
        </BladeBody>
    }

    static contextTypes = {
        intl: PropTypes.object,
        bladeContainer: PropTypes.any
    }
}