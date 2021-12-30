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

module.exports = {
    applyDiscounts,
    replaceDelete
}