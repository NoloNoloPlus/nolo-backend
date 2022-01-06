const { format } = require('date-format-parse')

const applyDiscounts = (price, discounts) => {
    console.log('Received:', discounts)
    for (const discount of discounts) {
        if (discount.type === 'percentage') {
            price *= 1 - discount.value;
        } else {
            price -= discount.value;
        }
    }

    return price
}

const replaceDelete = (obj) => {
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
        obj[i] = replaceDelete(obj[i]);
        }
    } else if (typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
        console.log('Checking key:', key);
        if (obj[key] === '$delete') {
            delete obj[key];
        }
        else {
            obj[key] = replaceDelete(obj[key]);
        }
        }
    }
    return obj;
}

const harmonizeRecursive = (result) => {
    if (Array.isArray(result)) {
        for (let i = 0; i < result.length; i++) {
            result[i] = harmonizeRecursive(result[i]);
        }
    } else if (typeof result === 'object' && result != null) {
        for (const key of Object.keys(result)) {
            if (key === 'price') {
                result[key] = result[key].$numberDecimal;
            } else if (key === 'from' || key === 'to' || key === 'date') {
                result[key] = format(new Date(result[key]), 'YYYY-MM-DD');
            }
            else if (key === '_id') {
                result.id = result[key];
                delete result[key];
            }
            else if (key === '__v' || key === 'createdAt' || key === 'updatedAt') {
                delete result[key];
            }
            else {
                result[key] = harmonizeRecursive(result[key]);
            }
        }
    }

    return result;
}

const harmonizeResult = (result) => {
    if (result === undefined) {
        return undefined;
    }

    result = JSON.parse(JSON.stringify(result));
    
    return harmonizeRecursive(result);
}

const mapToObject = (map) => {
    /*return Array.from(map).reduce((obj, [key, value]) => (
        Object.assign(obj, { [key]: value }) // Be careful! Maps can have non-String keys; object literals can't.
    ), {});*/
    const obj = {};
    for (const key of map.keys()) {
        console.log('Key:', key);
        obj[key] = map.get(key);
    }

    return obj;
}

const mapToObjectRec = (obj) => {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (obj.toObject) {
        return mapToObjectRec(obj.toObject());
    }

    if (obj instanceof Map) {
        obj = mapToObject(obj);

        for (const key of Object.keys(JSON.parse(JSON.stringify(obj)))) {
            obj[key] = mapToObjectRec(obj[key]);
        }
    }
    else if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            obj[i] = mapToObjectRec(obj[i]);
        }
    }
    else if (typeof obj === 'object' && obj != null) {
        for (const key of Object.keys(obj)) {
            obj[key] = mapToObjectRec(obj[key]);
        }
    }

    return obj;
}

module.exports = {
    applyDiscounts,
    mapToObjectRec,
    replaceDelete,
    harmonizeResult
}