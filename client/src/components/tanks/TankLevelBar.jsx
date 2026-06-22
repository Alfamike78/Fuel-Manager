import React from 'react';

const TankLevelBar = ({ current, capacity, threshold }) => {
  const safeCapacity = parseFloat(capacity) || 1;
  const safeCurrent = parseFloat(current) || 0;
  const percentage = Math.min(100, Math.max(0, (safeCurrent / safeCapacity) * 100));
  const thresholdPct = threshold
    ? Math.min(100, Math.max(0, (parseFloat(threshold) / safeCapacity) * 100))
    : null;

  let barColor = 'bg-green-500';
  if (percentage < 20 || (threshold && safeCurrent <= parseFloat(threshold))) {
    barColor = 'bg-red-500';
  } else if (percentage < 50) {
    barColor = 'bg-yellow-500';
  }

  const fmt = (n) =>
    Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="w-full">
      <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
        {thresholdPct !== null && (
          <div
            className="absolute top-0 h-full w-0.5 bg-orange-400 opacity-80"
            style={{ left: `${thresholdPct}%` }}
            title={`Min threshold: ${fmt(threshold)} L`}
          />
        )}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-500">
          {fmt(safeCurrent)} L / {fmt(safeCapacity)} L
        </span>
        <span
          className={`text-xs font-semibold ${
            barColor === 'bg-red-500'
              ? 'text-red-600'
              : barColor === 'bg-yellow-500'
              ? 'text-yellow-600'
              : 'text-green-600'
          }`}
        >
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

export default TankLevelBar;
