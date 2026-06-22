import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, FileSpreadsheet, FileText, Plane, Truck,
  Gauge, Fuel, CheckCircle, XCircle, Download, RefreshCw,
} from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout.jsx';
import Button from '../../../components/ui/Button.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import FuelTypeBadge from '../../../components/tanks/FuelTypeBadge.jsx';
import TankLevelBar from '../../../components/tanks/TankLevelBar.jsx';
import {
  getFuelingReport, getTanksReport, getQCReport,
  getOperatorsList, buildExcelUrl, buildPdfUrl,
} from '../../../api/reports.js';

const TABS = ['fueling', 'tanks', 'qc'];

const destIcon = (type) => {
  if (type === 'aircraft') return <Plane size={13} className="text-sky-500" />;
  if (type === 'ground_vehicle') return <Truck size={13} className="text-green-500" />;
  return <Gauge size={13} className="text-blue-400" />;
};

const destLabel = (op) => {
  if (op.dest_type === 'aircraft') return op.dest_aircraft_reg || '—';
  if (op.dest_type === 'ground_vehicle')
    return `${op.dest_vehicle_plate || '—'} ${op.dest_vehicle_name ? `(${op.dest_vehicle_name})` : ''}`.trim();
  return op.dest_tank_name || '—';
};

const ReportsPage = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('fueling');

  // filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [destType, setDestType] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [operatorId, setOperatorId] = useState('');

  // data
  const [fuelingData, setFuelingData] = useState(null);
  const [tanksData, setTanksData] = useState(null);
  const [qcData, setQcData] = useState(null);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getOperatorsList().then(setOperators).catch(() => {});
  }, []);

  const fetchCurrent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'fueling') {
        const params = {};
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        if (destType) params.dest_type = destType;
        if (fuelType) params.fuel_type = fuelType;
        if (operatorId) params.operator_id = operatorId;
        const res = await getFuelingReport(params);
        setFuelingData(res);
      } else if (tab === 'tanks') {
        const res = await getTanksReport();
        setTanksData(res);
      } else {
        const params = {};
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        const res = await getQCReport(params);
        setQcData(res);
      }
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [tab, dateFrom, dateTo, destType, fuelType, operatorId, t]);

  useEffect(() => { fetchCurrent(); }, [fetchCurrent]);

  const getExportParams = () => {
    const params = { type: tab };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (destType) params.dest_type = destType;
    if (fuelType) params.fuel_type = fuelType;
    if (operatorId) params.operator_id = operatorId;
    return params;
  };

  const handleExcelExport = () => window.open(buildExcelUrl(getExportParams()), '_blank');
  const handlePdfExport = () => window.open(buildPdfUrl(getExportParams()), '_blank');

  const resetFilters = () => {
    setDateFrom(''); setDateTo(''); setDestType(''); setFuelType(''); setOperatorId('');
  };
  const hasFilters = dateFrom || dateTo || destType || fuelType || operatorId;

  const formatDate = (d) =>
    new Date(d).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={24} className="text-blue-600" />
              {t('reports.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('reports.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExcelExport}>
              <FileSpreadsheet size={15} className="text-green-600" />
              {t('reports.export_excel')}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePdfExport}>
              <FileText size={15} className="text-red-500" />
              {t('reports.export_pdf')}
            </Button>
          </div>
        </div>

        {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {TABS.map((t_) => (
            <button
              key={t_}
              onClick={() => setTab(t_)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t_
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t_==='fueling' && <><Fuel size={14} className="inline mr-1.5 mb-0.5" />{t('reports.tab_fueling')}</>}
              {t_==='tanks'   && <><Gauge size={14} className="inline mr-1.5 mb-0.5" />{t('reports.tab_tanks')}</>}
              {t_==='qc'      && <><CheckCircle size={14} className="inline mr-1.5 mb-0.5" />{t('reports.tab_qc')}</>}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-xl border border-gray-200">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-600">{t('operations.filter_from')}</label>
            <input type="date" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-600">{t('operations.filter_to')}</label>
            <input type="date" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {tab === 'fueling' && (
            <>
              <select value={destType} onChange={(e) => setDestType(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('operations.all_dest')}</option>
                <option value="aircraft">{t('dashboard.aircraft')}</option>
                <option value="ground_vehicle">{t('dashboard.vehicles')}</option>
                <option value="tank">{t('dashboard.tanks')}</option>
              </select>
              <select value={fuelType} onChange={(e) => setFuelType(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('reports.all_fuels')}</option>
                <option value="jet_a1">JET A-1</option>
                <option value="avgas">AVGAS</option>
                <option value="diesel">Diesel</option>
                <option value="gasoline">Benzina</option>
              </select>
              <select value={operatorId} onChange={(e) => setOperatorId(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('reports.all_operators')}</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>{op.first_name} {op.last_name}</option>
                ))}
              </select>
            </>
          )}

          <button onClick={fetchCurrent}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" title={t('common.search')}>
            <RefreshCw size={15} />
          </button>
          {hasFilters && (
            <button onClick={resetFilters}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
              {t('common.filter')} ✕
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── FUELING TAB ────────────────────────────────────────────── */}
            {tab === 'fueling' && fuelingData && (
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SummaryCard
                    label={t('reports.total_ops')}
                    value={parseInt(fuelingData.summary?.total_ops || 0)}
                    icon={<Fuel size={18} className="text-blue-500" />}
                    color="blue"
                  />
                  <SummaryCard
                    label={t('reports.total_liters')}
                    value={`${parseFloat(fuelingData.summary?.total_liters || 0).toFixed(1)} L`}
                    icon={<Gauge size={18} className="text-indigo-500" />}
                    color="indigo"
                  />
                  <SummaryCard
                    label={t('reports.aircraft_ops')}
                    value={fuelingData.data.filter((o) => o.dest_type === 'aircraft').length}
                    icon={<Plane size={18} className="text-sky-500" />}
                    color="sky"
                  />
                  <SummaryCard
                    label={t('reports.vehicle_ops')}
                    value={fuelingData.data.filter((o) => o.dest_type === 'ground_vehicle').length}
                    icon={<Truck size={18} className="text-green-500" />}
                    color="green"
                  />
                </div>

                {/* Table */}
                {fuelingData.data.length === 0 ? (
                  <EmptyState icon={<Fuel size={40} />} message={t('operations.empty')} />
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <Th>{t('operations.date')}</Th>
                            <Th>{t('operations.source')}</Th>
                            <Th>{t('operations.destination')}</Th>
                            <Th>{t('operations.fuel')}</Th>
                            <Th right>{t('operations.liters')}</Th>
                            <Th>{t('operations.operator')}</Th>
                            <Th>{t('reports.notes')}</Th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {fuelingData.data.map((op) => (
                            <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap text-xs">{formatDate(op.operation_date)}</td>
                              <td className="px-4 py-2.5 text-gray-700 max-w-[140px] truncate">
                                {op.source_type === 'tank' ? op.source_tank_name : op.external_source_name}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1">
                                  {destIcon(op.dest_type)}
                                  <span className="text-gray-700">{destLabel(op)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <FuelTypeBadge fuelType={op.fuel_type} size="xs" />
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                                {parseFloat(op.liters).toFixed(1)} L
                              </td>
                              <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                                {op.operator_first_name} {op.operator_last_name}
                              </td>
                              <td className="px-4 py-2.5 text-gray-400 text-xs max-w-[160px] truncate">
                                {op.notes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {fuelingData.data.length} {t('reports.rows')}
                      </span>
                      <span className="text-sm font-bold text-gray-800">
                        {t('reports.total')}: {parseFloat(fuelingData.summary?.total_liters || 0).toFixed(1)} L
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TANKS TAB ──────────────────────────────────────────────── */}
            {tab === 'tanks' && tanksData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SummaryCard
                    label={t('reports.total_tanks')}
                    value={tanksData.data.length}
                    icon={<Gauge size={18} className="text-blue-500" />}
                    color="blue"
                  />
                  <SummaryCard
                    label={t('reports.total_capacity')}
                    value={`${tanksData.data.reduce((s, t) => s + parseFloat(t.capacity_liters), 0).toFixed(0)} L`}
                    icon={<Gauge size={18} className="text-indigo-500" />}
                    color="indigo"
                  />
                  <SummaryCard
                    label={t('reports.total_stored')}
                    value={`${tanksData.data.reduce((s, t) => s + parseFloat(t.current_liters), 0).toFixed(0)} L`}
                    icon={<Fuel size={18} className="text-green-500" />}
                    color="green"
                  />
                  <SummaryCard
                    label={t('reports.total_dispensed')}
                    value={`${tanksData.data.reduce((s, t) => s + parseFloat(t.total_dispensed || 0), 0).toFixed(0)} L`}
                    icon={<Download size={18} className="text-orange-500" />}
                    color="orange"
                  />
                </div>

                {tanksData.data.length === 0 ? (
                  <EmptyState icon={<Gauge size={40} />} message={t('tanks.empty')} />
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <Th>{t('tanks.code')}</Th>
                            <Th>{t('tanks.name')}</Th>
                            <Th>{t('bases.title')}</Th>
                            <Th>{t('tanks.fuel_type')}</Th>
                            <Th right>{t('tanks.capacity')}</Th>
                            <Th right>{t('tanks.current_level')}</Th>
                            <Th>{t('reports.fill_pct')}</Th>
                            <Th right>{t('reports.dispensed_total')}</Th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {tanksData.data.map((tank) => {
                            const pct = tank.capacity_liters > 0
                              ? (parseFloat(tank.current_liters) / parseFloat(tank.capacity_liters)) * 100 : 0;
                            return (
                              <tr key={tank.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{tank.code}</td>
                                <td className="px-4 py-2.5 font-medium text-gray-800">{tank.name}</td>
                                <td className="px-4 py-2.5 text-gray-500 text-xs">{tank.base_name || '—'}</td>
                                <td className="px-4 py-2.5">
                                  <FuelTypeBadge fuelType={tank.fuel_type} size="xs" />
                                </td>
                                <td className="px-4 py-2.5 text-right text-gray-600">
                                  {parseFloat(tank.capacity_liters).toLocaleString()} L
                                </td>
                                <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                                  {parseFloat(tank.current_liters).toLocaleString()} L
                                </td>
                                <td className="px-4 py-2.5 min-w-[120px]">
                                  <TankLevelBar current={tank.current_liters} capacity={tank.capacity_liters} />
                                </td>
                                <td className="px-4 py-2.5 text-right text-gray-500">
                                  {parseFloat(tank.total_dispensed || 0).toLocaleString()} L
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── QC TAB ─────────────────────────────────────────────────── */}
            {tab === 'qc' && qcData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SummaryCard
                    label={t('reports.qc_total')}
                    value={parseInt(qcData.summary?.total || 0)}
                    icon={<CheckCircle size={18} className="text-blue-500" />}
                    color="blue"
                  />
                  <SummaryCard
                    label={t('reports.qc_compliant')}
                    value={parseInt(qcData.summary?.compliant || 0)}
                    icon={<CheckCircle size={18} className="text-green-500" />}
                    color="green"
                  />
                  <SummaryCard
                    label={t('reports.qc_non_compliant')}
                    value={parseInt(qcData.summary?.non_compliant || 0)}
                    icon={<XCircle size={18} className="text-red-500" />}
                    color="red"
                  />
                  <SummaryCard
                    label={t('reports.qc_drained')}
                    value={`${parseFloat(qcData.summary?.total_drained || 0).toFixed(1)} L`}
                    icon={<Gauge size={18} className="text-orange-500" />}
                    color="orange"
                  />
                </div>

                {qcData.data.length === 0 ? (
                  <EmptyState icon={<CheckCircle size={40} />} message={t('qc.empty')} />
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <Th>{t('qc.date')}</Th>
                            <Th>{t('qc.subject_type')}</Th>
                            <Th>{t('qc.subject')}</Th>
                            <Th right>{t('qc.liters_drained')}</Th>
                            <Th>{t('qc.result')}</Th>
                            <Th>{t('operations.operator')}</Th>
                            <Th>{t('reports.notes')}</Th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {qcData.data.map((qc) => (
                            <tr key={qc.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap text-xs">
                                {new Date(qc.check_date).toLocaleDateString('it-IT')}
                              </td>
                              <td className="px-4 py-2.5 text-gray-600 text-xs capitalize">{qc.subject_type}</td>
                              <td className="px-4 py-2.5 font-medium text-gray-800">
                                {qc.tank_name || qc.aircraft_registration || '—'}
                              </td>
                              <td className="px-4 py-2.5 text-right text-gray-700">
                                {parseFloat(qc.liters_drained).toFixed(1)} L
                              </td>
                              <td className="px-4 py-2.5">
                                {qc.is_compliant ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                    <CheckCircle size={11} /> {t('qc.compliant')}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                                    <XCircle size={11} /> {t('qc.non_compliant')}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                                {qc.operator_first_name} {qc.operator_last_name}
                              </td>
                              <td className="px-4 py-2.5 text-gray-400 text-xs max-w-[200px] truncate">
                                {qc.notes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                      <span className="text-xs text-gray-500">{qcData.data.length} {t('reports.rows')}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

// ── sub-components ──────────────────────────────────────────────────────────

const Th = ({ children, right }) => (
  <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
);

const SummaryCard = ({ label, value, icon, color }) => {
  const colors = {
    blue:   'bg-blue-50 border-blue-100',
    indigo: 'bg-indigo-50 border-indigo-100',
    sky:    'bg-sky-50 border-sky-100',
    green:  'bg-green-50 border-green-100',
    orange: 'bg-orange-50 border-orange-100',
    red:    'bg-red-50 border-red-100',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.blue}`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-gray-500">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

const EmptyState = ({ icon, message }) => (
  <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl border border-gray-200">
    <div className="opacity-30 mb-3">{icon}</div>
    <p className="font-medium text-gray-500">{message}</p>
  </div>
);

export default ReportsPage;
