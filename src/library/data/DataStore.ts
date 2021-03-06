import Toolbox from "../Toolbox";
import { handles, dispatch, CarbonStore } from "../../CarbonFlux";
import { app, IDataProvider } from "carbon-core";
import { IToolboxStore, StencilInfo, Stencil, ToolboxConfig, DataStencil } from "../LibraryDefs";
import { DataAction } from "./DataActions";
import BuiltInDataProvider from "./BuiltInDataProvider";

export type DataStoreState = {
    config: ToolboxConfig<DataStencil>;
    activeCategory: any;
    lastScrolledCategory: any;
}

export class DataStore extends CarbonStore<DataStoreState> implements IToolboxStore {
    storeType: string = "Data";

    private provider = new BuiltInDataProvider("builtin", "builtin");

    constructor() {
        super();

        app.dataManager.registerProvider("builtin", this.provider);

        let config = this.provider.getConfig();
        this.state = {
            config,
            activeCategory: config.groups[0],
            lastScrolledCategory: null
        }
    }

    findStencil(info: StencilInfo) {
        for (let i = 0; i < this.state.config.groups.length; ++i) {
            for (let j = 0; j < this.state.config.groups[i].items.length; ++j) {
                let stencil = this.state.config.groups[i].items[j];
                if (stencil.id === info.stencilId) {
                    return stencil;
                }
            }
        }
        return null;
    }

    createElement(stencil: Stencil){
        let templateId = stencil.id;
        var colon = templateId.indexOf(":");
        var providerId = templateId.substr(0, colon);
        var field = templateId.substr(colon + 1);

        return this.provider.createElement(app, field);
    }

    elementAdded(){
        app.dataManager.generateForSelection();
    }

    onAction(action: DataAction) {
        super.onAction(action);

        switch (action.type) {
            case "Data_ClickedCategory":
                this.onCategoryClicked(action.category);
                return;
            case "Data_ScrolledToCategory":
                this.onScrolledToCategory(action.category);
                return;
        }
    }

    private onCategoryClicked(category) {
        this.setState({ activeCategory: category, lastScrolledCategory: category });
    }
    private onScrolledToCategory(category) {
        this.setState({ activeCategory: category });
    }
}

export default Toolbox.registerStore(new DataStore());