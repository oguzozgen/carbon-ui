import * as React from "react";
import * as PropTypes from "prop-types";
import { Component, listenTo, CarbonLabel, dispatch } from "../CarbonFlux";
import { Link } from "react-router";
import FlyoutButton from "../shared/FlyoutButton";

import DashboardStore from "./DashboardStore";
import DashboardActions from "./DashboardActions";
import { backend } from "carbon-core";
import ScrollContainer from "../shared/ScrollContainer";

class ProjectTile extends Component<any, any>{
    static contextTypes = {
        router: PropTypes.any,
        intl: PropTypes.object,
        companyId: PropTypes.string
    }

    _getProjectLink(forceCompany = false) {
        let companyName = this.props.companyName;
        if (!companyName && forceCompany) {
            companyName = this.context.router.params.companyName;
        }
        if (companyName) {
            return {
                pathname: '/app/@' + companyName + "/" + this.props.id,
                state: { companyId: this.props.companyId }
            };
        }

        return {
            pathname: '/app/' + this.props.id
        };
    }

    _goToProject = () => {
        this.context.router.push(this._getProjectLink());
    }

    _goToProjectNewTab = () => {
        let link = this._getProjectLink(true);
        var win = window.open(link.pathname, '_blank');
        win.focus();
    }

    _preventDefault(event) {
        event.preventDefault();
    }

    _deleteProject = () => {
        let message = this.context.intl.formatMessage({ id: "@project.confirmDelete" });
        if (confirm(message)) {
            dispatch(DashboardActions.deleteProject(this.props.companyId || this.context.companyId, this.props.id));
        }
    }

    _duplicateProject = () => {
        dispatch(DashboardActions.duplicateProject(this.props.companyId || this.context.companyId, this.props.id));
    }

    renderDetailsButton() {
        return <div >...</div>;
    }

    private static FlyoutPosition: any = { targetVertical: "top", targetHorizontal: "right" };

    render() {
        return <div tabIndex={1} className="project-tile project-tile-bone" onClick={this._preventDefault} onDoubleClick={this._goToProject}>
            <figure className="project-tile__back" style={{ backgroundImage: `url(${this.props.avatar})` }}></figure>
            <div className="project-tile__block">
                <img className="project-tile__image" src={this.props.avatar} />
                <h1 className="project-tile__name">{this.props.name}</h1>
                <h1 className="project-tile__counter">10 artboards</h1>
            </div>
            <FlyoutButton className="project-detail-button" renderContent={this.renderDetailsButton} position={ProjectTile.FlyoutPosition}>
                <div className="project-tile-menu">
                    <ul>
                        <li onClick={this._goToProject} className="project-tile-menu_item"><CarbonLabel id="@project.open" /></li>
                        <li onClick={this._goToProjectNewTab} className="project-tile-menu_item"><CarbonLabel id="@project.opennewtab" /></li>
                        <li onClick={this._duplicateProject} className="project-tile-menu_item"><CarbonLabel id="@project.duplicate" /></li>
                        <li onClick={this._deleteProject} className="project-tile-menu_item"><CarbonLabel id="@project.delete" /></li>
                    </ul>
                </div>
            </FlyoutButton>
        </div>
    }
}

export default class ProjectList extends Component<any, any>{
    static contextTypes = {
        router: PropTypes.any,
        intl: PropTypes.object,
        companyId: PropTypes.string
    }

    constructor(props) {
        super(props);
        this.state = { projects: DashboardStore.state.get("projectList") };
    }

    @listenTo(DashboardStore)
    _onChanged() {
        this.setState({ projects: DashboardStore.state.get("projectList") });
    }

    _renderNewButton() {
        var folder = DashboardStore.state.get("activeFolderId");
        if(folder !== "my") {
            return;
        }

        return <Link className="fs-main-button new-project-button project-tile-bone" to="/app"><CarbonLabel id="@project.new" /></Link>;
    }

    componentWillReceiveProps(nextProps) {
        this.setState({ projects: DashboardStore.state.get("projectList") });
    }

    render() {
        return <ScrollContainer boxClassName="dashboard-projects">
            {this._renderNewButton()}
            {this.state.projects.map(x => {
                return <ProjectTile
                    key={x.get("id")}
                    id={x.get("id")}
                    name={x.get("name")}
                    companyName={x.get("companyName")}
                    companyId={x.get("companyId")}
                    avatar={x.get("avatar")} />
            })}
        </ScrollContainer>
    }
}