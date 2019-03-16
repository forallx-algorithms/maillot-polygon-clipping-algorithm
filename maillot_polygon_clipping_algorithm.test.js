const {expect} = require('chai');
const {maillotPolygonClipping} = require('./maillot_polygon_clipping_algorithm');

describe('maillotPolygonClipping', () => {
    const clippingWindow = [
        [2, 2], [6, 2], [6, 5], [2, 5]
    ];

    it('should leave polygon which is inside of the clipping window as it is', () => {
        const polygon = [[3, 4], [4, 4], [4, 3]];
        const result = maillotPolygonClipping(polygon, clippingWindow[0], clippingWindow[2]);
        expect(result).to.eql(polygon);
    });

    it('should correctly clip polygon in which one point is falloff to one bit code region', () => {
        const polygon1 = [[3, 4], [3, 1], [5, 3]];
        const should1 = [[3, 4], [3, 2],  [4, 2], [5, 3]];
        const result1 = maillotPolygonClipping(polygon1, clippingWindow[0], clippingWindow[2]);
        expect(result1).to.eql(should1);

        const polygon2 = [...polygon1].reverse();
        const should2 = [[5, 3], [4, 2], [3, 2], [3, 4]];
        const result2 = maillotPolygonClipping(polygon2, clippingWindow[0], clippingWindow[2]);
        expect(result2).to.eql(should2);
    });

    it('should introduce turning point on basic turning point test if start point in clipping window and end point is in the corner', () => {
        const polygon = [[3, 3], [0, 6], [6, 6]];
        const should = [[5, 5], [3, 3], [2, 4], [2, 5]];
        const result = maillotPolygonClipping(polygon, clippingWindow[0], clippingWindow[2]);
        expect(result).to.eql(should);
    });

    it('should generate turning point if both points are in 1 bit regions but they codes arent the same', () => {
        const polygon = [[3, 3], [0, 3], [3, 0]];
        const should = [[3, 2], [3, 3], [2, 3], [2, 2]];
        const result = maillotPolygonClipping(polygon, clippingWindow[0], clippingWindow[2]);
        expect(result).to.eql(should);
    });

    it('should not generate turning point if both points are in 1 bit regions but they codes the same', () => {
        const polygon = [[5, 3], [7, 3], [7, 5]];
        const should = [[6, 4], [5, 3], [6, 3]];
        const result = maillotPolygonClipping(polygon, clippingWindow[0], clippingWindow[2]);
        expect(result).to.eql(should);
    });

    it('should generate turning point if start point in 2 bit region and end point in a 1 bit regions and they are & operation gives us zero', () => {
        const polygon = [[4, 4], [8, 8], [-1, 4]];
        const should = [[2, 4], [4, 4], [5, 5], [6, 5], [2, 5]];
        const result = maillotPolygonClipping(polygon, clippingWindow[0], clippingWindow[2]);
        expect(result).to.eql(should);
    });

    it('should generate turning point if start point in 1 bit region and end point in a 2 bit region and they & operation gives us zero', () => {
        const polygon = [[-1, 4], [8, 8], [4, 4]];
        const should = [[2, 4], [2, 5], [6, 5], [5, 5], [4, 4]];
        const result = maillotPolygonClipping(polygon, clippingWindow[0], clippingWindow[2]);
        expect(result).to.eql(should);
    });
});

