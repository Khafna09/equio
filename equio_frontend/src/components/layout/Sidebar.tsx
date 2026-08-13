import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, WalletCards, History, Target, Settings, CircleUserRound, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/authContextValue';
import { cn } from '../../utils/classNames';
import { useI18n } from '../../i18n/i18nContextValue';

export function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const navItems = [
    { label: t('common.dashboard'), icon: LayoutDashboard, href: '/' },
    { label: t('common.budgets'), icon: WalletCards, href: '/budgets' },
    { label: t('common.history'), icon: History, href: '/history' },
    { label: t('common.savingsGoals'), icon: Target, href: '/savings' },
  ];

  const bottomNavItems = [
    { label: t('common.settings'), icon: Settings, href: '/settings' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col border-r border-neutral-200/60 dark:border-neutral-800 sticky top-0 transition-colors duration-300">
      <div className="h-24 flex items-center px-8 border-b border-neutral-200/60 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white font-bold text-xl shadow-sm">
            E
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Equio</h1>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500">{t('sidebar.personalFinance')}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all group',
              isActive
                ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  'w-5 h-5 transition-colors',
                  isActive ? 'text-primary-500 dark:text-primary-400' : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'
                )} />
                {item.label}
                {isActive && (
                  <div className="absolute left-0 w-1 h-8 bg-primary-500 rounded-r-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 space-y-2">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all group',
              isActive
                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
            )}
          >
            <item.icon className="w-5 h-5 text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300" />
            {item.label}
          </NavLink>
        ))}

        <div className="mt-6 p-5 bg-neutral-100 dark:bg-neutral-800/60 rounded-3xl">
          <div className="w-10 h-10 bg-white dark:bg-neutral-700 rounded-full flex items-center justify-center mb-3 shadow-sm text-primary-500 dark:text-primary-400">
            <Target className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-3 leading-relaxed">
            {t('sidebar.unlockAnalytics')}
          </p>
          <button className="w-full bg-primary-500 text-white rounded-xl py-2 text-sm font-semibold hover:bg-primary-600 transition-colors">
            {t('sidebar.upgradePro')}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between px-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold overflow-hidden flex-shrink-0">
              {user?.firstName?.charAt(0) || <CircleUserRound className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName}` : t('common.user')}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user?.email || 'user@equio.com'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-tertiary-500 dark:hover:text-tertiary-400 hover:bg-tertiary-50 dark:hover:bg-tertiary-950/30 rounded-lg transition-colors flex-shrink-0"
            title={t('common.logout')}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
