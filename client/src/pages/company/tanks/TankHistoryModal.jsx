import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Package } from 'lucide-react';
import Modal from '../../../components/ui/Modal.jsx';
import { getTankHistory } from '../../../api/tanks.js';

const TankHistoryModal = ({ isOpen, onClose, tank }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('operations');
  const [history, setHistory] = useState({ operations: [], loads: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && tank) {
      setLoading(true);
      getTankHistory(tank.id)
        .then((data) => setHistory(data))
        .catch(() => setHistory({ operations: [], loads: [] }))
        .finally(() => setLoading(false));
    }
  }, [isOpen, tank]);

  const fmt = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  const tabs = [
    { id: 'operations', label: 'Operations', icon: History },
    { id: 'loads', label: t('loads.title'), icon: Package },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('tanks.history')} — ${tank?.name || ''}`}
      size="xl"
    >
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4 -mt-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Operations tab */}
          {activeTab === 'operations' && (
            <div className="overflow-x-auto">
              {history.operations.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">No operations recorded for this tank.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4">Dest / Source</th>
                      <th className="pb-3 pr-4 text-right">Liters</th>
                      <th className="pb-3">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.operations.map((op) => {
                      const isSource = op.source_tank_id === tank?.id;
                      const destLabel = isSource
                        ? op.dest_aircraft_id
                          ? op.dest_aircraft_reg
                          : op.dest_vehicle_id
                          ? `${op.dest_vehicle_plate} ${op.dest_vehicle_name}`
                          : op.dest_tank_name || op.dest_type
                        : op.source_type === 'external'
                        ? op.external_source_name || 'External'
                        : 'Tank';
                      return (
                        <tr key={op.id} className="hover:bg-gray-50">
                          <td className="py-2.5 pr-4 text-gray-600 whitespace-nowrap">
                            {fmtDate(op.operation_date)}
                          </td>
                          <td className="py-2.5 pr-4">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                isSource
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {isSource ? 'Load Out' : 'Received'}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-gray-700">{destLabel || '—'}</td>
                          <td className="py-2.5 pr-4 text-right font-semibold text-gray-900">
                            {fmt(op.liters)} L
                          </td>
                          <td className="py-2.5 text-gray-500">
                            {op.operator_first_name} {op.operator_last_name}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Loads tab */}
          {activeTab === 'loads' && (
            <div className="overflow-x-auto">
              {history.loads.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">No loads recorded for this tank.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="pb-3 pr-4">{t('loads.date')}</th>
                      <th className="pb-3 pr-4">{t('loads.provider')}</th>
                      <th className="pb-3 pr-4 text-right">{t('loads.liters')}</th>
                      <th className="pb-3 pr-4">{t('loads.delivery_note')}</th>
                      <th className="pb-3">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.loads.map((load) => (
                      <tr key={load.id} className="hover:bg-gray-50">
                        <td className="py-2.5 pr-4 text-gray-600 whitespace-nowrap">
                          {fmtDate(load.load_date)}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-700">{load.provider_name || '—'}</td>
                        <td className="py-2.5 pr-4 text-right font-semibold text-gray-900">
                          {fmt(load.liters)} L
                        </td>
                        <td className="py-2.5 pr-4 text-gray-500">{load.delivery_note || '—'}</td>
                        <td className="py-2.5 text-gray-500">
                          {load.operator_first_name} {load.operator_last_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default TankHistoryModal;
