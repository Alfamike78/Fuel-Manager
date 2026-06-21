import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Shield, ShieldOff, Trash2, Users } from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout.jsx';
import Button from '../../../components/ui/Button.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import { getUsers, updateUserRole, updateUserStatus, deleteUser } from '../../../api/users.js';
import InviteUserModal from './InviteUserModal.jsx';

const RoleBadge = ({ role }) => {
  const { t } = useTranslation();
  const styles = {
    admin: 'bg-blue-100 text-blue-700',
    operator: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[role] || styles.operator}`}>
      {t(`roles.${role}`)}
    </span>
  );
};

const StatusBadge = ({ isActive }) => {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {isActive ? t('users.active') : t('users.suspended')}
    </span>
  );
};

const UsersPage = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setActionError(null);
    try {
      const res = await updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...res.data } : u)));
    } catch (err) {
      setActionError(err.response?.data?.error || t('common.error'));
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    setActionError(null);
    try {
      const res = await updateUserStatus(userId, !currentStatus);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...res.data } : u)));
    } catch (err) {
      setActionError(err.response?.data?.error || t('common.error'));
    }
  };

  const handleDelete = async (userId) => {
    setActionError(null);
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setConfirmDelete(null);
    } catch (err) {
      setActionError(err.response?.data?.error || t('common.error'));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('users.subtitle')}</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus size={16} />
              {t('users.invite')}
            </Button>
          )}
        </div>

        {actionError && (
          <Alert type="error" message={actionError} onClose={() => setActionError(null)} />
        )}

        {/* User list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert type="error" message={error} />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users size={40} className="mb-3 opacity-30" />
              <p className="font-medium">{t('users.empty')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">{t('users.name')}</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">{t('auth.email')}</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">{t('users.role')}</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">{t('users.status')}</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">{t('users.last_login')}</th>
                    {isAdmin && (
                      <th className="text-right px-6 py-3 font-medium text-gray-500">{t('users.actions')}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {u.first_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {u.first_name} {u.last_name}
                              {u.id === currentUser?.id && (
                                <span className="ml-2 text-xs text-blue-500">({t('users.you')})</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{u.email}</td>
                      <td className="px-6 py-4">
                        {isAdmin && u.id !== currentUser?.id ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="operator">{t('roles.operator')}</option>
                            <option value="admin">{t('roles.admin')}</option>
                          </select>
                        ) : (
                          <RoleBadge role={u.role} />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge isActive={u.is_active} />
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {u.last_login
                          ? new Date(u.last_login).toLocaleDateString()
                          : t('users.never_logged_in')}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {u.id !== currentUser?.id && (
                              <>
                                <button
                                  onClick={() => handleStatusToggle(u.id, u.is_active)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    u.is_active
                                      ? 'text-amber-500 hover:bg-amber-50'
                                      : 'text-green-500 hover:bg-green-50'
                                  }`}
                                  title={u.is_active ? t('users.suspend') : t('users.activate')}
                                >
                                  {u.is_active ? <ShieldOff size={16} /> : <Shield size={16} />}
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(u)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title={t('users.delete')}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Invite modal */}
      <InviteUserModal
        isOpen={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          fetchUsers();
        }}
      />

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('users.delete_confirm_title')}</h3>
            <p className="text-gray-600 text-sm mb-6">
              {t('users.delete_confirm_desc', {
                name: `${confirmDelete.first_name} ${confirmDelete.last_name}`,
              })}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setConfirmDelete(null)} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => handleDelete(confirmDelete.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500"
              >
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default UsersPage;
