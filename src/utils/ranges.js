const mergeRanges = require('merge-ranges');
const intersectingRanges = require('intersecting-ranges');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const rentalService = require('../services/rental.service');

const { mapToObjectRec } = require('../utils/misc');

let MAX_DATE = new Date(8640000000000000 - 10);
let MIN_DATE = new Date(-8640000000000000 + 10);

const mergeDateRanges = (dateRanges) => {
    let ranges = [];

    // Convert [22...24] into [22...25]
    for (const [from, to] of dateRanges) {
        //const newFrom = new Date(from)
        //newFrom.setDate(newFrom.getDate() - 1)
        const newTo = new Date(to)
        newTo.setDate(newTo.getDate() + 1)

        ranges.push([from, newTo])
    }

    // Merge the ranges
    ranges = mergeRanges(ranges)

    const finalRanges = [];

    // Reconvert [22...25] into [22...24]
    for (const [newFrom, newTo] of ranges) {
        //const finalFrom = new Date(newFrom)
        // finalFrom.setDate(finalFrom.getDate() + 1)
        const finalTo = new Date(newTo)
        finalTo.setDate(finalTo.getDate() - 1)

        finalRanges.push([newFrom, finalTo])
    }

    return finalRanges
}

const sameIntervals = (ranges1, ranges2) => {
    if (ranges1.length != ranges2.length) return false;
    for (const i in ranges1) {
        const [from1, to1] = ranges1[i];
        const [from2, to2] = ranges2[i];

        if (from1.getTime() != from2.getTime() || to1.getTime() != to2.getTime()) {
            return false;
        }
    }

    return true;
}

const validRanges = (ranges) => {
    for (const i in ranges) {
        const range = ranges[i];
        if (range.to < range.from) {
            throw new ApiError(httpStatus.BAD_REQUEST, '"to" must be greater than or equal to "from".');
        }
        for (const j in ranges) {
            if (i != j) {
                const otherRange = ranges[j];
                const intersectingRangesQuery = [[range.from, range.to], [otherRange.from, otherRange.to]];
                if (intersectingRanges(intersectingRangesQuery).length > 0) {
                    throw new ApiError(httpStatus.BAD_REQUEST, "Ranges must be non-overlapping.")
                }
            }
        }
    }
}



const invertDateRange = (range) => {
    const [from, to] = range;
    const newFrom = new Date(from);
    newFrom.setDate(newFrom.getDate() - 1);

    const newTo = new Date(to);
    newTo.setDate(newTo.getDate() + 1);

    return [[-Infinity, newFrom], [newTo, Infinity]];
}

/**
 * Computes an intersection between date ranges, with the exception of
 * treating the intersection of [1, 5] and [5, 9] as [5, 5]
 * @param {Array} ranges 
 * @returns An array of ranges, containing the intersection result
 */
const edgeIntersection = (ranges) => {
    // Add -1 ms to "from" and +1 ms to "to"
    const newRanges = [];

    for (const [from, to] of ranges) {
        let newFrom, newTo;

        if (isFinite(from)) {
            newFrom = new Date(from)
            newFrom.setMilliseconds(newFrom.getMilliseconds() - 1)
        }
        else {
            newFrom = from;
        }

        if (isFinite(to)) {
            newTo = new Date(to)
            newTo.setMilliseconds(newTo.getMilliseconds() + 1)
        }
        else {
            newTo = to;
        }

        newRanges.push([newFrom, newTo])
    }

    // console.log('Computing magic intersection with ', newRanges)

    const intersection = intersectingRanges(newRanges);

    // console.log('Result: ', intersection)

    // Round to the nearest second
    const finalRanges = []

    for (const [from, to] of intersection) {
        let finalFrom, finalTo;

        if (isFinite(from)) {
            finalFrom = new Date(from)
            finalFrom.setTime(Math.round(finalFrom.getTime() / 1000) * 1000)
        }
        else {
            finalFrom = from;
        }

        if (isFinite(to)) {
            finalTo = new Date(to)
            finalTo.setTime(Math.round(finalTo.getTime() / 1000) * 1000)
        }
        else {
            finalTo = to;
        }

        finalRanges.push([finalFrom, finalTo])
    }

    return finalRanges
}

const removeRange = (oldRange, removedRange) => {
    /*console.log('Removing ', removedRange, ' from ', oldRange);
    console.log('Inverted:', invertDateRange(removedRange))*/

    const invertedRange = invertDateRange(removedRange)
    const ranges = [oldRange, ...invertedRange]
    // console.log('Ranges: ', ranges)
    const intersection = edgeIntersection(ranges);

    // console.log('Intersection: ', intersection);

    return intersection
}


const getNewRanges = (oldRanges, removedRanges) => {
    if (removedRanges.length == 0) {
        return oldRanges;
    }

    const newRanges = [];
    for (const oldRange of oldRanges) {
        console.log('Checking old range ', oldRange);
        let newSubRanges = [];
        for (const removedRange of removedRanges) {
            const subRangesAfterRemoval = removeRange([oldRange.from, oldRange.to], [removedRange.from, removedRange.to]);

            newSubRanges.push(subRangesAfterRemoval);
        }

        if (newSubRanges.length > 1) {

            // Surrounding subranges with some extrema prevents unexpected behaviour from edgeIntersection
            newSubRanges = newSubRanges.map(subRange => [[MIN_DATE, MIN_DATE], ...subRange, [MAX_DATE, MAX_DATE]])

            console.log('Found subranges: ', newSubRanges);

            const concatenatedSubRanges = [].concat(...newSubRanges);

            // I subrange non fanno merged, vanno intersecati

            let subRangeIntersection = edgeIntersection(concatenatedSubRanges);
            console.log('Intersection: ', subRangeIntersection);

            // Remove the surrounding extrema
            subRangeIntersection = subRangeIntersection.slice(1, subRangeIntersection.length - 1)
            console.log('Cleaned up intersection: ', subRangeIntersection);

            for (const subRange of subRangeIntersection) {
                console.log('Subrange intersection: ', subRange)
                const newRange = {...oldRange};
                newRange.from = subRange[0];
                newRange.to = subRange[1];
                newRanges.push(newRange);
            }

            return newRanges;
        } else if (newSubRanges.length == 1) {
            console.log('New sub ranges: ', newSubRanges);

            const newRanges = [];
            for (const subRange of newSubRanges[0]) {
                newRanges.push(
                    {
                        ...oldRange,
                        from: subRange[0],
                        to: subRange[1]
                    }
                );
            }
            return newRanges;
        } else {
            return [];
        }
    }

}

const computeRentability = (productId, instanceId, instance, rentals) => {
    // console.log('Instance received: ', instance);

    const removedDateRanges = []

    // console.log('=======')
    for (const rental of rentals) {
        const products = rental.products;
        console.log('Matching Product:', products[productId])
        // TODO: Non è detto che il rental abbia quel prodotto?
        if (rental.products[productId]?.instances[instanceId]) {
            removedDateRanges.push(...rental.products[productId].instances[instanceId].dateRanges);
        }
    }
    // console.log('===========')

    console.log('Removed date ranges: ', removedDateRanges);
    // console.log('Availability: ', instance.availability);

    const newRanges =  getNewRanges(instance.availability, removedDateRanges);
    console.log('New ranges: ', newRanges);
    return newRanges;
}

const computeRentabilities = async (productId, instances, ignoreAllRentals, ignoreRental) => {
    const rentabilities = {};
  
    let rentals;
    if (ignoreAllRentals) {
        rentals = [];
    } else {
        rentals = mapToObjectRec(await rentalService.queryRentals()).results;

        if (ignoreRental) {
            // Note the use of _id instead of id, since we're using the object as returned
            // by the rental service
            rentals = rentals.filter(rental => rental._id != ignoreRental)
        }
    }

    /*for (const rental of rentals) {
        console.log('Rental:' , rental);
        rental.products = mapToObject(rental.products);

        console.log('Rental products:', rental.products)

        for (const rentalProduct of Object.values(rental.products)) {
            rentalProduct.instances = mapToObject(rentalProduct.toObject().instances);
            console.log('Rental product instances: ', rentalProduct.instances);
        }
        //console.log('Converted products:', mapToObject(rental.products.toObject()))
        console.log('New products: ', rental.products)
    }*/

    console.log('Rentals:', rentals);
  
    for (const [instanceId, instance] of Object.entries(instances)) {
        // console.log('Instance:', instance);
        rentabilities[instanceId] = computeRentability(productId, instanceId, instance, rentals);
    }
  
    return rentabilities;
}

const validRentedRanges = (availability, rentedRanges, productId, instanceId, type) => {
    validRanges(rentedRanges)

    const instanceAvailability = mergeDateRanges(availability.map(range => [range.from, range.to]))

    // console.log('Instance availability: ', instanceAvailability)

    const rentedRangesParsed = rentedRanges.map(range => [range.from, range.to])

    const rentedRangesForIntersection = rentedRanges.map(range => {
        const parsedFrom = new Date(range.from)
        const parsedTo = new Date(range.to)

        parsedFrom.setMilliseconds(parsedFrom.getMilliseconds() - 1)
        parsedTo.setMilliseconds(parsedTo.getMilliseconds() + 1)
        return [parsedFrom, parsedTo]
    })

    if (instanceAvailability.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Rented ranges for instance ${instanceId} of product ${productId} are not ${type}.`)
    }

    const intersection = intersectingRanges(instanceAvailability.concat(rentedRangesForIntersection))

    for (const [intersectionFrom, intersectionTo] of intersection) {
        intersectionFrom.setTime(Math.round(intersectionFrom.getTime() / 1000) * 1000)
        intersectionTo.setTime(Math.round(intersectionTo.getTime() / 1000) * 1000)
    }

    console.log('Intersection: ', intersection)
    console.log('Rented ranges: ', rentedRangesParsed)
    if (!sameIntervals(intersection, rentedRangesParsed)) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Rented ranges for instance ${instanceId} of product ${productId} are not ${type}.`)
    }

}

module.exports = {
    computeRentabilities,
    computeRentability,
    getNewRanges,
    validRentedRanges
}