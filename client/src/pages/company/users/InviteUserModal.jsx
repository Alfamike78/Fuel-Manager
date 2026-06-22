import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, UserPlus } from 'lucide-react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import { inviteUser } from '../../../api/users.js';

const InviteUserModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('operator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await inviteUser({ email, role });
      setInviteLink(res.data.invite_link);
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setEmail('');
    setRole('operator');
    setError(null);
    setInviteLink(null);
    setCopied(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('users.invite_title')}>
      {!inviteLink ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert type="error" message={error} />}

          <Input
            label={t('auth.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@azienda.com"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('users.role')}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="operator">{t('roles.operator')}</option>
              <option value="admin">{t('roles.admin')}</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              <UserPlus size={16} />
              {t('users.invite_send')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <Alert type="success" message={t('users.invite_created')} />

          <div>
            <p className="text-sm text-gray-600 mb-2">{t('users.invite_link_desc')}</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono truncate"
              />
              <button
                onClick={handleCopy}
                className="flex-shrink-0 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title={t('users.copy_link')}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            {copied && (
              <p className="text-xs text-green-600 mt-1">{t('users.link_copied')}</p>
            )}
          </div>

          <p className="text-xs text-gray-500">{t('users.invite_expires')}</p>

          <Button onClick={handleClose} className="w-full">
            {t('common.confirm')}
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default InviteUserModal;
