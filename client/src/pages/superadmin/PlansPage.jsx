import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, XCircle, Building2, TrendingUp } from 'lucide-react';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout.jsx';
import Card from '../../components/ui/Card.jsx';
import { getSuperAdminStats } from '../../api/superadmin.js';
import clsx from 'clsx';

const PLAN_GRADIENTS = [
  'from-yellow-400 to-amber-500',
  'from-blue-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-green-600',
];

const PlansPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSuperAdminStats()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const plans = data?.plans ?? [];
  const totalCompanies = data?.companies?.total ?? 0;
  const mrr = data?.mrr ?? 0;

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Piani abbonamento</h1>
          <p className="text-gray-500 text-sm mt-0.5">Panoramica dei piani e distribuzione aziende</p>
        </div>

        {/* MRR summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
              <p className="text-sm font-medium text-gray-500">MRR totale</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">€{mrr.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Da aziende con stato active</p>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <Building2 size={18} />
              </div>
              <p className="text-sm font-medium text-gray-500">Aziende su piano</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalCompanies}</p>
            <p className="text-xs text-gray-400 mt-1">Totale registrate</p>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center">
                <CreditCard size={18} />
              </div>
              <p className="text-sm font-medium text-gray-500">ARPU medio</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {totalCompanies > 0 ? `€${(mrr / totalCompanies).toFixed(0)}` : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Per azienda/mese</p>
          </Card>
        </div>

        {/* Plans grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {plans.map((plan, i) => (
              <div key={plan.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Plan header */}
                <div className={clsx('p-5 bg-gradient-to-br text-white', PLAN_GRADIENTS[i % PLAN_GRADIENTS.length])}>
                  <p className="font-bold text-lg">{plan.name}</p>
                  {plan.price_monthly > 0 ? (
                    <p className="text-2xl font-extrabold mt-1">
                      €{plan.price_monthly}
                      <span className="text-sm font-normal opacity-75">/mo</span>
                    </p>
                  ) : (
                    <p className="text-lg font-semibold mt-1 opacity-75">Gratuito</p>
                  )}
                </div>

                {/* Stats */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Aziende attive</span>
                    <span className="font-bold text-gray-900">{plan.company_count}</span>
                  </div>
                  {plan.company_count > 0 && totalCompanies > 0 && (
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full bg-gradient-to-r', PLAN_GRADIENTS[i % PLAN_GRADIENTS.length])}
                        style={{ width: `${(plan.company_count / totalCompanies) * 100}%` }}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm text-gray-600">Revenue/mo</span>
                    <span className="font-bold text-gray-900">
                      €{(plan.price_monthly * plan.company_count).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info note */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <CreditCard size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            I piani vengono assegnati alle aziende dalla pagina <strong>Gestione Aziende → Gestisci azienda</strong>.
            La modifica dei dettagli del piano (limiti, prezzi) richiede accesso diretto al database.
          </p>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default PlansPage;
