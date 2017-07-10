import React from "react";
import UserImages from "./UserImages";
import RecentImages from "./RecentImages";
//import RecentIcons from "./RecentIcons";
import Unsplash from "./Unsplash";
//import SearchIcons from "./SearchIcons";
import {richApp} from "../../RichApp";
import {listenTo, Component, dispatch} from "../../CarbonFlux";
import {default as TabContainer, TabTabs, TabArea, TabPage} from "../../shared/TabContainer";
import bem from '../../utils/commonUtils';

import libraryTabStore from "../LibraryTabStore";
import LibraryActions from "../LibraryActions";

export default class ImagesPage extends Component<any, any> {
    constructor(props) {
        super(props);
        this.state = {
            tabId: libraryTabStore.state.images
        };
    }

    @listenTo(libraryTabStore)
    onTabChanged(){
        this.setState({tabId: libraryTabStore.state.images});
    }

    render(){
        return <TabContainer id="images-page" className="gui-page__content" currentTabId={this.state.tabId} onTabChanged={tabId => dispatch(LibraryActions.changeTab("images", tabId))}>
            <TabTabs
                items={[
                    <i className="ico--users"/>,
                    <i className="ico--recent"/>,
                    <i className="ico--earth"/>,
                    <i className="ico--search"/>
                ]}
                tabMods="level2"
            />

            <TabArea className="gui-pages" id="icons-page__pages">
                <TabPage tabId="1" className="gui-page user-images">
                    <UserImages ref="tab1"/>
                </TabPage>
                <TabPage tabId="2" className="gui-page">
                    <RecentImages ref="tab2"/>
                </TabPage>
                <TabPage tabId="3" className="gui-page web-images">
                    <Unsplash ref="tab3"/>
                </TabPage>
            </TabArea>
        </TabContainer>
    }
}
