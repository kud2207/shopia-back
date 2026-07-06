/**
 ** Format currency
 */
export const formatCurrency = (value: any, currency: any) => {
    const abbreviations = ["", "k", "M", "B", "T"];
    const numDigits = Math.floor(Math.log10(Math.abs(value))) + 1;

    let revenue = value || 0;
    let abbreviationIndex = 0;

    if (numDigits > 3) {
        abbreviationIndex = Math.floor((numDigits - 1) / 3);
        revenue = value / Math.pow(10, abbreviationIndex * 3);
    }

    const formattedRevenue = revenue % 1 === 0 ? revenue.toFixed(0) : revenue.toFixed(2);

    return `${formattedRevenue}${abbreviations[abbreviationIndex]} ${currency || "FCFA"}`;
};

export const formatNumber = (number: any) => {
    if (typeof number !== 'number') {
        number = parseFloat(number);
    }

    if (!isNaN(number)) {
        if (Number.isInteger(number)) {
            return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        } else {
            return number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        }
    } else {
        return 0;
    }
};