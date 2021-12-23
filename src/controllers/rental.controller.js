const httpStatus = require('http-status');
const mergeRanges = require('merge-ranges');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { productService, rentalService } = require('../services');
const intersectingRanges = require('intersecting-ranges');
const verifyRights = require('../utils/verifyRights');
const Decimal = require('decimal.js');

const pick = require('../utils/pick');

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

const mergeDateRanges = (dateRanges) => {
    let ranges = [];

    // Convert [22...24] into [21...25]
    for (const [from, to] of dateRanges) {
        const newFrom = new Date(from)
        newFrom.setDate(newFrom.getDate() - 1)
        const newTo = new Date(to)
        newTo.setDate(newTo.getDate() + 1)

        ranges.push([newFrom, newTo])
    }

    // Merge the ranges
    ranges = mergeRanges(ranges)

    const finalRanges = [];

    // Reconvert [21...25] into [22...24]
    for (const [newFrom, newTo] of ranges) {
        const finalFrom = new Date(newFrom)
        finalFrom.setDate(finalFrom.getDate() + 1)
        const finalTo = new Date(newTo)
        finalTo.setDate(finalTo.getDate() - 1)

        finalRanges.push([finalFrom, finalTo])
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

const validRentedRanges = (availability, rentedRanges, productId, instanceId) => {
    validRanges(rentedRanges)

    const instanceAvailability = mergeDateRanges(availability.map(range => [range.from, range.to]))

    console.log('Instance availability: ', instanceAvailability)

    const rentedRangesParsed = rentedRanges.map(range => [range.from, range.to])

    const rentedRangesForIntersection = rentedRanges.map(range => {
        const parsedFrom = new Date(range.from)
        const parsedTo = new Date(range.to)

        parsedFrom.setMilliseconds(parsedFrom.getMilliseconds() - 1)
        parsedTo.setMilliseconds(parsedTo.getMilliseconds() + 1)
        return [parsedFrom, parsedTo]
    })

    const intersection = intersectingRanges(instanceAvailability.concat(rentedRangesForIntersection))

    for (const [intersectionFrom, intersectionTo] of intersection) {
        intersectionFrom.setTime(Math.round(intersectionFrom.getTime() / 1000) * 1000)
        intersectionTo.setTime(Math.round(intersectionTo.getTime() / 1000) * 1000)
    }

    console.log('Intersection: ', intersection)
    console.log('Rented ranges: ', rentedRangesParsed)
    if (!sameIntervals(intersection, rentedRangesParsed)) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Rented ranges for instance ${instanceId} of product ${productId} are not available.`)
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

    console.log('Computing magic intersection with ', newRanges)

    const intersection = intersectingRanges(newRanges);

    console.log('Result: ', intersection)

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
    console.log('Removing ', removedRange, ' from ', oldRange);
    console.log('Inverted:', invertDateRange(removedRange))

    const invertedRange = invertDateRange(removedRange)
    const ranges = [oldRange, ...invertedRange]
    console.log('Ranges: ', ranges)
    const intersection = edgeIntersection(ranges);

    console.log('Intersection: ', intersection);

    return intersection
}


const getNewRanges = (oldRanges, removedRanges) => {
    const newRanges = [];
    for (const oldRange of oldRanges) {
        console.log('Checking old range ', oldRange);
        let newSubRanges = [];
        for (const removedRange of removedRanges) {
            const subRangesAfterRemoval = removeRange([oldRange.from, oldRange.to], [removedRange.from, removedRange.to]);

            newSubRanges = newSubRanges.concat(subRangesAfterRemoval);
        }

        console.log('Found subranges: ', newSubRanges);

        const subRangeIntersection = edgeIntersection(newSubRanges);

        for (const subRange of subRangeIntersection) {
            console.log('MergedSubRange: ', subRange)
            const newRange = {...oldRange};
            newRange.from = subRange[0];
            newRange.to = subRange[1];
            newRanges.push(newRange);
        }
    }

    return newRanges;
}

const computeDateRangePrice = (dateRange, availability) => {
    let totalPrice = new Decimal(0);
    const prices = {};

    for (let availabilityRange of availability) {
        for (let availabilityDay = new Date(availabilityRange.from); availabilityDay <= availabilityRange.to; availabilityDay.setDate(availabilityDay.getDate() + 1)) {
            console.log('Price: ', availabilityRange.price.toString())
            prices[availabilityDay] = new Decimal(availabilityRange.price.toString());
        }
    }

    console.log('DateRange:', dateRange)

    for (let currentDay = new Date(dateRange.from); currentDay <= dateRange.to; currentDay.setDate(currentDay.getDate() + 1)) {
        totalPrice = Decimal.sum(totalPrice, prices[currentDay]);
    }

    return totalPrice;
}

const verifyRentalRights = (user, rental, allowEmptyDiscounts) => {
    if (!verifyRights(user, ['manageRentals'])) {
        if (rental.userId) {
            throw new ApiError(httpStatus.UNAUTHORIZED, 'Parameter "userId" requires "manageRentals" capability.')
        }
        if (rental.approvedBy) {
            throw new ApiError(httpStatus.UNAUTHORIZED, 'Parameter "approvedBy" requires "manageRentals" capability.')
        }

        const checkDiscounts = (discounts) => {
            if (discounts && !(discounts.length == 0 && allowEmptyDiscounts)) {
                throw new ApiError(httpStatus.UNAUTHORIZED, 'Parameter "discounts" requires "manageRentals" capability.')
            }
        }

        checkDiscounts(rental.discounts)

        for (const productRental of Object.values(rental.products)) {
            checkDiscounts(productRental.discounts)

            for (const rentalInstance of Object.values(productRental.instances)) {
                checkDiscounts(rentalInstance.discounts)

                for (const dateRange of Object.values(rentalInstance.dateRanges)) {
                    checkDiscounts(dateRange.discounts)

                    if (dateRange.price) {
                        throw new ApiError(httpStatus.UNAUTHORIZED, 'Parameter "price" requires "manageRentals" capability.')
                    }
                }
            }
        }
    }
}

const addRental = catchAsync(async (req, res) => {
    const rental = req.body;

    verifyRentalRights(req.user, rental, true);

    console.log(req.body);

    const updates = {};

    for (const [productId, productRental] of Object.entries(rental.products)) {
        let update = { $set: {} };
        const currentProduct = (await productService.queryProduct({ _id: productId }));

        if (!currentProduct) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Product ${productId} not found.`)
        }

        const currentProductData = currentProduct.toObject();
        console.log('Current product: ', currentProductData)
        console.log('Current instances: ', currentProductData.instances)
        console.log('Current a000: ', currentProductData.instances.get('a000').toObject())
        console.log('Current a000 availability: ', currentProductData.instances.get('a000').toObject().availability)

        for (const [instanceId, instanceRental] of Object.entries(productRental.instances)) {
            if (!currentProductData.instances.get(instanceId)) {
                throw new ApiError(httpStatus.BAD_REQUEST, `Instance ${instanceId} for product ${productId} not found.`)
            }

            const currentInstanceAvailability = currentProductData.instances.get(instanceId).toObject().availability;

            console.log('instanceId: ', instanceId)
            console.log('instanceRental: ', instanceRental);
            console.log('Product instances: ', currentProduct.instances)
            validRentedRanges(currentInstanceAvailability, instanceRental.dateRanges, productId, instanceId)

            const newRanges = getNewRanges(currentInstanceAvailability, instanceRental.dateRanges)
            console.log('New ranges: ', newRanges)
            update.$set['instances.' + instanceId + '.availability'] = newRanges;

            for (let i = 0; i < instanceRental.dateRanges.length; i++) {
                instanceRental.dateRanges[i].price = instanceRental.dateRanges[i].price || computeDateRangePrice(instanceRental.dateRanges[i], currentInstanceAvailability);
            }
        }

        //update = {$set: {'instances.a000.availability.0.extra' : 2}}
        console.log('Update: ', update)

        updates[productId] = update;
    }

    rental.userId = req.body.userId || req.user.id;
    rental.approvedBy = req.body.approvedBy || null;

    rentalService.addRental(rental);

    for (const [productId, update] of Object.entries(updates)) {
        const filter = { _id: productId };
        productService.updateProduct(filter, update)
    }

    res.status(httpStatus.CREATED).send(rental);
})

const getRental = catchAsync(async (req, res) => {
    const { rentalId } = req.params;

    const filter = {
        _id: rentalId
    };
    let result = await rentalService.queryRental(filter);

    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Rental id not found');
    }

    res.send(result);
})

const getRentals = catchAsync(async (req, res) => {
    // TODO: Add filters
    const filter = {
    };
    
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const result = await rentalService.queryRentals(filter, null, options);
    res.send(result);
})

const updateRental = catchAsync(async (req, res) => {
    const { rentalId } = req.params;

    const filter = {
        _id: rentalId
    }

    const rental = req.body;

    verifyRentalRights(req.user, rental, false);

    // TODO: Updating rentals should change the availability of the products

    const result = await rentalService.updateRental(filter, rental);
    res.send(result);
})

const deleteRental = catchAsync(async (req, res) => {
    const { rentalId } = req.params;

    const filter = {
        _id: rentalId
    }

    const result = await rentalService.deleteRental(filter);
    res.send(result);
})

module.exports = {
    addRental,
    getRental,
    getRentals,
    updateRental,
    deleteRental
}