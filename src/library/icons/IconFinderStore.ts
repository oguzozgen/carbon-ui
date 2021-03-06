import IconFinderApi from "./IconFinderApi";
import IconsActions, { IconsAction } from "./IconsActions";
import { handles, CarbonStore, dispatch, dispatchAction } from '../../CarbonFlux';
import { Image, Brush, ContentSizing, IPaginatedResult } from "carbon-core";
import Toolbox from "../Toolbox";
import { IToolboxStore, StencilInfo } from "../LibraryDefs";

export type IconFinderStoreState = {
    error: boolean;
    term: string;
    results: any[];
}

var key = 0;

export class IconFinderStore extends CarbonStore<IconFinderStoreState> implements IToolboxStore {
    storeType = "iconFinder";

    private api: any;
    private results: any[];

    constructor() {
        super();

        this.api = new IconFinderApi();

        this.state = {
            error: false,
            term: "",
            results: []
        };
        this.results = [];
    }

    findStencil(info: StencilInfo) {
        return this.state.results.find(x => x && x.id === info.stencilId);
    }
    createElement(stencil) {
        var element = new Image();
        element.setProps({
            width: stencil.realWidth, height: stencil.realHeight,
            source: stencil.url ? Image.createUrlSource(stencil.url) : Image.EmptySource,
            fill: Brush.Empty,
            sizing: ContentSizing.fit,
            sourceProps: {
                cors: true,
                svg: stencil.svg,
                urls: stencil.urls,
                width: stencil.realWidth,
                height: stencil.realHeight,
                cw: stencil.realWidth
            }
        });
        return element;
    }
    elementAdded() {
    }

    onAction(action: IconsAction) {
        super.onAction(action);

        switch (action.type) {
            case "Icons_WebSearch":
                if (action.q) {
                    this.setState({
                        term: action.q, error: false, results: []
                    });
                    this.results = [];
                }
                return;
            case "Icons_WebSearchResult":
                this.setState({results:action.result})
                return;
        }
    }

    runQuery(start: number, stop: number): Promise<IPaginatedResult<any>> {
        if (!this.state.term) {
            return Promise.reject(new Error("No iconfinder search term"));
        }
        return this.api.search(this.state.term, start, stop)
            .then(data => this.handleResults(data, start))
            .catch(e => {
                dispatch(IconsActions.iconFinderError());
                throw e;
            });
    }

    handleResults(data, start: number): IPaginatedResult<any> {
        var page = data.icons.map(x => {
            var largestSize = x.raster_sizes[x.raster_sizes.length - 1].size;
            var thumbUrl = null;
            var thumbSize = 128;
            for (var i = x.raster_sizes.length - 1; i >= 0; --i) {
                var raster = x.raster_sizes[i];
                if (raster.size <= 256) {
                    var format = raster.formats.find(x => x.format === "png");
                    if (format) {
                        thumbUrl = format.preview_url;
                    }
                    thumbSize = raster.size;
                    break;
                }
            }

            if (thumbUrl === null) {
                return this.notFound();
            }

            var sizeDesc = x.raster_sizes.length === 1 ? x.raster_sizes[0].size + "px" :
                x.raster_sizes[0].size + "px-" + largestSize + "px";

            var baseUrl = thumbUrl.substring(0, thumbUrl.lastIndexOf('/'));

            var icon: any = {
                id: x.icon_id + "", //sometimes the same icon is returned on different pages
                key: ++key+"",
                type: this.storeType,
                name: sizeDesc + ", " + x.tags.join(", "),
                url: thumbUrl,
                realWidth: thumbSize,
                realHeight: thumbSize,
                premium: x.is_premium,
                urls: {
                    raw: baseUrl,
                    links: x.raster_sizes
                        .filter(s => s.formats.find(f => f.format === "png"))
                        .map(s => {
                            return {
                                w: s.size,
                                url: s.formats.find(f => f.format === "png").preview_url.substring(baseUrl.length)
                            }
                        })
                }
            };

            if (!x.is_premium && x.type === "vector" && x.vector_sizes.length) {
                var svg = x.vector_sizes[0].formats.find(f => f.format === "svg");
                if (svg) {
                    icon.svg = IconFinderApi.Base + svg.download_url;
                }
            }

            return icon;
        });

        let results = this.results;
        for (let i = 0; i < page.length; ++i) {
            results[i + start] = page[i];
        }

        this.results = results;
        // this.setState({ results });
        dispatchAction({ type: "Icons_WebSearchResult", result: results, async:true });

        return {
            pageData: page,
            totalCount: data.total_count
        };
    }

    notFound() {
        return {
            id: ++key + "",
            type: this.storeType,
            name: "404 - Not Found",
            spriteUrl: "",
            realWidth: 50,
            realHeight: 50
        };
    }

    @handles(IconsActions.iconFinderError)
    handleError() {
        this.setState({ error: true });
    }
}

export default Toolbox.registerStore(new IconFinderStore());
