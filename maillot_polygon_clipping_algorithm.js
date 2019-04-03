const LEFT_CODE = 4;
const RIGHT_CODE = 1;
const BOTTOM_CODE = 8;
const TOP_CODE = 2;
const TWO_BITS_CODE = 16;
const TWO_BITS_MASK = LEFT_CODE + RIGHT_CODE + BOTTOM_CODE + TOP_CODE;

/**
 * Maillot polygon clipping algorithm
 * Clips polygon by a rectangular clipping window
 * @param {[number, number][]} polygon
 * @param {[number, number]} windowA Point on a window diagonal
 * @param {[number, number]} windowB Complementary point on a window diagonal
 * @returns {[number, number][]} Clipped polygon
 */
const maillotPolygonClipping = (polygon, windowA, windowB) => {
    const xmin = Math.min(windowA[0], windowB[0]);
    const xmax = Math.max(windowA[0], windowB[0]);
    const ymin = Math.min(windowA[1], windowB[1]);
    const ymax = Math.max(windowA[1], windowB[1]);

    const clippingWindow = [[xmin, ymin], [xmax, ymin], [xmax, ymax], [xmin, ymax]];
    const turningPointOffset = {1: -3, 2: -6, 4: 3, 8: 6};
    const codeToTurningPoint = {3: 2, 6: 3, 9: 1, 12: 0};

    const output = [];

    let startPoint = polygon[polygon.length - 1];
    let startCode = calculateCodeForPoint(startPoint, xmin, xmax, ymin, ymax);
    let turningPointCode;
    for (let i = 0; i < polygon.length; i++) {
        const endPoint = polygon[i];
        const endCode = calculateCodeForPoint(endPoint, xmin, xmax, ymin, ymax);
        turningPointCode = endCode;

        const clipped = cohenSutherland2dLineClipping(startPoint, endPoint, xmin, xmax, ymin, ymax);
        if (clipped !== null) {
            if (clipped[0] != startPoint) {
                output.push(clipped[0]);
            }
            output.push(clipped[1]);
        } else {
            // Resolve cases
            const isStart2Bit = startCode & TWO_BITS_CODE;
            const isEnd2Bit = endCode & TWO_BITS_CODE;

            if (
                isStart2Bit && isEnd2Bit && ((startCode & endCode) & TWO_BITS_MASK) === 0
            ) {
                // 2-2 case
                const turningPoint = getTurningPointFor22Case(startPoint, endPoint, xmin, xmax, ymin, ymax,);
                output.push(turningPoint);
            } else if (!isStart2Bit && isEnd2Bit && (startCode & endCode) === 0) {
                // 1-2 case
                const code = endCode + turningPointOffset[startCode];
                const turningPoint = clippingWindow[codeToTurningPoint[code & TWO_BITS_MASK]];
                output.push(turningPoint);
            } else if (isStart2Bit && !isEnd2Bit && (startCode & endCode) === 0) {
                // 2-1 case
                turningPointCode = startCode + turningPointOffset[endCode];
            } else if (!isStart2Bit && !isEnd2Bit && startCode !== endCode) {
                // 1-1 case
                turningPointCode |= startCode | TWO_BITS_CODE;
            }
        }

        // Basic turning point test
        if (turningPointCode & TWO_BITS_CODE) {
            const turningPoint = clippingWindow[codeToTurningPoint[turningPointCode & TWO_BITS_MASK]];
            output.push(turningPoint);
        }

        startPoint = endPoint;
        startCode = endCode;
    }

    return output;
};

/**
 * Is point to the left of the line
 * @param {[[number, number][number, number]]} line
 * @param {[number, number]} p Point
 * @returns {boolean} true - to the left, false otherwise
 */
const isToTheLeft = ([l1, l2], p) => {
    const vl = [l2[0] - l1[0], l2[1] - l1[1]];
    const vp = [p[0] - l1[0], p[1] - l1[1]];

    return (vl[0] * vp[1]) > (vl[1] * vp[0]);
};

/**
 * Resolve 2-2 bit case
 */
const getTurningPointFor22Case = (p1, p2, xmin, xmax, ymin, ymax) => {
    const d1 = [[xmax, ymin], [xmin, ymax]];
    const d2 = [[xmin, ymin], [xmax, ymax]];
    const p1ToTheLeft = isToTheLeft(d1, p1);
    const p2ToTheLeft = isToTheLeft(d1, p2);

    if (p1ToTheLeft && p2ToTheLeft) {
        return [xmin, ymin];
	} else if (!p1ToTheLeft && !p2ToTheLeft) {
		return [xmax, ymax];
	} else if (isToTheLeft(d2, p1)) {
		return [xmin, ymax];
	} else {
		return [xmax, ymin];
	}
};

/**
 * @param {[number, number]} g1 Point on a line 1
 * @param {[number, number]} g2 Point on a line 1
 * @param {[number, number]} t1 Point on a line 2
 * @param {[number, number]} t2 Point on a line 2
 * @returns {[number, number]} Intersection point
 */
const calculateLineintersection = (g1, g2, t1, t2) => {
    const a1 = g2[1] - g1[1];
    const b1 = g1[0] - g2[0];
    const c1 = a1 * g1[0] + b1 * g1[1];

    const a2 = t2[1] - t1[1];
    const b2 = t1[0] - t2[0];
    const c2 = a2 * t1[0] + b2 * t1[1];

    const d = a1 * b2 - a2 * b1;

    if (Math.abs(d) > 1e-6) {
        const x = (b2 * c1 - b1 * c2) / d;
        const y = (c2 * a1 - c1 * a2) / d;
        return [x, y];
    } else {
        throw new Error(`Lines are parralel or collinear g=[${g1} ${g2}] t=[${t1} ${t2}]`);
    }
};

/**
 * @param {[number, number]} p Point
 * @param {number} xmin Minimum x value of the clipping window
 * @param {number} xmax Maximum x value of the clipping window
 * @param {number} ymin Minimum y value of the clipping window
 * @param {number} ymax Maximum y value of the clipping window
 * @returns {number} Code for a given point
 */
const calculateCodeForPoint = (p, xmin, xmax, ymin, ymax) => {
    let result = 0;

    if (p[0] < xmin || p[0] > xmax) {
        result |= p[0] < xmin ? LEFT_CODE : RIGHT_CODE;
    }

    if (p[1] < ymin || p[1] > ymax) {
        result |= (p[1] < ymin ? BOTTOM_CODE : TOP_CODE) |
            (result > 0 ? TWO_BITS_CODE : 0);
    }

    return result;
};

/**
 * @param {number} code Code for a point
 * @param {[number, number]} g1 First point of a line
 * @param {[number, number]} g2 Second point of a line
 * @param {number} xmin Minimum x value of the clipping window
 * @param {number} xmax Maximum x value of the clipping window
 * @param {number} ymin Minimum y value of the clipping window
 * @param {number} ymax Maximum y value of the clipping window
 * @returns {[number, number]} Intersection point
 */
const clipLineByCode = (code, g1, g2, xmin, xmax, ymin, ymax) => {
    if (code & LEFT_CODE) {
        return calculateLineintersection(g1, g2, [xmin, ymin], [xmin, ymax]);
    } else if (code & RIGHT_CODE) {
        return calculateLineintersection(g1, g2, [xmax, ymin], [xmax, ymax]);
    } else if (code & BOTTOM_CODE) {
        return calculateLineintersection(g1, g2, [xmin, ymin], [xmax, ymin]);
    } else {
        return calculateLineintersection(g1, g2, [xmin, ymax], [xmax, ymax]);
    }
};

/**
 * Cohen-Sutherland 2d line clipper is used as a clipping routine
 * See https://github.com/forallx-algorithms/cohen-sutherland-2d-line-clipping
 * @param {[number, number]} g1 First point of a line
 * @param {[number, number]} g2 Second point of a line
 * @param {number} xmin Minimum x value of the clipping window
 * @param {number} xmax Maximum x value of the clipping window
 * @param {number} ymin Minimum y value of the clipping window
 * @param {number} ymax Maximum y value of the clipping window
 * @returns {[[number, number], [number, number]] | null} clipped line or null if line is completely outside clipping window
 */
const cohenSutherland2dLineClipping = (g1, g2, xmin, xmax, ymin, ymax) => {
    let g1code = calculateCodeForPoint(g1, xmin, xmax, ymin, ymax) & TWO_BITS_MASK;
    let g2code = calculateCodeForPoint(g2, xmin, xmax, ymin, ymax) & TWO_BITS_MASK;

    while (true) {
        if ((g1code | g2code) === 0) {
            return [g1, g2];
        } else if ((g1code & g2code) !== 0) {
            return null;
        } else if (g1code !== 0) {
            g1 = clipLineByCode(g1code, g1, g2, xmin, xmax, ymin, ymax);
            g1code = calculateCodeForPoint(g1, xmin, xmax, ymin, ymax) & TWO_BITS_MASK;
        } else {
            g2 = clipLineByCode(g2code, g1, g2, xmin, xmax, ymin, ymax);
            g2code = calculateCodeForPoint(g2, xmin, xmax, ymin, ymax) & TWO_BITS_MASK;
        }
    };
};

module.exports = {
    maillotPolygonClipping
};
