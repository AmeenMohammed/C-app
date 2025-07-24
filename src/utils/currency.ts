export const currencySymbols: Record<string, string> = {
  EGP: 'E£',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SAR: 'ر.س',
  AED: 'د.إ',
};

export const formatPrice = (price: number, currency: string = 'EGP'): string => {
  const symbol = currencySymbols[currency] || currency;

  // Format the number with appropriate decimal places
  const formattedPrice = price.toLocaleString(undefined, {
    minimumFractionDigits: price % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `${symbol}${formattedPrice}`;
};

export const getCurrencyOptions = () => [
  { value: 'EGP', label: 'EGP - Egyptian Pound' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
  { value: 'AED', label: 'AED - UAE Dirham' },
];