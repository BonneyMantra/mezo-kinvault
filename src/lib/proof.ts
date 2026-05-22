export const shortAddress = (value: string) => {
  if (!value.startsWith("0x") || value.length < 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};
