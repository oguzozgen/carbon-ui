import dragAndDrop from "./DragAndDrop";
import { handles, CarbonStore, dispatch, dispatchAction } from "../CarbonFlux";
import { richApp } from '../RichApp';
import CarbonActions from "../CarbonActions";
import { StencilsAction } from "./StencilsActions";
import { app, Point, Symbol, Environment, Rect, IUIElement } from "carbon-core";
import { ImageSource, ImageSourceType, IPage, ILayer, ChangeMode, Selection, Matrix, workspace } from "carbon-core";
import { IToolboxStore, StencilInfo, StencilClickEvent, Stencil } from "./LibraryDefs";
import { nodeOffset, onCssTransitionEnd } from "../utils/domUtil";
import LessVars from "../styles/LessVars";

interface Interaction {
    dropElement: HTMLElement;

    dropPromise: Promise<void>;
    resolveDrop: () => void;
    rejectDrop: (reason?: any) => void;

    placeholder: IUIElement;
    stencilInfo: StencilInfo;
    stencil: Stencil;
}

interface ToolboxState {
}

export class Toolbox extends CarbonStore<ToolboxState>{
    private stores: { [name: string]: IToolboxStore };

    constructor() {
        super();
        this.stores = {};

        this.setupDragAndDrop();
    }

    registerStore<T extends IToolboxStore>(store: T): T {
        if (this.stores.hasOwnProperty("name")) {
            throw new Error("Store already registered: " + name);
        }
        this.stores[store.storeType] = store;
        return store;
    }

    onAction(action: StencilsAction) {
        super.onAction(action);

        switch (action.type) {
            case "Stencils_Clicked":
                this.clicked(action.e, action.stencil);
                return;
        }
    }

    clicked(e: StencilClickEvent, info: StencilInfo) {
        let stencil = this.findStencil(info);
        var element = this.elementFromTemplate(info, stencil);
        var scale = Environment.view.scale();
        var location = Environment.controller.choosePasteLocation([element], e.ctrlKey || e.metaKey);
        var w = element.boundaryRect().width;
        var h = element.boundaryRect().height;
        var x, y;

        if (location.parent.autoPositionChildren()) {
            var pos = location.parent.center(true);
            x = pos.x - w / 2;
            y = pos.y - h / 2;
        }
        else {
            x = location.x;
            y = location.y;
        }

        var p1 = nodeOffset(e.currentTarget);
        var p2 = Environment.view.pointToScreen({ x: x * scale, y: y * scale });
        var node = dragAndDrop.cloneNode(e.currentTarget);
        var nodeScaleX = w * scale/e.currentTarget.clientWidth;
        var nodeScaleY = h * scale/e.currentTarget.clientHeight;

        node.classList.add("stencil_animate");
        document.body.appendChild(node);
        //set attributes in the new cycle to kick off css animation
        setTimeout(() => {
            node.style.transform = `translateX(${p2.x - p1.left}px) translateY(${p2.y - p1.top}px) scale(${nodeScaleX}, ${nodeScaleY})`;
            node.style.opacity = ".2";
            onCssTransitionEnd(node, () => {
                document.body.removeChild(node);
                element.setTransform(Matrix.createTranslationMatrix(Math.round(x), Math.round(y)));
                Environment.controller.insertAndSelect([element], location.parent);
                this.onElementAdded(info, stencil);
            }, LessVars.stencilAnimationTime);
        }, 1);
    }

    onDragStart = (event, interaction: Interaction) => {
        interaction.stencilInfo = { ...event.target.dataset };
        interaction.stencil = this.findStencil(interaction.stencilInfo);
        var element = this.elementFromTemplate(interaction.stencilInfo, interaction.stencil);
        interaction.placeholder = element;
        interaction.dropPromise = new Promise<void>((resolve, reject) => {
            interaction.resolveDrop = resolve;
            interaction.rejectDrop = reject;
        });
    };
    onDragEnter = (event, interaction: Interaction) => {
        event.dragEnter.classList.add("dragover"); //#viewport
        Environment.controller.beginDragElements(event, [interaction.placeholder], interaction.dropPromise);
    };
    onDragLeave = (event, interaction: Interaction) => {
        event.dragLeave.classList.remove("dragover"); //#viewport
        (interaction.placeholder as any).runtimeProps.ctxl = 2;
        interaction.rejectDrop(event);
        interaction.dropPromise = new Promise<void>((resolve, reject) => {
            interaction.resolveDrop = resolve;
            interaction.rejectDrop = reject;
        });
        //analytics.event("Toolbox", "Drag-out", interaction.templateType + "/" + interaction.templateId);
    };
    onDrop = (event: MouseEvent, interaction: Interaction) => {
        Selection.makeSelection(Selection.previousElements);

        let eventData = Environment.controller.createEventData(event);

        interaction.dropElement.classList.remove("dragover"); //#viewport

        interaction.dropPromise.then(() => this.onElementAdded(interaction.stencilInfo, interaction.stencil));
        interaction.resolveDrop();

        //analytics.event("Toolbox", "Drag-drop", interaction.templateType + "/" + interaction.templateId);
    };

    elementFromTemplate(info: StencilInfo, stencil: Stencil) {
        var store = this.stores[info.stencilType];
        var element = store.createElement(stencil, info);

        if (!element.name()) {
            element.name(app.activePage.nameProvider.createNewName(stencil.title));
        }
        workspace.view.fitToViewportIfNeeded(element);

        return element;
    }

    private onElementAdded(info: StencilInfo, stencil: Stencil) {
        let store = this.stores[info.stencilType];
        store.elementAdded(stencil);

        dispatchAction({ type: "Stencils_Added", stencilType: info.stencilType, stencil, async: true });
    }

    private findStencil(info: StencilInfo) {
        var store = this.stores[info.stencilType];
        return store.findStencil(info);
    }

    private setupDragAndDrop() {
        dragAndDrop.setup({
            onDragStart: this.onDragStart,
            onDragEnter: this.onDragEnter,
            onDragLeave: this.onDragLeave,
            onDrop: this.onDrop
        });
    }
}

export default new Toolbox();
