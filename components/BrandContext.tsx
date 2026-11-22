"use client";

import React, { createContext, useContext } from "react";

const BrandContext = createContext<{ hasShuLogo: boolean }>({ hasShuLogo: false });

export function BrandProvider({
  children,
  hasShuLogo = false,
}: {
  children: React.ReactNode;
  hasShuLogo?: boolean;
}) {
  return <BrandContext.Provider value={{ hasShuLogo }}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  return useContext(BrandContext);
}
