export const getRouterMode = () => {
  const mode = import.meta.env.VITE_ROUTER_MODE;
  return mode || 'hash';
};

export const isHashRouterMode = () => getRouterMode() === "hash";
