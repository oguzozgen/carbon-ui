import { IMouseEventHandler, IKeyboardState, IMouseEventData, IDisposable, AngleAdjuster, NearestPoint } from "carbon-core";
import { UIElementDecorator, Environment, ILayer, IContext, IEnvironment, Invalidate, Brush, ChangeMode } from "carbon-core";
import { LayerTypes, ILayerDrawHandlerObject } from "carbon-app";
import { BrushType } from "carbon-basics";


const PointRadius = 6;
const PointBorder = 1;

export default class LinearGradientDecorator extends UIElementDecorator implements IMouseEventHandler, ILayerDrawHandlerObject {
    _activePoint: number;
    _startX: number;
    _startY: number;
    _movePoint: number = null;
    _gradient: any;
    _contextScale: number = 1;
    _lastGradient: any;
    _dx: number;
    _dy: number;
    _refreshCallback: (value: any, preview: boolean) => void;

    constructor(refreshCallback) {
        super();
        this._activePoint = 0;
        this._refreshCallback = refreshCallback;
    }

    attach(element: any) {
        super.attach(element);
        Environment.view.registerForLayerDraw(LayerTypes.Interaction, this);
        Environment.controller.captureMouse(this);
    }

    detach() {
        super.detach();
        Environment.view.unregisterForLayerDraw(LayerTypes.Interaction, this);
        Environment.controller.releaseMouse(this);
    }

    onLayerDraw(layer: ILayer, context: IContext, environment: any) {
        var brush = this.element.props.fill;
        if (brush.type !== BrushType.lineargradient) {
            return;
        }

        var g = brush.value;
        context.save();
        var box = this.element.getBoundingBoxGlobal();

        context.resetTransform();
        context.scale(environment.contextScale, environment.contextScale);
        this._contextScale = environment.contextScale;

        context.lineWidth = 5;
        context.strokeStyle = 'rgba(0,0,0,0.3)';
        let x1 = box.x + box.width * g.x1;
        let y1 = box.y + box.height * g.y1;
        let x2 = box.x + box.width * g.x2;
        let y2 = box.y + box.height * g.y2;
        var p1 = environment.pageMatrix.transformPoint2(x1, y1);
        var p2 = environment.pageMatrix.transformPoint2(x2, y2);
        context.moveTo(p1.x, p1.y);
        context.lineTo(p2.x, p2.y);
        context.stroke();
        context.lineWidth = 3;
        context.strokeStyle = 'rgb(250,250,250)';
        context.stroke();

        this._drawPointsOnLine(context, x1, y1, x2, y2, g.stops, environment.pageMatrix);

        context.restore();
    }

    updateActivePoint(index: number) {
        this._activePoint = index;
        Invalidate.requestInteractionOnly();
    }

    _drawPointsOnLine(context: IContext, x1, y1, x2, y2, points, matrix) {
        for (let i = 0; i < points.length; ++i) {
            var s = points[i];
            var x = x1 * (1 - s[0]) + s[0] * x2;
            var y = y1 * (1 - s[0]) + s[0] * y2;
            var p = matrix.transformPoint2(x, y);
            context.circle(p.x, p.y, PointRadius);
            context.lineWidth = 5;
            context.strokeStyle = 'rgba(0,0,0,0.3)';
            context.stroke();
            context.lineWidth = 1;
            context.fillStyle = 'rgb(250,250,250)';
            context.fill();
            if (i === this._activePoint) {
                context.circle(p.x, p.y, (PointRadius - PointBorder));
                context.fillStyle = s[1];
                context.fill();
            }
        }
    }

    mousemove(event: IMouseEventData, keys: IKeyboardState) {
        if (this._movePoint !== null) {
            let g = this._gradient;
            let dx = this._startX - event.x;
            let dy = this._startY - event.y;

            let box = this.element.getBoundingBoxGlobal();

            let gClone = clone(g);
            if (this._movePoint === 0) {
                let newX = g.x1 * box.width - dx;
                let newY = g.y1 * box.height - dy;
                if (event.event.shiftKey) {
                    let p = AngleAdjuster.adjust({ x: g.x2 * box.width, y: g.y2 * box.height }, { x: newX, y: newY });
                    newX = p.x;
                    newY = p.y;
                }
                gClone.x1 = newX / box.width;
                gClone.y1 = newY / box.height;
            } else if (this._movePoint === g.stops.length - 1) {
                let newX = g.x2 * box.width - dx;
                let newY = g.y2 * box.height - dy;

                if (event.event.shiftKey) {
                    let p = AngleAdjuster.adjust({ x: g.x1 * box.width, y: g.y1 * box.height }, { x: newX, y: newY });
                    newX = p.x;
                    newY = p.y;
                }

                gClone.x2 = newX / box.width;
                gClone.y2 = newY / box.height;
            } else {
                let x1 = g.x1 * box.width + box.x;
                let y1 = g.y1 * box.height + box.y;
                let x2 = g.x2 * box.width + box.x;
                let y2 = g.y2 * box.height + box.y;
                let outPoint = { x: 0, y: 0 };
                NearestPoint.onLine({ x: x1, y: y1 }, { x: x2, y: y2 }, { x: event.x - this._dx, y: event.y - this._dy }, outPoint);

                var p = 0;
                if (x2 !== x1) {
                    p = (outPoint.x - x1) / (x2 - x1);
                } else if (y2 !== y1) {
                    p = (outPoint.y - y1) / (y2 - y1);
                }

                gClone.stops = gClone.stops.slice();
                gClone.stops[this._movePoint] = [p, gClone.stops[this._movePoint][1]];
            }

            this._refreshCallback(gClone, true);
            this._lastGradient = gClone;
            Invalidate.requestInteractionOnly();
        }
    }

    mouseup(event: IMouseEventData, keys: IKeyboardState) {
        if (this._movePoint !== null) {
            this._movePoint = null;
            if (this._lastGradient) {
                this._refreshCallback(this._lastGradient, false);
                this._lastGradient = null;
                Invalidate.requestInteractionOnly();
            }
        }
    }

    mousedown(event: IMouseEventData, keys: IKeyboardState) {
        var brush = this.element.props.fill;
        if (brush.type !== BrushType.lineargradient) {
            return;
        }

        var g = brush.value;
        var box = this.element.getBoundingBoxGlobal();

        let x1 = box.x + box.width * g.x1;
        let y1 = box.y + box.height * g.y1;
        let x2 = box.x + box.width * g.x2;
        let y2 = box.y + box.height * g.y2;

        let r = (PointRadius + 3) * this._contextScale / Environment.view.scale();

        for (let i = 0; i < g.stops.length; ++i) {
            var s = g.stops[i];
            var x = x1 * (1 - s[0]) + s[0] * x2;
            var y = y1 * (1 - s[0]) + s[0] * y2;
            var dx = event.x - x;
            var dy = event.y - y;

            if (dx * dx + dy * dy < r * r) {
                this._startX = event.x;
                this._startY = event.y;
                this._dx = dx;
                this._dy = dy;
                this._movePoint = i;
                this._gradient = g;
                event.handled = true;
                event.event.preventDefault();
                event.event.stopImmediatePropagation();
                break;
            }
        }
    }

    dblclick(event: IMouseEventData, scale: number) {

    }

    click(event: IMouseEventData) {

    }
}