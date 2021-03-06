import * as React from "react";

import InternalIcons from "./InternalIcons";
import RecentIcons from "./RecentIcons";
import IconFinder from "./IconFinder";
import SearchIcons from "./SearchIcons";
import { listenTo, Component, dispatch, dispatchAction } from '../../CarbonFlux';
import { TabContainer, TabArea, TabTabs, TabPage } from "../../shared/TabContainer";
import libraryTabStore from "../LibraryTabStore";
import InternalIconsStore from "./InternalIconsStore";
import { TabAreaStyled, TabPageStyled } from "../../components/CommonStyle";
import styled from "styled-components";
import Search from "../../shared/Search";

export default class IconsPage extends Component<any, any> {
    private iconfinder: IconFinder;
    private tabContainer: TabContainer;

    constructor(props) {
        super(props);
        this.state = {
            tabId: libraryTabStore.state.icons
        };
    }

    @listenTo(libraryTabStore)
    onTabChanged() {
        this.setState({ tabId: libraryTabStore.state.icons });
    }

    onSearch = (term) => {
        if (term) {
            if (this.tabContainer.state.tabId !== "2") {
                this.tabContainer.changeTabById("2");
            }
        } else if (this.tabContainer.state.tabId !== "1") {
            this.tabContainer.changeTabById("1");
        }
        this.iconfinder.onSearch(term);
    }

    render() {
        return <TabContainer id="icons-page" className="gui-page__content" currentTabId={this.state.tabId} ref={x=>this.tabContainer = x} onTabChanged={tabId => dispatchAction({ type: "Library_Tab", area: "icons", tabId })}>
            <Search query={this.state.query} onQuery={this.onSearch} placeholder="@icons.find" ref="search" />

            <TabAreaStyled id="icons-page__pages">
                <TabPageStyled tabId="1">
                    <InternalIcons />
                </TabPageStyled>
                <TabPageStyled tabId="2">
                    <IconFinder ref={x => this.iconfinder = x} />
                </TabPageStyled>
            </TabAreaStyled>
        </TabContainer>
    }
}
