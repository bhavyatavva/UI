import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react';
import { STAKEHOLDER_ROLES } from '../data/mockBankingData';
import { StakeholderId, StakeholderRole } from '../types/basel';
import { BankLogo } from './BankLogo';

export interface RegisteredAccount {
  userId: string;
  fullName: string;
  email: string;
  department: string;
  roleId: StakeholderId;
  password: string;
}

interface LoginPageProps {
  initialRoleId?: StakeholderId;
  onLoginSuccess: (roleId: StakeholderId, enteredUserId: string, displayName?: string) => void;
  onBackToLanding: () => void;
}

const STORAGE_KEY = 'hdfc_basel4_accounts_v1';

const DEFAULT_ACCOUNTS: RegisteredAccount[] = [
  {
    userId: 'HDFC-RPT-1042',
    fullName: 'Ananya Deshmukh',
    email: 'ananya.deshmukh@hdfcbank.com',
    department: 'Regulatory Reporting Cell',
    roleId: 'reporting-analyst',
    password: 'Basel4@HDFC2026',
  },
  {
    userId: 'HDFC-DQA-2018',
    fullName: 'Rohan Kulkarni',
    email: 'rohan.kulkarni@hdfcbank.com',
    department: 'Enterprise Data Governance',
    roleId: 'data-quality-analyst',
    password: 'Basel4@HDFC2026',
  },
  {
    userId: 'HDFC-OPS-3005',
    fullName: 'Vikram Nair',
    email: 'vikram.nair@hdfcbank.com',
    department: 'Banking Operations & IT',
    roleId: 'data-ops-analyst',
    password: 'Basel4@HDFC2026',
  },
  {
    userId: 'HDFC-RSK-4011',
    fullName: 'Meera Iyer',
    email: 'meera.iyer@hdfcbank.com',
    department: 'Integrated Risk Management',
    roleId: 'risk-analyst',
    password: 'Basel4@HDFC2026',
  },
  {
    userId: 'HDFC-FIN-5002',
    fullName: 'Siddharth Menon',
    email: 'siddharth.menon@hdfcbank.com',
    department: 'Finance & General Ledger Control',
    roleId: 'finance-approver',
    password: 'Basel4@HDFC2026',
  },
  {
    userId: 'HDFC-MGR-6001',
    fullName: 'Kavita Krishnan',
    email: 'kavita.krishnan@hdfcbank.com',
    department: 'Regulatory Reporting Leadership',
    roleId: 'reporting-manager',
    password: 'Basel4@HDFC2026',
  },
  {
    userId: 'HDFC-CMP-7009',
    fullName: 'Arjun Malhotra',
    email: 'arjun.malhotra@hdfcbank.com',
    department: 'Compliance & RBI Affairs',
    roleId: 'compliance-officer',
    password: 'Basel4@HDFC2026',
  },
  {
    userId: 'HDFC-AUD-8014',
    fullName: 'Priya Chatterjee',
    email: 'priya.chatterjee@hdfcbank.com',
    department: 'Internal Audit & Assurance',
    roleId: 'auditor',
    password: 'Basel4@HDFC2026',
  },
  {
    userId: 'HDFC-ADM-9001',
    fullName: 'Deepak Verma',
    email: 'deepak.verma@hdfcbank.com',
    department: 'Banking Platform Admin',
    roleId: 'reg-admin',
    password: 'Basel4@HDFC2026',
  },
  {
    userId: 'HDFC-IT-0001',
    fullName: 'Suresh Subramanian',
    email: 'suresh.subramanian@hdfcbank.com',
    department: 'IT Infrastructure & Identity Access',
    roleId: 'super-admin',
    password: 'Basel4@HDFC2026',
  },
  {
    userId: 'RBI-DOS-4410',
    fullName: 'Dr. S. Raghuraman',
    email: 's.raghuraman@rbi.org.in',
    department: 'Reserve Bank of India · DoS',
    roleId: 'rbi-supervisor',
    password: 'Basel4@HDFC2026',
  },
];

function loadAccounts(): RegisteredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const missing = DEFAULT_ACCOUNTS.filter(
          (def) => !parsed.some((p: RegisteredAccount) => p.userId === def.userId)
        );
        return [...parsed, ...missing];
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_ACCOUNTS;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  initialRoleId = 'reporting-analyst',
  onLoginSuccess,
  onBackToLanding,
}) => {
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot' | 'password'>('login');
  const [accounts, setAccounts] = useState<RegisteredAccount[]>(loadAccounts);

  // Login Form State (strictly blank by default — no prefilled credentials)
  const [selectedRoleId, setSelectedRoleId] = useState<StakeholderId>(initialRoleId);
  const [userId, setUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberId, setRememberId] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Forgot Password State (2-step User ID + Email + OTP verification)
  const [fpUserId, setFpUserId] = useState('');
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtpSent, setFpOtpSent] = useState<string | null>(null);
  const [fpOtpInput, setFpOtpInput] = useState('');
  const [fpNewPwd, setFpNewPwd] = useState('');
  const [fpConfirmPwd, setFpConfirmPwd] = useState('');
  const [fpMessage, setFpMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regUserId, setRegUserId] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRoleId, setRegRoleId] = useState<StakeholderId>('reporting-analyst');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regMessage, setRegMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Password Management State
  const [pwdUserId, setPwdUserId] = useState('');
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdMessage, setPwdMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch {
      // ignore storage errors
    }
  }, [accounts]);

  const selectedRole: StakeholderRole =
    STAKEHOLDER_ROLES.find((r) => r.id === selectedRoleId) || STAKEHOLDER_ROLES[0];

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = userId.trim();
    if (!trimmed) {
      setLoginError('Please enter your assigned User ID or official Email.');
      return;
    }
    if (password.length < 6) {
      setLoginError('Password must be at least 6 characters.');
      return;
    }

    const found = accounts.find(
      (a) =>
        a.userId.toLowerCase() === trimmed.toLowerCase() ||
        a.email.toLowerCase() === trimmed.toLowerCase()
    );

    if (!found || found.password !== password) {
      setLoginError('Invalid User ID/Email or password. Use Forgot Password if needed.');
      return;
    }

    setLoginError(null);
    onLoginSuccess(found.roleId, found.userId, found.fullName);
  };

  const handleRequestResetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = fpUserId.trim().toLowerCase();
    const cleanEmail = fpEmail.trim().toLowerCase();
    const target = accounts.find(
      (a) => a.userId.toLowerCase() === cleanId && a.email.toLowerCase() === cleanEmail
    );
    if (!target) {
      setFpOtpSent(null);
      setFpMessage({
        type: 'err',
        text: 'User ID and Official Email do not match an active HDFC Bank / RBI account.',
      });
      return;
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    setFpOtpSent(otp);
    setFpMessage({
      type: 'ok',
      text: `Verification code generated for ${target.userId}. Enter OTP ${otp} below with your new password.`,
    });
  };

  const handleConfirmForgotReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpOtpSent || fpOtpInput.trim() !== fpOtpSent) {
      setFpMessage({ type: 'err', text: 'Invalid 6-digit verification OTP.' });
      return;
    }
    if (fpNewPwd.length < 8) {
      setFpMessage({ type: 'err', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (fpNewPwd !== fpConfirmPwd) {
      setFpMessage({ type: 'err', text: 'New password and confirmation do not match.' });
      return;
    }
    const cleanId = fpUserId.trim().toLowerCase();
    setAccounts((prev) =>
      prev.map((a) => (a.userId.toLowerCase() === cleanId ? { ...a, password: fpNewPwd } : a))
    );
    setFpOtpSent(null);
    setFpOtpInput('');
    setFpNewPwd('');
    setFpConfirmPwd('');
    setPassword('');
    setFpMessage({
      type: 'ok',
      text: `Password reset complete for ${fpUserId.trim().toUpperCase()}. Please Sign In with your new password.`,
    });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = regUserId.trim().toUpperCase();
    if (!regName.trim() || !cleanId || !regEmail.trim()) {
      setRegMessage({ type: 'err', text: 'Please fill in Full Name, User ID, and Email.' });
      return;
    }
    if (regPassword.length < 6) {
      setRegMessage({ type: 'err', text: 'Password must be at least 6 characters long.' });
      return;
    }
    if (regPassword !== regConfirm) {
      setRegMessage({ type: 'err', text: 'Passwords do not match.' });
      return;
    }
    if (accounts.some((a) => a.userId.toLowerCase() === cleanId.toLowerCase())) {
      setRegMessage({ type: 'err', text: `User ID ${cleanId} is already registered.` });
      return;
    }

    const roleObj = STAKEHOLDER_ROLES.find((r) => r.id === regRoleId) || STAKEHOLDER_ROLES[0];
    const newAccount: RegisteredAccount = {
      userId: cleanId,
      fullName: regName.trim(),
      email: regEmail.trim(),
      department: roleObj.department,
      roleId: regRoleId,
      password: regPassword,
    };

    setAccounts((prev) => [newAccount, ...prev]);
    setUserId(cleanId);
    setPassword(regPassword);
    setSelectedRoleId(regRoleId);
    setRegMessage({
      type: 'ok',
      text: `Registered ${newAccount.fullName} (${cleanId}) as ${roleObj.title}. Ready to Sign In!`,
    });
    setRegName('');
    setRegUserId('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirm('');
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = pwdUserId.trim();
    const target = accounts.find((a) => a.userId.toLowerCase() === cleanId.toLowerCase());
    if (!target) {
      setPwdMessage({ type: 'err', text: `No user found with ID "${cleanId}".` });
      return;
    }
    if (!pwdCurrent || target.password !== pwdCurrent) {
      setPwdMessage({ type: 'err', text: 'Current password is required and must match our records.' });
      return;
    }
    if (pwdNew.length < 6) {
      setPwdMessage({ type: 'err', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdMessage({ type: 'err', text: 'New password and confirmation do not match.' });
      return;
    }

    setAccounts((prev) =>
      prev.map((a) => (a.userId === target.userId ? { ...a, password: pwdNew } : a))
    );
    if (userId.toLowerCase() === target.userId.toLowerCase()) {
      setPassword(pwdNew);
    }
    setPwdCurrent('');
    setPwdNew('');
    setPwdConfirm('');
    setPwdMessage({
      type: 'ok',
      text: `Password updated successfully for ${target.userId}.`,
    });
  };

  const passwordStrength =
    pwdNew.length === 0
      ? ''
      : pwdNew.length >= 10 && /[A-Z]/.test(pwdNew) && /[0-9]/.test(pwdNew)
      ? 'Strong'
      : pwdNew.length >= 6
      ? 'Moderate'
      : 'Weak';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Minimal Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={onBackToLanding}
            className="flex items-center gap-3 text-left whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BankLogo size="sm" />
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              HDFC Bank
            </span>
          </button>

          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Overview</span>
          </button>
        </div>
      </header>

      {/* Main Split Auth Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Left Panel: Auth Tabs (Login / Register / Password) */}
          <div className="lg:col-span-6 p-7 sm:p-9 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-blue-700 mb-3">
                <ShieldCheck className="h-4 w-4" />
                <span>Role-Based Banking Auth · Direct Password Sign-In</span>
              </div>

              {/* Segmented Auth Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg mb-6">
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className={`py-2 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    authTab === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('forgot')}
                  className={`py-2 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    authTab === 'forgot'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Forgot Pwd
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('register')}
                  className={`py-2 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    authTab === 'register'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('password')}
                  className={`py-2 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    authTab === 'password'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Change Pwd
                </button>
              </div>

              {/* TAB 1: LOGIN */}
              {authTab === 'login' && (
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                    Sign in to Basel IV Hub
                  </h1>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    Enter your Username or User ID and Password.
                  </p>

                  <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
                    {loginError && (
                      <div
                        role="alert"
                        className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700"
                      >
                        {loginError}
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="login-userid"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Username or User ID
                      </label>
                      <div className="relative">
                        <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="login-userid"
                          type="text"
                          value={userId}
                          onChange={(e) => setUserId(e.target.value)}
                          placeholder="e.g. HDFC-RPT-1042"
                          autoComplete="username"
                          className="w-full pl-10 pr-4 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="login-password"
                          className="block text-xs font-semibold text-slate-700"
                        >
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setFpUserId(userId);
                            setFpMessage(null);
                            setAuthTab('forgot');
                          }}
                          className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          autoComplete="current-password"
                          className="w-full pl-10 pr-11 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberId}
                          onChange={(e) => setRememberId(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-700"
                        />
                        Remember User ID
                      </label>
                      <span className="text-xs text-slate-500">
                        Role: <strong className="text-slate-800">{selectedRole.title}</strong>
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0B1F3A] hover:bg-[#132E54] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <span>Sign In to Reporting Hub</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: FORGOT PASSWORD */}
              {authTab === 'forgot' && (
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                    Forgot Password
                  </h1>
                  <p className="mt-1.5 text-xs text-slate-600">
                    Verify your HDFC Bank / RBI User ID and Official Email to securely reset your password.
                  </p>

                  {fpMessage && (
                    <div
                      className={`mt-4 p-3 rounded-lg border text-xs font-medium ${
                        fpMessage.type === 'ok'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-red-50 border-red-200 text-red-700'
                      }`}
                    >
                      {fpMessage.text}
                    </div>
                  )}

                  {!fpOtpSent ? (
                    <form onSubmit={handleRequestResetOtp} className="mt-5 space-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          User ID
                        </label>
                        <input
                          type="text"
                          required
                          value={fpUserId}
                          onChange={(e) => setFpUserId(e.target.value)}
                          placeholder="e.g. HDFC-RPT-1042 or RBI-DOS-4410"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Registered Official Email
                        </label>
                        <input
                          type="email"
                          required
                          value={fpEmail}
                          onChange={(e) => setFpEmail(e.target.value)}
                          placeholder="name@hdfcbank.com"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Verify Identity &amp; Send OTP
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleConfirmForgotReset} className="mt-5 space-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          6-Digit Verification OTP
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={fpOtpInput}
                          onChange={(e) => setFpOtpInput(e.target.value)}
                          placeholder="Enter 6-digit OTP"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            New Password (min 8 chars)
                          </label>
                          <input
                            type="password"
                            required
                            value={fpNewPwd}
                            onChange={(e) => setFpNewPwd(e.target.value)}
                            placeholder="New password"
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            required
                            value={fpConfirmPwd}
                            onChange={(e) => setFpConfirmPwd(e.target.value)}
                            placeholder="Confirm password"
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Confirm OTP &amp; Reset Password
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 3: REGISTER NEW USER */}
              {authTab === 'register' && (
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-blue-700" />
                    <span>Register New Stakeholder</span>
                  </h1>
                  <p className="mt-1.5 text-xs text-slate-600">
                    Create a new Bank or RBI user account with assigned Role-Based Access Control.
                  </p>

                  <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-3.5">
                    {regMessage && (
                      <div
                        className={`p-3 rounded-lg border text-xs font-medium ${
                          regMessage.type === 'ok'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                      >
                        {regMessage.text}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="e.g. Karthik Rao"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          User ID
                        </label>
                        <input
                          type="text"
                          value={regUserId}
                          onChange={(e) => setRegUserId(e.target.value)}
                          placeholder="e.g. HDFC-DQA-2099"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Official Email
                        </label>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="name@hdfcbank.com"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Assign RBAC Role
                        </label>
                        <select
                          value={regRoleId}
                          onChange={(e) => setRegRoleId(e.target.value as StakeholderId)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        >
                          {STAKEHOLDER_ROLES.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Password (min 6 chars)
                        </label>
                        <input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Create password"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          value={regConfirm}
                          onChange={(e) => setRegConfirm(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Create User Account &amp; Assign Role
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 3: PASSWORD MANAGEMENT */}
              {authTab === 'password' && (
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                    Password Management
                  </h1>
                  <p className="mt-1.5 text-xs text-slate-600">
                    Update or reset your HDFC Bank reporting password directly.
                  </p>

                  <form onSubmit={handlePasswordUpdate} className="mt-5 space-y-3.5">
                    {pwdMessage && (
                      <div
                        className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
                          pwdMessage.type === 'ok'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                      >
                        {pwdMessage.type === 'ok' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                        <span>{pwdMessage.text}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        User ID
                      </label>
                      <input
                        type="text"
                        value={pwdUserId}
                        onChange={(e) => setPwdUserId(e.target.value)}
                        placeholder="e.g. HDFC-RPT-1042"
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Current Password <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={pwdCurrent}
                        onChange={(e) => setPwdCurrent(e.target.value)}
                        placeholder="Enter your current password"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={pwdNew}
                          onChange={(e) => setPwdNew(e.target.value)}
                          placeholder="New password"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                        {passwordStrength && (
                          <div
                            className={`mt-1 text-[11px] font-semibold ${
                              passwordStrength === 'Strong'
                                ? 'text-emerald-700'
                                : passwordStrength === 'Moderate'
                                ? 'text-amber-700'
                                : 'text-red-700'
                            }`}
                          >
                            Strength: {passwordStrength}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={pwdConfirm}
                          onChange={(e) => setPwdConfirm(e.target.value)}
                          placeholder="Confirm new password"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#0B1F3A] hover:bg-[#132E54] text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Save New Password
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="mt-7 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Registered Accounts: {accounts.length}</span>
              <span className="font-mono">HDFC Bank · Regulator: RBI (DoS)</span>
            </div>
          </div>

          {/* Right Panel: Strict Confidentiality & RBAC Access Policy */}
          <div className="lg:col-span-6 bg-slate-50/80 p-7 sm:p-9 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-blue-700" />
                  Confidentiality &amp; Strict Role Isolation
                </h2>
              </div>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Each stakeholder must authenticate with their individual HDFC Bank or RBI credentials. No role-switching dropdown exists inside the workspace; switching users requires signing out and logging in again.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[390px] overflow-y-auto pr-1">
                {STAKEHOLDER_ROLES.map((role) => {
                  const isActive = role.id === selectedRoleId;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-white border-blue-600 ring-1 ring-blue-600'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {role.title}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 truncate">
                        {role.department}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 p-4 bg-white border border-slate-200 rounded-lg">
              <div className="text-xs font-semibold text-slate-900">
                {selectedRole.title} · Authorized Scope
              </div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                {selectedRole.plainEnglishRole}
              </p>
              <div className="mt-2 text-[11px] font-medium text-slate-500">
                Permissions: <span className="text-slate-700">{selectedRole.permissionsSummary}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
