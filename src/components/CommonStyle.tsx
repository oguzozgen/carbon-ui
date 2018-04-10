import styled from "styled-components";
import theme from "../theme";
import { TabArea, TabPage } from "../shared/TabContainer";

export const FlyoutBodyNoPadding = styled.div`
    background: ${theme.flyout_background};
    box-shadow: ${theme.flyout_shadow};
`;

export const FlyoutBody = styled(FlyoutBodyNoPadding) `
    padding:12px;
`;

export const HorizontalGroup = styled.div`
    display:flex;
`;

export const VerticalGroup = styled.div`
    display:flex;
    flex-direction:column;
`;

export const TabAreaStyled = styled(TabArea).attrs<any>({})`
    overflow:hidden;
    position:relative;
    flex: auto;
    display:flex;
    align-items: stretch;
    flex-wrap: nowrap;

    &[data-current-tab="1"] > & { transform: translateX(0%)}
    &[data-current-tab="2"] > & { transform: translateX(-100%)}
    &[data-current-tab="3"] > & { transform: translateX(-200%)}
    &[data-current-tab="4"] > & { transform: translateX(-300%)}
    &[data-current-tab="5"] > & { transform: translateX(-400%)}
    &[data-current-tab="6"] > & { transform: translateX(-500%)}
    &[data-current-tab="7"] > & { transform: translateX(-600%)}
    &[data-current-tab="8"] > & { transform: translateX(-700%)}
`;

export const TabPageStyled = styled(TabPage).attrs<any>({})`
    display: flex;
    flex-direction: column;
    transition: transform .3s;
    width: 100%;
    min-width: 100%;
    flex-shrink: 0;
`