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
    result = JSON.parse(JSON.stringify(result));
    
    return harmonizeRecursive(result);
}

module.exports = {
    applyDiscounts,
    replaceDelete,
    harmonizeResult
}