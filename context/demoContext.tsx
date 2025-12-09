import React, { createContext, useContext, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type DemoContextType = {
  isDemoMode: boolean;
  toggleDemoMode: () => Promise<void>;
};

const DemoContext = createContext<DemoContextType>({
  isDemoMode: false,
  toggleDemoMode: async () => {},
});

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  const toggleDemoMode = async () => {
    const newValue = !isDemoMode;
    setIsDemoMode(newValue);
    await AsyncStorage.setItem("isDemoMode", JSON.stringify(newValue));
  };

  return (
    <DemoContext.Provider value={{ isDemoMode, toggleDemoMode }}>
      {children}
    </DemoContext.Provider>
  );
}

export const useDemo = () => useContext(DemoContext);
