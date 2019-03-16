const LEFT_CODE = 4;
const RIGHT_CODE = 1;
const BOTTOM_CODE = 8;
const TOP_CODE = 2;
const TWO_DIGITS_CODE = 16;
const TWO_DIGITS_MASK = LEFT_CODE + RIGHT_CODE + BOTTOM_CODE + TOP_CODE;

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
    if ((code & LEFT_CODE) !== 0) {
        return calculateLineintersection(g1, g2, [xmin, ymin], [xmin, ymax]);
    } else if ((code & RIGHT_CODE) !== 0) {
        return calculateLineintersection(g1, g2, [xmax, ymin], [xmax, ymax]);
    } else if ((code & BOTTOM_CODE) !== 0) {
        return calculateLineintersection(g1, g2, [xmin, ymin], [xmax, ymin]);
    } else {
        return calculateLineintersection(g1, g2, [xmin, ymax], [xmax, ymax]);
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
            (result > 0 ? TWO_DIGITS_CODE : 0);
    }

    return result;
};


/**
 * TODO: doc
 * @param {[number, number]} g1 First point of a line
 * @param {[number, number]} g2 Second point of a line
 * @param {[number, number]} windowA First point of the window
 * @param {[number, number]} windowB Second point of the window
 * @returns {[[number, number], [number, number]] | null} clipped line or null if line is completely outside clipping window
 */
const cohenSutherland2dLineClipping = (g1, g2, xmin, xmax, ymin, ymax) => {
    // TODO: compute masked code?
    let g1code = calculateCodeForPoint(g1, xmin, xmax, ymin, ymax) & TWO_DIGITS_MASK;
    let g2code = calculateCodeForPoint(g2, xmin, xmax, ymin, ymax) & TWO_DIGITS_MASK;

    while (true) {
        if ((g1code | g2code) === 0) {
            return [g1, g2];
        } else if ((g1code & g2code) !== 0) {
            return null;
        } else if (g1code !== 0) {
            g1 = clipLineByCode(g1code, g1, g2, xmin, xmax, ymin, ymax);
            g1code = calculateCodeForPoint(g1, xmin, xmax, ymin, ymax) & TWO_DIGITS_MASK;
        } else {
            g2 = clipLineByCode(g2code, g1, g2, xmin, xmax, ymin, ymax);
            g2code = calculateCodeForPoint(g2, xmin, xmax, ymin, ymax) & TWO_DIGITS_MASK;
        }
    };
};

const maillotPolygonClipping = (polygon, windowA, windowB) => {
    const xmin = Math.min(windowA[0], windowB[0]);
    const xmax = Math.max(windowA[0], windowB[0]);
    const ymin = Math.min(windowA[1], windowB[1]);
    const ymax = Math.max(windowA[1], windowB[1]);

    const clippingWindow = [[xmin, ymin], [xmax, ymin], [xmax, ymax], [xmin, ymax]];
    // TODO: better naming
    const tcc = [0, -3, -6, 1, 3, 0, 1, 0, 6, 1, 0, 0, 1, 0, 0, 0];
    const codeToTurningPoint = {3: 2, 6: 3, 9: 1, 12: 0};

    const output = [];

    let startPoint = polygon[polygon.length - 1];
    for (let i = 0; i < polygon.length; i++) {
        const endPoint = polygon[i];

        const startCode = calculateCodeForPoint(startPoint, xmin, xmax, ymin, ymax);
        const endCode = calculateCodeForPoint(endPoint, xmin, xmax, ymin, ymax);
        // TODO: mb function for turning points?
        let turningPointCode = endCode;

        const clipped = cohenSutherland2dLineClipping(startPoint, endPoint, xmin, xmax, ymin, ymax);
        if (clipped !== null) {
            if (clipped[0] != startPoint) {
                output.push(clipped[0]);
            }
            output.push(clipped[1]);
        } else {
            // Resolve cases
            // 1-1 case
            if (!(startCode & TWO_DIGITS_CODE) && !(endCode & TWO_DIGITS_CODE) && startCode !== endCode) {
                turningPointCode |= startCode | TWO_DIGITS_CODE;
            }

            // 2-1 case
            if ((startCode & TWO_DIGITS_CODE) && !(endCode & TWO_DIGITS_CODE) && (startCode & endCode) === 0) {
                turningPointCode = startCode + tcc[endCode];
            }

            // 1-2 case
        }

        // Basic turning point test
        if (turningPointCode & TWO_DIGITS_CODE) {
            const turningPoint = clippingWindow[codeToTurningPoint[turningPointCode & TWO_DIGITS_MASK]];
            output.push(turningPoint);
        }

        // Assign endPoint to startPoint
        startPoint = endPoint;
    }

    return output;
};

module.exports = {
    maillotPolygonClipping
};
