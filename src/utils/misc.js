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

module.exports = {
    applyDiscounts
}