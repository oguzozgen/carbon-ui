import IconFinderApi from "./IconFinderApi";
import IconsActions, { IconsAction } from "./IconsActions";
import CarbonActions, { CarbonAction } from "../../CarbonActions";
import { handles, CarbonStore, dispatch, dispatchAction } from '../../CarbonFlux';
import { Image, Brush, ContentSizing, ArtboardType, UIElementFlags, IconSetSpriteManager, PatchType, app } from "carbon-core";
import Toolbox from "../Toolbox";
import { StencilInfo } from "../stencils/StencilsActions";

var key = 0;

interface InternalIconInfo {
    pageId: string
    artboard: any;
    element: any;
}

export type InternalIconsStoreState = {
    iconSets: any[],
    version: number,
    config: any,
    changedId: string | null,
    activeCategory: any,
    lastScrolledCategory: any
}

export class InternalIconsStore extends CarbonStore<InternalIconsStoreState>{
    private updating: boolean;

    constructor() {
        super();

        this.state = {
            iconSets: [],
            version: -1,
            config: null,
            changedId: null,
            lastScrolledCategory: null,
            activeCategory: null
        };
    }

    createElement(info: StencilInfo) {
        var element = new Image();

        element.setProps({
            width: info.templateWidth ? parseFloat(info.templateWidth) : 46,
            height: info.templateHeight ? parseFloat(info.templateHeight) : 46,
            source: Image.createElementSource(info.templatePid, info.templateAid, info.templateId)
        });

        return element;
    }

    @handles(CarbonActions.pageAdded)
    onPageAdded({ page }) {
        var iconSetArtboards = page.getAllResourceArtboards(ArtboardType.IconSet);
        var iconSets = this.state.iconSets.slice();
        for (var i = 0; i < iconSetArtboards.length; ++i) {
            iconSets.push(this._buildIconSet(iconSetArtboards[i]));
        }

        if (this.state.iconSets.length !== iconSets.length) {
            this.setState({ iconSets: iconSets });
        }
    }

    _buildIconSet(artboard) {
        var iconSet = {
            pageId: artboard.parent().id(),
            artboard: artboard,
            elements: [],
            version: artboard.version
        }
        var elements = iconSet.elements;
        artboard.applyVisitor(e => {
            if (e.hasFlags(UIElementFlags.Icon)) {
                elements.unshift(e);
            }
        })

        return iconSet;
    }


    buildIconGroup(groups, set) {
        let elements = set.elements;
        let artboard = set.artboard;

        var group = {
            name: artboard.name(),
            items: [],
            spriteUrl: null,
            spriteUrl2x: null,
            size: null
        }
        var parent = artboard.parent();
        if (!parent) {
            return;
        }

        var data = parent.getArrayPropValue("iconSpriteCache", artboard.id());

        groups.push(group);

        var props = set.artboard.props;

        var promise;
        if (data) {
            promise = Promise.resolve({
                spriteUrl: data.u,
                spriteUrl2x: data.u2,
                size: { width: data.w, height: data.h }
            })
        } else {
            promise = IconSetSpriteManager.getSpriteForIconSet(set.artboard, 32).then(data => {
                parent.patchProps(PatchType.Remove, "iconSpriteCache", {
                    id: artboard.id()
                });

                parent.patchProps(PatchType.Insert, "iconSpriteCache", {
                    u: data.spriteUrl,
                    u2: data.spriteUrl2x,
                    w: data.size.width,
                    h: data.size.height,
                    id: artboard.id()
                });

                return data;
            })
        }

        return promise.then(data => {
            var x = 0;
            group.spriteUrl = data.spriteUrl;
            group.spriteUrl2x = data.spriteUrl2x;
            group.size = data.size;

            for (let e of elements) {
                group.items.push({
                    "id": e.id(),
                    "type": InternalIconsStore.StoreType,
                    "pageId": set.pageId,
                    "artboardId": set.artboard.id(),
                    "realHeight": e.height(),
                    "realWidth": e.width(),
                    "spriteMap": [
                        x,
                        0,
                        32,
                        32
                    ],
                    title: e.name()
                });
                x += 32;
            }
        });
    }

    generateConfig() {
        var iconSets = this.state.iconSets;
        if (!iconSets.length) {
            return;
        }

        var config = {
            groups: [],
            id: ''
        };
        var promises = [];
        for (var set of iconSets) {
            promises.push(this.buildIconGroup(config.groups, set));
        }

        Promise.all(promises)
            .then(() => dispatchAction({ type: "Icons_Loaded", config, iconSets, async: true }));
    }

    onUpdated() {
        var iconSetArtboards = app.getAllResourceArtboards(ArtboardType.IconSet);
        var iconSets = [];
        for (var i = 0; i < iconSetArtboards.length; ++i) {
            iconSets.push(this._buildIconSet(iconSetArtboards[i]));
        }
        this.setState({ iconSets: iconSets });

        this.generateConfig();
    }

    private onLoaded(config) {
        let activeCategory = null;
        if (config.groups.length) {
            activeCategory = config.groups[0];
        }

        this.setState({ config, activeCategory });
    }

    private onCategoryClicked(category) {
        this.setState({ activeCategory: category, lastScrolledCategory: category });
    }
    private onScrolledToCategory(category) {
        this.setState({ activeCategory: category });
    }

    onAction(action: CarbonAction | IconsAction) {
        super.onAction(action);

        switch (action.type) {
            case "Carbon_AppUpdated":
                this.onUpdated();
                return;
            case "Icons_Loaded":
                if (action.iconSets === this.state.iconSets) {
                    this.onLoaded(action.config);
                }
                return;
            case "Carbon_ResourceChanged":
                this.onResourceChanged(action.resourceType, action.resource);
                return;
            case "Carbon_ResourceDeleted":
                this.onIconSetDeleted(action.resourceType, action.resource);
                return;
            case "Icons_ClickedCategory":
                this.onCategoryClicked(action.category);
                return;
            case "Icons_ScrolledToCategory":
                this.onScrolledToCategory(action.category);
                return;
        }
    }

    onResourceChanged(resourceType, element) {
        if (this.updating) {
            return;
        }

        if (resourceType !== ArtboardType.IconSet) {
            return;
        }

        this.updating = true;

        var iconSets = this.state.iconSets.slice();
        let iconSet = this._buildIconSet(element);

        element.parent().patchProps(PatchType.Remove, "iconSpriteCache", {
            id: element.id()
        });

        let inserted = false;
        for (var i = 0; i < iconSets.length; ++i) {
            if (iconSets[i].artboard === element) {
                iconSets[i] = iconSet;
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            iconSets.push(iconSet);
        }

        this.setState({ iconSets: iconSets });
        this.updating = false;
    }

    onIconSetDeleted(resourceType, element) {
        if (resourceType !== ArtboardType.IconSet) {
            return;
        }

        let iconSets = this.state.iconSets.slice();
        var index = iconSets.findIndex(p => p.id === element.id());
        if (index !== -1) {
            iconSets.splice(index, 1);
            this.setState({ iconSets: iconSets });
        }
    }

    static StoreType = "internalIcons";
}

export default Toolbox.registerStore(InternalIconsStore.StoreType, new InternalIconsStore());

