import * as React from "react";
import * as Dropzone from "dropzone";

import { backend, IDisposable } from "carbon-core";
import { Component, listenTo, dispatch, dispatchAction } from "../../CarbonFlux";
import ImagesActions from "./ImagesActions";
import { FormattedMessage } from "react-intl";
import UserImagesStore, { UserImageStencil } from "./UserImagesStore";
import ImageUploadQueueStore from "./ImageUploadQueueStore";
import { UploadStatus } from "./ImageUploadQueueStore";
import ScrollContainer from "../../shared/ScrollContainer";
import DropzoneRegistry from "../../workspace/DropzoneRegistry";
import bem from "bem"
import VirtualList from "../../shared/collections/VirtualList";
import { Markup, MarkupLine } from "../../shared/ui/Markup";
import { UserImage, getUserImageHeight } from "./UserImage";
import styled from "styled-components";
import theme from "../../theme";

function b(a, b?, c?) { return bem("image-upload", a, b, c) }

type ImageList = new (props) => VirtualList<UserImageStencil>;
const ImageList = VirtualList as ImageList;

const upload_classnames = {
    previews_list: "image-upload__file-previews",
    preview: "image-upload__file-preview",
    name: "image-upload__file-name",
    status: "image-upload__file-status",
    remove: "image-upload__file-remove",
    message: "image-upload__message",
};

function nope(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    return false;
}

const FILESIZEBASE = 1000;

function filesize(size) { //borrowed from dropzone
    let cutoff, i, selectedSize, selectedUnit, unit, units, _i, _len;
    units = ['TB', 'GB', 'MB', 'KB', 'b'];
    selectedSize = selectedUnit = null;
    for (i = _i = 0, _len = units.length; _i < _len; i = ++_i) {
        unit = units[i];
        cutoff = Math.pow(FILESIZEBASE, 4 - i) / 10;
        if (size >= cutoff) {
            selectedSize = size / Math.pow(FILESIZEBASE, 4 - i);
            selectedUnit = unit;
            break;
        }
    }
    selectedSize = Math.round(10 * selectedSize) / 10;
    return selectedSize + "" + selectedUnit;
}

interface IUploadPreviewProps {
    file: any/*Immutable.Record.Instance<IQueueFile>*/
}
class UploadPreview extends Component<IUploadPreviewProps>{
    _onRemove = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const fileName = this.props.file.get('name');
        const dropzone = DropzoneRegistry.get(this.props.file.get("dropzoneType"))
        const file = dropzone.files.find(function (file) { return file.name === fileName });
        if (file) {
            dropzone.removeFile(file);
        }
        return false;
    };


    _renderState(status, progress) {
        var isInProgress = status === UploadStatus.uploading || status === UploadStatus.added;
        var isOk = isInProgress || status === UploadStatus.uploaded;
        var text_status = this.uploadStatusText(status);
        if (status === UploadStatus.uploaded) {
            text_status = 'done';
        }
        if (isInProgress) {
            return <span className={b("file-progress")}>{Math.round(progress) + '%'}</span>
        }
        else {
            return <span className={b("file-status")}>{text_status}</span>
        }
    }

    private uploadStatusText(status: UploadStatus) {
        switch (status) {
            case UploadStatus.added:
                return "added";
            case UploadStatus.uploading:
                return "uploading";
            case UploadStatus.uploaded:
                return "uploaded";
            case UploadStatus.hidden:
                return "hidden";
            case UploadStatus.failed:
                return "failed";
            case UploadStatus.removed:
                return "removed";
        }
        assertNever(status);
    }

    render() {
        var file = this.props.file;

        var name = file.get('name');
        var status = file.get('status');
        var isInProgress = status === UploadStatus.uploading || status === UploadStatus.added;
        var isOk = isInProgress || status === UploadStatus.uploaded;

        var progress = file.get('progress');
        var text_status = this.uploadStatusText(status);

        // var rendered_remove = <u className={b("file-remove", {visible: !status_is_ok})} onMouseUp={this._onRemove}>
        var removeText = null;
        switch (status) {
            case UploadStatus.added: removeText = "cancel"; break;
            case UploadStatus.uploading: removeText = "cancel"; break;
            case UploadStatus.uploaded: removeText = "hide"; break;
            case UploadStatus.failed: removeText = "remove"; break;
            case UploadStatus.hidden: break;
            case UploadStatus.removed: break;
        }

        var mods = {
            ok: isOk,
            'not-ok': !isOk,
            'done': status === UploadStatus.uploaded,
            'fail': status === UploadStatus.failed,
            'in-progress': isInProgress
        };

        var title = name + ", " + filesize(file.get('fileSize'));

        return <div
            className={b("file-preview", mods)}
            onMouseDown={nope}
            onMouseUp={nope}
            onClick={nope}
        >
            <div className={b("file-progressbar")}>
                <div className={b("file-progressbar-bg")}></div>
                <div className={b("file-progressbar-bar")} style={{ width: progress + '%' }}></div>
            </div>
            <div className={b("file-title")} title={title}>
                <div className={b("file-name")}>{name}</div>
            </div>
            <span className={b("file-state")}>{this._renderState(status, progress)}</span>
            <span className={b("file-remove")} onMouseUp={this._onRemove}>
                ×
                {removeText &&
                    <FormattedMessage tagName="u" id={removeText} defaultMessage={removeText} />
                }
            </span>
        </div>
    }
}

class UploadQueue extends Component<any, any>{

    render() {
        let list = null;
        if (this.props.list.size > 0) {
            const filtered_list = this.props.list;

            if (filtered_list.size > 0) {
                list = [];
                filtered_list.map((file) => {
                    list.unshift(<UploadPreview key={file.get('name')} file={file} />)
                })
            }
        }
        return <div className={upload_classnames.previews_list}>
            {list}
        </div>
    }
}

export default class UserImages extends Component<any, any>{
    private backendToken: IDisposable;

    dropzone: Dropzone;
    queueSize: number;
    refs: {
        container: HTMLElement;
        dropzone: HTMLElement;
        list: VirtualList<any>;
    }

    constructor(props) {
        super(props);
        var queue = ImageUploadQueueStore.getQueue();
        this.state = {
            images: [],
            queue,
            list_is_open: false,
            error: false
        };
        this.queueSize = queue.size;
    }

    @listenTo(UserImagesStore)
    onChange() {
        this.setState({ images: UserImagesStore.state.images, error: UserImagesStore.state.error });
    }

    @listenTo(ImageUploadQueueStore)
    onQueueChange() {
        var queue = ImageUploadQueueStore.getQueue();
        let newState: any = { queue };

        let list_is_open;
        if (queue.size > this.queueSize) {
            newState.list_is_open = true;
        }

        this.queueSize = queue.size;

        this.setState(newState);
    }

    private onClicked = (e) => {
        dispatchAction({ type: "Stencils_Clicked", e: { ctrlKey: e.ctrlKey, metaKey: e.metaKey, currentTarget: e.currentTarget }, stencil: { ...e.currentTarget.dataset } });
    }

    componentDidMount() {
        super.componentDidMount();
        this._setupDropzone();
        UserImagesStore.getImages();

        this.onQueueChange();
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        this.dropzone.destroy();

        if (this.backendToken) {
            this.backendToken.dispose();
            this.backendToken = null;
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.images !== this.state.images) {
            if (this.refs.list) {
                this.refs.list.reset();
            }
        }
    }

    _closeListOfUploads = (ev) => {
        this.setState({
            list_is_open: false,
        });
    }

    _toggleListOfUploads = (ev) => {
        this.setState({
            list_is_open: !this.state.list_is_open,
        });
    }

    _setupDropzone() {
        //todo handle the case when panel is closed while files are being uploaded
        var handlers = {
            addedfile: function (file: Dropzone.DropzoneFile) {
                dispatch(ImagesActions.queueAdded(file, "panel"));
            },
            uploadprogress: function (file: Dropzone.DropzoneFile, progress) {
                if (progress) {
                    dispatch(ImagesActions.queueProgress(file.name, progress));
                }
            },
            removedfile: function (file: Dropzone.DropzoneFile) {
                dispatch(ImagesActions.queueRemoved(file.name, "panel"));
            },
            success: function (file: Dropzone.DropzoneFile, response) {
                dispatch(ImagesActions.queueSucceeded(file.name));
                dispatch(ImagesActions.userImagesAdded(response.images));
            },
            queuecomplete: function () {
                dispatch(ImagesActions.queueComplete());
            },
            error: function (file: Dropzone.DropzoneFile) {
                dispatch(ImagesActions.queueFailed(file.name));
            }
        };

        const config = {
            init: function () {
                let eventName;
                for (eventName in handlers) {
                    if (handlers.hasOwnProperty(eventName)) {
                        this.on(eventName, handlers[eventName]);
                    }
                }
            },
            url: backend.servicesEndpoint + "/api/file/upload",
            headers: backend.getAuthorizationHeaders(),
            acceptedFiles: "image/*",
            params: { companyId: backend.getUserId() },
            createImageThumbnails: false,
            addRemoveLinks: false,
            uploadMultiple: true,
            clickable: ".library-page__upload .zone__upload",
            previewTemplate: '<div></div>',
            previewsContainer: ".library-page__upload .dz-previews"
        };

        (Dropzone as any).autoDiscover = false;
        this.dropzone = new Dropzone(this.refs.dropzone, config);
        DropzoneRegistry.register("panel", this.dropzone);

        this.backendToken = backend.accessTokenChanged.bind(() =>
            this.dropzone['options'].headers = backend.getAuthorizationHeaders());
    }

    private renderItem = (stencil: UserImageStencil) => {
        return <UserImage stencilType={UserImagesStore.storeType} stencil={stencil} onClicked={this.onClicked} />;
    }

    private renderError() {
        if (this.state.error) {
            return <Markup>
                <MarkupLine center>
                    <FormattedMessage tagName="p" id="@userImages.error" />
                </MarkupLine>
            </Markup>;
        }
        return null;
    }

    private renderList() {
        if (this.state.error) {
            return this.renderError();
        }
        if (this.state.images && this.state.images.length === 0) {
            return this.renderNoResults();
        }
        return <div className="user-images__list">
            <ImageList ref="list" data={this.state.images} rowHeight={getUserImageHeight} rowRenderer={this.renderItem} />
        </div>;
    }

    private renderNoResults() {
        return <Markup>
            <MarkupLine center>
                <FormattedMessage tagName="p" id="@images.noneFound" />
            </MarkupLine>
        </Markup>;
    }

    render() {
        const filteredQueue = this.state.queue.filter(function (file) {
            const status = file.get('status');
            return status !== UploadStatus.hidden &&
                status !== UploadStatus.removed
        });


        const filesInStatuses = {};
        this.state.queue.forEach(function (file) {
            const status = file.get('status');
            if (!filesInStatuses.hasOwnProperty(status)) {
                filesInStatuses[status] = 0;
            }
            filesInStatuses[status]++;
        });

        const uploaded = filesInStatuses[UploadStatus.uploaded] || 0;
        const failed = filesInStatuses[UploadStatus.failed] || 0;
        const progressbarMessage = uploaded + "/" + filteredQueue.size;
        const progressbarWidth = (uploaded + failed) / filteredQueue.size * 100 | 0;
        const progressbarMods = {
            success: failed === 0,
            error: failed !== 0
        };


        return <UserImagesContent>

            <div className="library-page__upload dropzone" ref="dropzone" >
                {this.renderList()}

                <div className={bem('zone', null, { "list-open": this.state.list_is_open })}>
                    {
                        filteredQueue.size > 0 && (
                            <div className="zone__list">
                                {this.state.list_is_open && (
                                    <ScrollContainer
                                        className="zone__list-body  thin dark vertical"
                                        ref="scroll_container"
                                    >
                                        <UploadQueue list={filteredQueue} />
                                    </ScrollContainer>
                                )}
                                <div className="zone__list-header">
                                    <FormattedMessage id="translateme!" defaultMessage="Files" />
                                    <div className="zone__list-header-closer" onClick={this._closeListOfUploads}><i /></div>
                                </div>
                            </div>)
                    }


                    <div className="zone__upload-block">
                        <div className="zone__upload">
                            <div className="image-upload__ico"><i className="ico-upload" /></div>
                            <p className={upload_classnames.message + " dz-message"}>
                                <FormattedMessage id="translateme!" defaultMessage="Click here to upload files" />
                            </p>
                        </div>

                        {
                            filteredQueue.size > 0 && (
                                <div className="zone__progress" onClick={this._toggleListOfUploads}>
                                    <div className={bem('zone', 'progress-bar', progressbarMods)} style={{ width: progressbarWidth + '%' }}></div>
                                    <p className="zone__progress-caption"> {progressbarMessage} </p>
                                    <div className="zone__list-arrow"></div>
                                </div>)
                        }
                    </div>


                    <div style={{ display: 'none' }}> <div className="dz-message"></div> <div className="dz-previews"></div> </div>
                </div>
            </div>
        </UserImagesContent>
    }
}

const UserImagesContent = styled.div`
    font:${theme.default_font};
    color:${theme.text_color};
`;
