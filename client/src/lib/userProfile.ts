import { useState, useEffect } from "react";

export type IndustryVertical = 'agricola' | 'forestal' | 'acuicola' | 'ganadero' | 'fruticola';

export interface UserProfileData {
  nombre: string;
  email: string;
  organizacion: string;
  telefono: string;
  vertical: IndustryVertical;
  superficieHectareas: number;
  regionUbicacion: string;
  preferenciaInforme: 'copernicus' | 'mckinsey' | 'tecnico';
  notasTerreno: string;
}

const DEFAULT_PROFILE: UserProfileData = {
  nombre: "Usuario AgroPulso",
  email: "demo@agropulso.com",
  organizacion: "Agrícola & Forestal Valle Central",
  telefono: "+56 9 8765 4321",
  vertical: "forestal",
  superficieHectareas: 250,
  regionUbicacion: "Región del Maule / Biobío, Chile",
  preferenciaInforme: "mckinsey",
  notasTerreno: "Predio Mixto con pino radiata, eucaliptus y áreas de cultivo de maíz en transición. Interés alto en índice de dosel, humedad de suelo por radar y estrés hídrico.",
};

const STORAGE_KEY = "agropulso_user_profile_v1";

export function getUserProfile(): UserProfileData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfileData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event("agropulso_profile_updated"));
  } catch (e) {
    console.error("Error saving user profile", e);
  }
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfileData>(getUserProfile());

  useEffect(() => {
    const handleUpdate = () => {
      setProfile(getUserProfile());
    };
    window.addEventListener("agropulso_profile_updated", handleUpdate);
    return () => window.removeEventListener("agropulso_profile_updated", handleUpdate);
  }, []);

  const updateProfile = (newProfile: UserProfileData) => {
    saveUserProfile(newProfile);
    setProfile(newProfile);
  };

  return { profile, updateProfile };
}

export const VERTICAL_DETAILS: Record<IndustryVertical, {
  label: string;
  iconName: string;
  satellites: string[];
  description: string;
  recommendedReports: string[];
}> = {
  agricola: {
    label: "Agrícola Tradicional / Cereales",
    iconName: "Sprout",
    satellites: ["Sentinel-2 Multispectral", "Sentinel-1 Radar"],
    description: "Enfocado en biomasa, fenología, vigor vegetativo (NDVI, EVI) y detección de clorofila para cultivos extensivos.",
    recommendedReports: ["Informe de Salud Vegetal Sentinel-2", "Monitoreo de Nitrógeno y Clorofila", "Informe Ejecutivo McKinsey"],
  },
  forestal: {
    label: "Forestal / Madera & Biomasa",
    iconName: "Trees",
    satellites: ["Sentinel-2 Optical (NDVI/NDMI)", "Sentinel-1 C-Band Radar"],
    description: "Evaluación de cobertura de dosel, riesgo de incendios (estrés hídrico NDMI), tala no autorizada y penetración de nubes con radar.",
    recommendedReports: ["Informe de Cobertura de Dosel Forestal", "Análisis de Penetración Radar C-Band", "McKinsey Forestry Briefing"],
  },
  acuicola: {
    label: "Acuícola / Calidad de Agua y Costas",
    iconName: "Waves",
    satellites: ["Sentinel-3 OLCI / SLSTR", "Sentinel-2 High-Res Water (NDWI)"],
    description: "Monitoreo de temperatura superficial del agua (LST), clorofila-a en balsas/embalses, turbidez y florecimiento de algas nocivas (FAN).",
    recommendedReports: ["Informe de Calidad de Agua y LST Sentinel-3", "Análisis NDWI de Espejo de Agua", "Resumen Ejecutivo Acuícola"],
  },
  ganadero: {
    label: "Ganadero / Pasturas & Pastizales",
    iconName: "Grass",
    satellites: ["Sentinel-2 NDVI", "Sentinel-1 Moisture Radar"],
    description: "Evaluación de oferta forrajera, regeneración de pastizales post-pastoreo y humedad radicular del suelo.",
    recommendedReports: ["Informe de Oferta Forrajera y Pastizales", "Humedad de Suelo Radar", "Plan de Pastoreo Rotativo"],
  },
  fruticola: {
    label: "Frutícola / Cultivos de Alto Valor",
    iconName: "Apple",
    satellites: ["Sentinel-2 High-Resolution 10m", "Sentinel-3 Climate"],
    description: "Detección de heterogeneidad intra-huerto, estrés térmico en floración y balance hídrico de precisión.",
    recommendedReports: ["Informe Frutícola de Precisión", "Análisis de Vigor por Cuartel", "Estrés Térmico y Heladas"],
  },
};
