import {Store} from 'flux/utils';
import * as invariant from 'invariant';
import {Dispatcher as FluxDispatcher} from 'flux';
import {Record} from 'immutable';
import * as React from "react";
import * as PropTypes from "prop-types";
import shallowCompare from 'react-addons-shallow-compare';
import { FormattedMessage } from 'react-intl';
import { AccountAction } from "./account/AccountActions";
import { BackendAction } from "./BackendActions";
import { DialogAction } from "./dialogs/DialogActions";
import { PublishAction } from "./mainmenu/blades/resources/PublishActions";
import { StencilsAction } from "./library/StencilsActions";
import { SymbolsAction } from "./library/symbols/SymbolsActions";
import { CarbonAction } from "./CarbonActions";
import { IconsAction } from "./library/icons/IconsActions";
import { LayoutAction } from "./layout/LayoutActions";
import { DataAction } from "./library/data/DataActions";
import { FontAction } from "./properties/editors/custom/FontActions";
import { LayerAction } from "./layers/LayersActions";
import { PropertyAction } from "./properties/PropertyActions";
import { LibraryAction } from "./library/LibraryActions";
import { ImagesAction } from "./library/images/ImagesActions";
import { SwatchesAction } from "./properties/SwatchesActions";
import { WorkspaceAction } from "./workspace/WorkspaceAction";

// import diff from 'immutablediff';


/**
 * Purified React.Component. Goodness.
 * http://facebook.github.io/react/docs/advanced-performance.html
 */
export class Component<P = {}, S = {}> extends React.PureComponent<P,S> {
    protected mounted = false;

    static contextTypes = {
        intl: PropTypes.object
    };

    constructor(props, context?) {
        super(props, context);
    }

    __storeListeners: any[];
    _dispatchToken: any;
    __handlersMap: any;

    componentDidMount() {
        this.mounted = true;
        var listenTo = this.__storeListeners;
        if (listenTo) {
            for (var i = 0; i < listenTo.length; ++i) {
                var listen = listenTo[i];
                var handler = this[listen.name].bind(this);
                listen.subscription = listen.store.addListener(handler);
                handler();
            }
        }
        if (this.__handlersMap || this.canHandleActions()){
            this._dispatchToken = Dispatcher.register(action => this.onAction(action));
        }
    }

    componentDidUpdate(prevProps, prevState) {
    }

    componentWillUnmount() {
        this.mounted = false;
        var listenTo = this.__storeListeners;
        if (listenTo) {
            for (var i = 0; i < listenTo.length; ++i) {
                var listen = listenTo[i];
                if (listen.subscription) {
                    listen.subscription.remove();
                    delete listen.subscription;
                }
            }
        }
        if (this._dispatchToken){
            Dispatcher.unregister(this._dispatchToken);
        }
    }

    canHandleActions(): boolean{
        return false;
    }

    onAction(action){
        var handler = this.__handlersMap && this.__handlersMap[action.type];
        if (handler){
            this[handler](action);
        }
    }

    formatLabel(labelId: string, defaultMessage?: string){
        return this.context.intl.formatMessage({id: labelId, defaultMessage});
    }

    // // Helper to check which component was changed and why.
    // _logShouldUpdateComponents(nextProps, nextState) {
    //   const name = this.constructor.displayName || this.constructor.name
    //   console.log(`${name} shouldUpdate`)
    //   // const propsDiff = diff(this.props, nextProps).toJS()
    //   // const stateDiff = diff(this.state, nextState).toJS()
    //   // if (propsDiff.length) console.log('props', propsDiff)
    //   // if (stateDiff.length) console.log('state', stateDiff)
    // }
}

export class StoreComponent<TProps, TStoreState> extends Component<TProps, TStoreState> {
    private subscription = null;

    constructor(props: TProps, protected store: CarbonStore<TStoreState>) {
        super(props);
        this.state = store.state;
    }

    componentDidMount() {
        super.componentDidMount();
        this.subscription = this.store.addListener(this.onStoreChanged);
    }

    componentWillUnmount() {
        if (this.subscription) {
            this.subscription.remove();
            this.subscription = null;
        }
    }

    private onStoreChanged = () => {
        this.setState(this.store.state);
    }
}

export interface IRecord {
    merge(state:any):any;
}

export interface IComponentImmutableState {
    data:IRecord;
}

export class ComponentWithImmutableState<P,S extends IComponentImmutableState> extends Component<P,S> {
    mergeStateData(state){
        var data = this.state.data;
        var newData = data.merge(state);
        if(data !== newData){
            this.setState({data:newData});
        }
    }
}

export function handles(...actions) {
    return (target, name, descriptor) => {
        var handlersMap = target.__handlersMap = target.__handlersMap || {};

        for (var i = 0; i < actions.length; ++i) {
            var action = actions[i];

            if (typeof action === 'string') {
                handlersMap[action] = name;
            } else if (typeof action === 'function') {
                handlersMap[action().type] = name;
            }
        }
    }
}

export function preventDefaultHandler(event) {
    event.preventDefault();
    return false;
}

export function stopPropagationHandler(event) {
    event.stopPropagation();
}

Record.prototype.mergeToRecord = function (data) {
    return this.withMutations(s=> {
        for (var name in data) {
            s.set(name, data[name]);
        }
    });
}

export function listenTo(...stores) {
    return (target, name, descriptor)=> {
        var listeners = target.__storeListeners = target.__storeListeners || [];
        for (var i = stores.length - 1; i >= 0; --i) {
            var store = stores[i];
            listeners.push({
                store,
                name
            })
        }
    }
}

export class CarbonDispatcher extends FluxDispatcher<any> {
    dispatchAsync(action) {
        setTimeout(()=>this.dispatch(action), 0);
    }
}

export const Dispatcher = new CarbonDispatcher();

export function dispatch(action) {
    if (action.async) {
        Dispatcher.dispatchAsync(action);
    } else {
        Dispatcher.dispatch(action);
    }
}

//just a strongly typed wrapper while not all actions are union types
export function dispatchAction(action: AccountAction | BackendAction | DialogAction | PublishAction |
    StencilsAction | SymbolsAction | CarbonAction | IconsAction | LayoutAction | DataAction | FontAction | LayerAction | PropertyAction |
    LibraryAction | ImagesAction | SwatchesAction | WorkspaceAction) {
    dispatch(action);
}

export interface CarbonLabelProps {
    id:string;
    tagName?:string;
}

export class CarbonLabel extends Component<CarbonLabelProps, undefined> {
    render() {
        var id = this.props.id;
        if(!id || id[0] !== '@') {
            return <span>{id}</span>;
        }

        return <FormattedMessage tagName={this.props.tagName} id={id}/>;
    }
}


export class CarbonStore<TState = {}> extends Store<TState> {
    state: TState;

    constructor(dispatcher?:FluxDispatcher<TState>) {
        super(dispatcher || Dispatcher);
        this.state = this.getInitialState();
        this.__handlersMap = this.__handlersMap || {};
    }

    getInitialState(): any {
        return {};
    }

//
    /**
     * Getter that exposes the entire state of this store. If your state is not
     * immutable you should override this and not expose _state directly.
     */
    getState(): TState {
        return this.state;
    }

    setState(state: Partial<TState>) {
        this.state = Object.assign({}, this.state, state);
    }

    /**
     * Checks if two versions of state are the same. You do not need to override
     * this if your state is immutable.
     */
    areEqual(one:TState, two:TState): boolean {
        return one === two;
    }

    __handlersMap:any;
    __changed: boolean;
    __emitter: any;
    __changeEvent: any;

    __invokeOnDispatch(action:any): void {
        this.__changed = false;

        // reduce the stream of incoming actions to state, update when necessary
        var startingState = this.state;

        this.onAction(action);

        // This means your ending state should never be undefined
        invariant(
            this.state !== undefined,
            '%s returned undefined from reduce(...), did you forget to return ' +
            'state in the default case? (use null if this was intentional)',
            this.constructor.name
        );

        if (!this.areEqual(startingState, this.state)) {
            // `__emitChange()` sets `this.__changed` to true and then the actual
            // change will be fired from the emitter at the end of the dispatch, this
            // is required in order to support methods like `hasChanged()`
            this.__emitChange();
        }

        if (this.__changed) {
            this.__emitter.emit(this.__changeEvent);
        }
    }

    onAction(action){
        var handler = this.__handlersMap[action.type];
        if (handler) {
            this[handler](action);
        }
    }
}
