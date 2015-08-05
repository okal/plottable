///<reference path="../reference.ts" />

module Plottable {
export module Plots {
  export class Line<X> extends XYPlot<X, number> {
    private _interpolator: string | ((points: Array<[number, number]>) => string) = "linear";

    private _autorangeSmooth = false;

    /**
     * A Line Plot draws line segments starting from the first data point to the next.
     *
     * @constructor
     */
    constructor() {
      super();
      this.addClass("line-plot");
      var animator = new Animators.Easing();
      animator.stepDuration(Plot._ANIMATION_MAX_DURATION);
      animator.easingMode("exp-in-out");
      animator.maxTotalDuration(Plot._ANIMATION_MAX_DURATION);
      this.animator(Plots.Animator.MAIN, animator);
      this.attr("stroke", new Scales.Color().range()[0]);
      this.attr("stroke-width", "2px");
    }

    public y(): Plots.AccessorScaleBinding<number, number>;
    public y(y: number | Accessor<number>): Plots.Line<X>;
    public y(y: number | Accessor<number>, yScale: Scale<number, number>): Plots.Line<X>;
    public y(y?: number | Accessor<number> | number | Accessor<number>, yScale?: Scale<number, number>): any {
      if (yScale instanceof QuantitativeScale) {
        (<QuantitativeScale<number>>yScale).snapsDomain(!this._autorangeSmooth);
      }
      return super.y(y, yScale);
    }

    /**
     * Gets whether or not the autoranging is done smoothly.
     */
    public autorangeSmooth(): boolean;
    /**
     * Sets whether or not the autorange is done smoothly.
     *
     * Smooth autoranging is done by making sure lines always exit on the left / right side of the plot
     * and deactivating the nice domain feature on the scales
     */
    public autorangeSmooth(autorangeSmooth: boolean): Plots.Line<X>;
    public autorangeSmooth(autorangeSmooth?: boolean): any {
      if (autorangeSmooth == null) {
        return this._autorangeSmooth;
      }
      this._autorangeSmooth = autorangeSmooth;

      if (this.y() && this.y().scale && this.y().scale instanceof QuantitativeScale) {
        (<QuantitativeScale<number>>this.y().scale).snapsDomain(!autorangeSmooth);
      }

      if (this.x() && this.x().scale && this.x().scale instanceof QuantitativeScale) {
        (<QuantitativeScale<number>>this.x().scale).snapsDomain(!autorangeSmooth);
      }

      this.autorangeMode(this.autorangeMode());
      return this;
    }

    /**
     * Gets the interpolation function associated with the plot.
     *
     * @return {string | (points: Array<[number, number]>) => string)}
     */
    public interpolator(): string | ((points: Array<[number, number]>) => string);
    /**
     * Sets the interpolation function associated with the plot.
     *
     * @param {string | points: Array<[number, number]>) => string} interpolator Interpolation function
     * @return Plots.Line
     */
    public interpolator(interpolator: string | ((points: Array<[number, number]>) => string)): Plots.Line<X>;
    public interpolator(interpolator: "linear"): Line<X>;
    public interpolator(interpolator: "linear-closed"): Line<X>;
    public interpolator(interpolator: "step"): Line<X>;
    public interpolator(interpolator: "step-before"): Line<X>;
    public interpolator(interpolator: "step-after"): Line<X>;
    public interpolator(interpolator: "basis"): Line<X>;
    public interpolator(interpolator: "basis-open"): Line<X>;
    public interpolator(interpolator: "basis-closed"): Line<X>;
    public interpolator(interpolator: "bundle"): Line<X>;
    public interpolator(interpolator: "cardinal"): Line<X>;
    public interpolator(interpolator: "cardinal-open"): Line<X>;
    public interpolator(interpolator: "cardinal-closed"): Line<X>;
    public interpolator(interpolator: "monotone"): Line<X>;
    public interpolator(interpolator?: string | ((points: Array<[number, number]>) => string)): any {
      if (interpolator == null) {
        return this._interpolator;
      }
      this._interpolator = interpolator;
      this.render();
      return this;
    }

    protected _createDrawer(dataset: Dataset): Drawer {
      return new Plottable.Drawers.Line(dataset);
    }

    protected _computeExtent(dataset: Dataset, accScaleBinding: Plots.AccessorScaleBinding<any, any>, filter: Accessor<boolean>): any[] {

      var extent = super._computeExtent(dataset, accScaleBinding, filter);

      if (!(this._autorangeSmooth && this.x() && this.x().scale && accScaleBinding === this.x())) {
        return extent;
      }

      var edgeIntersectionPoints = this._getEdgeIntersectionPoints(this.y(), this.x());
      var includedValues = edgeIntersectionPoints[0].concat(edgeIntersectionPoints[1]).map((point) => point.y);

      var maxIncludedValue = Math.max.apply(this, includedValues);
      var minIncludedValue = Math.min.apply(this, includedValues);

      if (extent.length === 0) {
        extent = [minIncludedValue, maxIncludedValue];
      }

      if (minIncludedValue < extent[0]) {
        extent[0] = minIncludedValue;
      }

      if (maxIncludedValue > extent[1]) {
        extent[1] = maxIncludedValue;
      }

      return extent;
    }

    private _getEdgeIntersectionPoints(xAccessor: any, yAccessor: any): Point[][] {

      if (!(yAccessor.scale instanceof QuantitativeScale)) {
        return [[], []];
      }

      var yScale = <QuantitativeScale<number>>yAccessor.scale;
      var xScale = xAccessor.scale;

      var intersectionPoints: Point[][] = [[], []];
      var leftX = xScale.scale(xScale.domain()[0]);
      var rightX = xScale.scale(xScale.domain()[1]);

      console.log(leftX, rightX);


      this.datasets().forEach((dataset) => {

        var data = dataset.data();

        var x1: number, x2: number, y1: number, y2: number;
        var prevX: number, prevY: number, currX: number, currY: number;
        for (var i = 1; i < data.length; i++) {
          prevX = currX || xScale.scale(xAccessor.accessor(data[i - 1], i - 1, dataset));
          prevY = currY || yScale.scale(yAccessor.accessor(data[i - 1], i - 1, dataset));

          currX = xScale.scale(xAccessor.accessor(data[i], i, dataset));
          currY = yScale.scale(yAccessor.accessor(data[i], i, dataset));

          // If values crossed left edge
          if ((prevX < leftX) === (leftX <= currX)) {
            x1 = leftX - prevX;
            x2 = currX - prevX;
            y2 = currY - prevY;
            y1 = x1 * y2 / x2;

            intersectionPoints[0].push({
              x: leftX,
              y: yScale.invert(prevY + y1)
            });
          }

          // If values crossed right edge
          if ((prevX < rightX) === (rightX <= currX)) {
            x1 = rightX - prevX;
            x2 = currX - prevX;
            y2 = currY - prevY;
            y1 = x1 * y2 / x2;

            intersectionPoints[1].push({
              x: rightX,
              y: yScale.invert(prevY + y1)
            });
          }
        };
      });

      return intersectionPoints;
    }

    protected _getResetYFunction() {
      // gets the y-value generator for the animation start point
      var yDomain = this.y().scale.domain();
      var domainMax = Math.max(yDomain[0], yDomain[1]);
      var domainMin = Math.min(yDomain[0], yDomain[1]);
      // start from zero, or the closest domain value to zero
      // avoids lines zooming on from offscreen.
      var startValue = (domainMax < 0 && domainMax) || (domainMin > 0 && domainMin) || 0;
      var scaledStartValue = this.y().scale.scale(startValue);
      return (d: any, i: number, dataset: Dataset) => scaledStartValue;
    }

    protected _generateDrawSteps(): Drawers.DrawStep[] {
      var drawSteps: Drawers.DrawStep[] = [];
      if (this._animateOnNextRender()) {
        var attrToProjector = this._generateAttrToProjector();
        attrToProjector["d"] = this._constructLineProjector(Plot._scaledAccessor(this.x()), this._getResetYFunction());
        drawSteps.push({attrToProjector: attrToProjector, animator: this._getAnimator(Plots.Animator.RESET)});
      }

      drawSteps.push({attrToProjector: this._generateAttrToProjector(), animator: this._getAnimator(Plots.Animator.MAIN)});

      return drawSteps;
    }

    protected _generateAttrToProjector() {
      var attrToProjector = super._generateAttrToProjector();
      Object.keys(attrToProjector).forEach((attribute: string) => {
        if (attribute === "d") { return; }
        var projector = attrToProjector[attribute];
        attrToProjector[attribute] = (data: any[], i: number, dataset: Dataset) =>
          data.length > 0 ? projector(data[0], i, dataset) : null;
      });

      return attrToProjector;
    }

    /**
     * Returns the PlotEntity nearest to the query point by X then by Y, or undefined if no PlotEntity can be found.
     *
     * @param {Point} queryPoint
     * @returns {PlotEntity} The nearest PlotEntity, or undefined if no PlotEntity can be found.
     */
    public entityNearest(queryPoint: Point): PlotEntity {
      var minXDist = Infinity;
      var minYDist = Infinity;
      var closest: PlotEntity;
      this.entities().forEach((entity) => {
        if (!this._entityVisibleOnPlot(entity.position, entity.datum, entity.index, entity.dataset)) {
          return;
        }
        var xDist = Math.abs(queryPoint.x - entity.position.x);
        var yDist = Math.abs(queryPoint.y - entity.position.y);

        if (xDist < minXDist || xDist === minXDist && yDist < minYDist) {
          closest = entity;
          minXDist = xDist;
          minYDist = yDist;
        }
      });

      return closest;
    }

    protected _propertyProjectors(): AttributeToProjector {
      var propertyToProjectors = super._propertyProjectors();
      propertyToProjectors["d"] = this._constructLineProjector(Plot._scaledAccessor(this.x()), Plot._scaledAccessor(this.y()));
      return propertyToProjectors;
    }

    protected _constructLineProjector(xProjector: Projector, yProjector: Projector) {
      var definedProjector = (d: any, i: number, dataset: Dataset) => {
        var positionX = Plot._scaledAccessor(this.x())(d, i, dataset);
        var positionY = Plot._scaledAccessor(this.y())(d, i, dataset);
        return positionX != null && !Utils.Math.isNaN(positionX) &&
               positionY != null && !Utils.Math.isNaN(positionY);
      };
      return (datum: any, index: number, dataset: Dataset) => {
        return d3.svg.line()
                     .x((innerDatum, innerIndex) => xProjector(innerDatum, innerIndex, dataset))
                     .y((innerDatum, innerIndex) => yProjector(innerDatum, innerIndex, dataset))
                     .interpolate(this.interpolator())
                     .defined((innerDatum, innerIndex) => definedProjector(innerDatum, innerIndex, dataset))(datum);
      };
    }

    protected _getDataToDraw() {
      var dataToDraw = new Utils.Map<Dataset, any[]> ();
      this.datasets().forEach((dataset) => dataToDraw.set(dataset, [dataset.data()]));
      return dataToDraw;
    }

  }
}
}
