import velocity from "velocity-animate";
import dragAndDrop from "./DragAndDrop";
import {handles, CarbonStore, dispatch} from "../CarbonFlux";
import {richApp} from '../RichApp';
import CarbonActions from "../CarbonActions";
import { StencilsAction } from "./stencils/StencilsActions";
import { app, Symbol, Environment, Rect, IDropElementData, IKeyboardState, IUIElement } from "carbon-core";
import { ImageSource, ImageSourceType, IPage, ILayer } from "carbon-core";
import { IToolboxStore, StencilInfo } from "./LibraryDefs";

interface IInteraction {
    dropElement: HTMLElement;

    dropPromise: Promise<IDropElementData>;
    resolveDrop: (data: IDropElementData) => void;
    rejectDrop: (reason?: any) => void;

    templateType: string;
    templateId: string;
    placeholder: IUIElement;
    sourceId: string;
}

interface IToolboxState{
}

export class Toolbox extends CarbonStore<IToolboxState>{
    [name: string]: any;
    private stores: {[name: string]: IToolboxStore};

    constructor(){
        super();
        this.stores = {};

        this._setupDragAndDrop();
    }

    registerStore<T extends IToolboxStore>(store: T): T {
        if (this.stores.hasOwnProperty("name")){
            throw new Error("Store already registered: " + name);
        }
        this.stores[store.storeType] = store;
        return store;
    }

    onAction(action: StencilsAction) {
        super.onAction(action);

        switch (action.type) {
            case "Stencils_Clicked":
                this.clicked(action);
                return;
        }
    }

    clicked(info: StencilInfo){
        var element = this.elementFromTemplate(info);
        var scale = Environment.view.scale();
        var location = Environment.controller.choosePasteLocation([element], info.e.ctrlKey || info.e.metaKey);
        var w = element.boundaryRect().width;
        var h = element.boundaryRect().height;
        var x, y;

        if (location.parent.autoPositionChildren()){
            var pos = location.parent.center(true);
            x = pos.x - w/2;
            y = pos.y - h/2;
        }
        else{
            x = location.x;
            y = location.y;
        }

        var screenPoint = Environment.view.pointToScreen({x: x * scale, y: y * scale});
        var node = dragAndDrop.cloneNode(info.e.currentTarget);
        document.body.appendChild(node);
        velocity(node, {left: screenPoint.x, top: screenPoint.y, width: w*scale, height: h*scale, opacity: .1}, {
            duration: 500,
            easing: 'easeOutCubic',
            complete: () => {
                document.body.removeChild(node);

                Environment.controller.insertAndSelect([element], location.parent, x, y);
                this._onElementAdded(info.templateType);

                //analytics.event("Toolbox", "Single-click", templateId);
            }});
    }

    onDragStart = (event, interaction: IInteraction) => {
        var templateId = event.target.dataset.templateId;
        var templateType = event.target.dataset.templateType;
        var sourceId = event.target.dataset.sourceId;
        var pageId = event.target.dataset.templatePid;
        var artboardId = event.target.dataset.templateAid;
        interaction.templateType = templateType;
        interaction.templateId = templateId;
        interaction.sourceId = sourceId;
        var element = this.elementFromTemplate(event.target.dataset);
        interaction.placeholder = element;
        interaction.dropPromise = new Promise<IDropElementData>((resolve, reject) => {
            interaction.resolveDrop = resolve;
            interaction.rejectDrop = reject;
        });
    };
    onDragEnter = (event, interaction: IInteraction) => {
        event.dragEnter.classList.add("dragover"); //#viewport
        Environment.controller.beginDragElement(event, interaction.placeholder, interaction.dropPromise);
    };
    onDragLeave = (event, interaction: IInteraction) => {
        event.dragLeave.classList.remove("dragover"); //#viewport
        interaction.rejectDrop(event);
        interaction.dropPromise = new Promise((resolve, reject) => {
            interaction.resolveDrop = resolve;
            interaction.rejectDrop = reject;
        });
        //analytics.event("Toolbox", "Drag-out", interaction.templateType + "/" + interaction.templateId);
    };
    onDrop = (event: MouseEvent, interaction: IInteraction) => {
        interaction.dropElement.classList.remove("dragover"); //#viewport

        interaction.dropPromise.then(() => this._onElementAdded(interaction.templateType));
        interaction.resolveDrop({elements: [interaction.placeholder], e: event, keys: Environment.controller.keyboardStateFromEvent(event)});

        //analytics.event("Toolbox", "Drag-drop", interaction.templateType + "/" + interaction.templateId);
    };

    elementFromTemplate(data){
        var store = this.stores[data.templateType];
        var element = store.createElement(data);

        // switch (templateType){
        //     case "recentElement":
        //         templateConfig = window.richApp.recentStencilsStore.findById(templateId);
        //         element = UIElement.fromJSON(templateConfig.json);
        //         break;
        //     case "recentImage":
        //         templateConfig = window.richApp.recentImagesStore.findById(templateId);
        //         element = UIElement.fromJSON(templateConfig.json);
        //         break;
        // }

        app.assignNewName(element);
        this._fitToViewportIfNeeded(element);

        return element;
    }

    imageSourceToString(source: ImageSource) {
        switch (source.type) {
            case ImageSourceType.Font:
                return "font " + source.icon;
            case ImageSourceType.Url:
                return "url " + source.url;
            case ImageSourceType.Element:
                return "element " + source.elementId;
            case ImageSourceType.None:
                return "none";
        }
        assertNever(source);
    }

    _fitToViewportIfNeeded(element){
        var viewport = Environment.view.viewportRect();
        var bounds = new Rect(0, 0, viewport.width * .8, viewport.height * .8);
        var current = new Rect(0, 0, element.width(), element.height());
        var fit = current.fit(bounds, true);

        var artboard = Environment.view.page.getActiveArtboard();
        if (artboard){
            fit = fit.fit(artboard.boundaryRect(), true);
        }

        if (fit.width !== current.width || fit.height !== current.height){
            element.prepareAndSetProps({br: element.boundaryRect().withSize(Math.round(fit.width), Math.round(fit.height))});
        }
    }

    _onElementAdded(templateType){
        var store = this.stores[templateType];
        store.elementAdded();
    }

    private _setupDragAndDrop(){
        dragAndDrop.setup({
            onDragStart: this.onDragStart,
            onDragEnter: this.onDragEnter,
            onDragLeave: this.onDragLeave,
            onDrop: this.onDrop
        });
    }
}

export default new Toolbox();
