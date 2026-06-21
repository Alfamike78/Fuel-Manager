import React from 'react';
import { useTranslation } from 'react-i18next';

const FUEL_COLORS = {
  jet_a1: '#1a1a1a',
  avgas: '#dc2626',
  diesel: '#16a34a',
  gasoline: '#ca8a04',
};

const FUEL_LABELS = {
  jet_a1: 'fuel.jet_a1',
  avgas: 'fuel.avgas',
  diesel: 'fuel.diesel',
  gasoline: 'fuel.gasoline',
};

const FuelTypeBadge = ({ fuelType, size = 'md' }) => {
  const { t } = useTranslation();
  const color = FUEL_COLORS[fuelType] || '#6b7280';
  const label = FUEL_LABELS[fuelType] ? t(FUEL_LABELS[fuelType]) : fuelType;

  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${padding} rounded-full border border-gray-200 bg-white font-medium ${textSize} text-gray-700`}
    >
      <span
        className={`${dotSize} rounded-full flex-shrink-0`}
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
};

export default FuelTypeBadge;
