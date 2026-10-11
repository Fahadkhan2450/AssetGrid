import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';

import { io } from 'socket.io-client';
import * as XLSX from 'xlsx';

import {
  Bell,
  Boxes,
  ClipboardList,
  FileBarChart,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  Settings,
  RotateCcw,
  Check,
  X,
  History,
  Pencil,
  Trash2,
  Download,
  ShieldCheck,
  UserRound,
  Upload,
  Search,
} from 'lucide-react';

import { api, SOCKET } from './services/api';

import type {
  User,
  Equipment,
  Member,
  Customer,
  Location,
  LoanRequest,
  Loan,
  Notification,
} from './types';

/* =========================================================
   TYPES
========================================================= */

type AdminType = 'APPROVER' | 'ISSUER';

type LoginUser = User & {
  adminType?: AdminType | null;
};

/* =========================================================
   APP
========================================================= */

function App() {
  const [user, setUser] =
    useState<LoginUser | null>(() => {
      try {
        const stored =
          localStorage.getItem('user');

        if (!stored) {
          return null;
        }

        return JSON.parse(stored);
      } catch {
        return null;
      }
    });

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setUser(null);
  };

  if (!user) {
    return (
      <Login
        onLogin={(u) => {
          localStorage.setItem(
            'user',
            JSON.stringify(u)
          );

          setUser(u);
        }}
      />
    );
  }

  return (
    <Shell
      user={user}
      onLogout={logout}
    />
  );
}

/* =========================================================
   LOGIN / EMPLOYEE SIGNUP
========================================================= */

function Login({
  onLogin,
}: {
  onLogin: (u: LoginUser) => void;
}) {
  const [mode, setMode] =
    useState<'login' | 'signup'>(
      'login'
    );

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [name, setName] =
    useState('');

  const [signupEmail, setSignupEmail] =
    useState('');

  const [department, setDepartment] =
    useState('');

  const [signupPassword, setSignupPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  /* =======================================================
     LOGIN
  ======================================================= */

  const submitLogin = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response =
        await api.post(
          '/auth/login',
          {
            email:
              email
                .trim()
                .toLowerCase(),
            password,
          }
        );

      const loggedInUser =
        response.data.user as LoginUser;

      if (!loggedInUser) {
        throw new Error(
          'User information was not returned by the server.'
        );
      }

      localStorage.setItem(
        'token',
        response.data.token
      );

      localStorage.setItem(
        'user',
        JSON.stringify(
          loggedInUser
        )
      );

      onLogin(
        loggedInUser
      );
    } catch (e: any) {
      console.error(
        'Login error:',
        e
      );

      setError(
        e.response?.data?.message ||
          e.message ||
          'Invalid email or password.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     EMPLOYEE SIGNUP
  ======================================================= */

  const submitSignup = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError(
        'Please enter your full name.'
      );
      return;
    }

    if (!signupEmail.trim()) {
      setError(
        'Please enter your email address.'
      );
      return;
    }

    if (!department.trim()) {
      setError(
        'Please enter your department.'
      );
      return;
    }

    if (
      signupPassword.length < 6
    ) {
      setError(
        'Password must be at least 6 characters.'
      );
      return;
    }

    if (
      signupPassword !==
      confirmPassword
    ) {
      setError(
        'Passwords do not match.'
      );
      return;
    }

    setLoading(true);

    try {
      await api.post(
        '/auth/signup',
        {
          name:
            name.trim(),

          email:
            signupEmail
              .trim()
              .toLowerCase(),

          department:
            department.trim(),

          password:
            signupPassword,

          confirmPassword,
        }
      );

      setSuccess(
        'Employee account created successfully. Please sign in to continue.'
      );

      setName('');
      setSignupEmail('');
      setDepartment('');
      setSignupPassword('');
      setConfirmPassword('');

      setMode('login');
    } catch (e: any) {
      console.error(
        'Employee signup error:',
        e
      );

      setError(
        e.response?.data?.message ||
          'Could not create employee account.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     SWITCH MODE
  ======================================================= */

  const switchMode = (
    nextMode:
      | 'login'
      | 'signup'
  ) => {
    setMode(nextMode);

    setError('');
    setSuccess('');
    setLoading(false);

    if (
      nextMode ===
      'login'
    ) {
      setName('');
      setSignupEmail('');
      setDepartment('');
      setSignupPassword('');
      setConfirmPassword('');
    } else {
      setEmail('');
      setPassword('');
    }
  };

  /* =======================================================
     LOGIN SCREEN
  ======================================================= */

  if (
    mode === 'login'
  ) {
    return (
      <div className="login">
        <form
          className="login-card"
          onSubmit={
            submitLogin
          }
        >
          <div className="auth-brand">
            <div className="auth-logo">
              R&S
            </div>

            <div>
              <h1>
                Equipment Management
              </h1>

              
            </div>
          </div>

          <div className="auth-heading">
            <h2>
              Sign in
            </h2>

           
          </div>

          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              placeholder="Enter your company email"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={
                password
              }
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>

          {success && (
            <div className="success">
              <Check
                size={16}
              />

              <span>
                {success}
              </span>
            </div>
          )}

          {error && (
            <div className="error">
              <X
                size={16}
              />

              <span>
                {error}
              </span>
            </div>
          )}

          <button
            type="submit"
            className="primary wide"
            disabled={
              loading
            }
          >
            {loading
              ? 'Signing in...'
              : 'Sign in'}
          </button>

          <div className="auth-divider">
            <span>
              New employee? If Admin, create employee account first
            </span>
          </div>

          <button
            type="button"
            className="wide"
            onClick={() =>
              switchMode(
                'signup'
              )
            }
            disabled={
              loading
            }
          >
            Create Employee Account
          </button>

          <div className="auth-security-note">
            <ShieldCheck
              size={16}
            />

            <span>
              Administrative duties are
              assigned separately by an
              authorized administrator.
            </span>
          </div>
        </form>
      </div>
    );
  }

  /* =======================================================
     SIGNUP SCREEN
  ======================================================= */

  return (
    <div className="login">
      <form
        className="login-card"
        onSubmit={
          submitSignup
        }
      >
        <div className="auth-brand">
          <div className="auth-logo">
            R&S
          </div>

          <div>
            <h1>
              Equipment Management
            </h1>

            <p>
              Employee account
              registration
            </p>
          </div>
        </div>

        <div className="auth-heading">
          <h2>
            Create Employee Account
          </h2>

          <span>
            Register for access to
            equipment and loan requests
          </span>
        </div>

        <label>
          Full Name

          <input
            type="text"
            value={name}
            onChange={(e) =>
              setName(
                e.target.value
              )
            }
            placeholder="Enter your full name"
            autoComplete="name"
            required
          />
        </label>

        <label>
          Email

          <input
            type="email"
            value={
              signupEmail
            }
            onChange={(e) =>
              setSignupEmail(
                e.target.value
              )
            }
            placeholder="Enter your company email"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Department

          <input
            type="text"
            value={
              department
            }
            onChange={(e) =>
              setDepartment(
                e.target.value
              )
            }
            placeholder="e.g. Engineering"
            required
          />
        </label>

        <label>
          Password

          <input
            type="password"
            value={
              signupPassword
            }
            onChange={(e) =>
              setSignupPassword(
                e.target.value
              )
            }
            placeholder="Minimum 6 characters"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>

        <label>
          Confirm Password

          <input
            type="password"
            value={
              confirmPassword
            }
            onChange={(e) =>
              setConfirmPassword(
                e.target.value
              )
            }
            placeholder="Re-enter your password"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>

        <div className="account-type-card">
          <div className="account-type-icon">
            <UserRound
              size={18}
            />
          </div>

          <div>
            <b>
              Account Type
            </b>

            <strong>
              Employee
            </strong>

            <small>
              New accounts are created
              as employees.
            </small>
          </div>
        </div>

        <div className="admin-info-card">
          <ShieldCheck
            size={18}
          />

          <div>
            <b>
              Need an administrative duty?
            </b>

            <span>
              Approval and instrument
              issuance are assigned
              separately by an authorized
              administrator.
            </span>

            <small>
              Multiple APPROVER and ISSUER administrators can be active at the same time.
            </small>
          </div>
        </div>

        {error && (
          <div className="error">
            <X
              size={16}
            />

            <span>
              {error}
            </span>
          </div>
        )}

        <button
          type="submit"
          className="primary wide"
          disabled={
            loading
          }
        >
          {loading
            ? 'Creating account...'
            : 'Create Employee Account'}
        </button>

        <button
          type="button"
          className="wide"
          onClick={() =>
            switchMode(
              'login'
            )
          }
          disabled={
            loading
          }
        >
          Back to Sign In
        </button>
      </form>
    </div>
  );
}

/* =========================================================
   MAIN SHELL
========================================================= */

function Shell({
  user,
  onLogout,
}: {
  user: LoginUser;
  onLogout: () => void;
}) {
  const [page, setPage] =
    useState('Dashboard');

  const [refresh, setRefresh] =
    useState(0);

  const [notes, setNotes] =
    useState<
      Notification[]
    >([]);

  const [toast, setToast] =
    useState<
      Notification | null
    >(null);

  const [
    openRequestId,
    setOpenRequestId,
  ] =
    useState<
      string | null
    >(null);

  const reload = () => {
    setRefresh(
      (x) => x + 1
    );
  };

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  const loadNotifications =
    async () => {
      try {
        const r =
          await api.get(
            '/notifications'
          );

        const notificationData =
          Array.isArray(
            r.data
          )
            ? r.data
            : Array.isArray(
                r.data
                  ?.notifications
              )
            ? r.data
                .notifications
            : [];

        setNotes(
          notificationData
        );
      } catch (e) {
        console.error(
          'Notification loading error:',
          e
        );

        setNotes([]);
      }
    };

  useEffect(() => {
    loadNotifications();

    const socket = io(
      SOCKET,
      {
        auth: {
          token:
            localStorage.getItem(
              'token'
            ),
        },
      }
    );

    socket.on(
      'dashboard:changed',
      reload
    );

    socket.on(
      'notification:new',
      async () => {
        reload();

        try {
          const r =
            await api.get(
              '/notifications'
            );

          const notificationData =
            Array.isArray(
              r.data
            )
              ? r.data
              : Array.isArray(
                  r.data
                    ?.notifications
                )
              ? r.data
                  .notifications
              : [];

          setNotes(
            notificationData
          );

          const newest =
            notificationData[0];

          if (newest) {
            setToast(
              newest
            );

            window.setTimeout(
              () => {
                setToast(null);
              },
              7000
            );
          }
        } catch (e) {
          console.error(
            'Notification refresh error:',
            e
          );
        }
      }
    );

    return () => {
      socket.disconnect();
    };
  }, []);

  const unread =
    notes.filter(
      (n) =>
        !n.isRead
    ).length;

  /* =======================================================
     ROLE INFORMATION
  ======================================================= */

  const isAdmin =
    user.role ===
    'ADMIN';

  const isApprover =
    isAdmin &&
    user.adminType ===
      'APPROVER';

  const isIssuer =
    isAdmin &&
    user.adminType ===
      'ISSUER';

  const roleLabel =
    isApprover
      ? 'Approval Administrator'
      : isIssuer
      ? 'Issuance Administrator'
      : isAdmin
      ? 'Administrator'
      : 'Employee';

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const nav = [
    [
      'Dashboard',
      LayoutDashboard,
    ],

    [
      'Inventory',
      Boxes,
    ],

    [
      'Loans',
      ClipboardList,
    ],

    [
      'Locations',
      MapPin,
    ],

    [
      'Reports',
      FileBarChart,
    ],

    ...(isAdmin
      ? [
          [
            'Administration',
            Settings,
          ],
        ]
      : []),
  ] as any[];

  return (
    <div className="shell">
      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="sidebar">
        <div className="brand">
          <div className="logo">
            R
          </div>

          <div>
            <b>
              R&S
            </b>

            <span>
              Demo Equipment
            </span>
          </div>
        </div>

        {nav.map(
          ([label, Icon]) => (
            <button
              className={
                page === label
                  ? 'nav active'
                  : 'nav'
              }
              onClick={() =>
                setPage(
                  label
                )
              }
              key={label}
              type="button"
            >
              <Icon
                size={18}
              />

              {label}
            </button>
          )
        )}

        <button
          className={
            page ===
            'Notifications'
              ? 'nav active'
              : 'nav'
          }
          onClick={() =>
            setPage(
              'Notifications'
            )
          }
          type="button"
        >
          <Bell
            size={18}
          />

          Notifications

          {unread > 0 && (
            <span className="badge">
              {unread}
            </span>
          )}
        </button>

        <div className="spacer" />

        <div className="profile">
          <div className="avatar">
            {user.name
              ?.charAt(0)
              .toUpperCase() ||
              'U'}
          </div>

          <div className="profile-info">
            <b>
              {user.name}
            </b>

            <span>
              {roleLabel}
            </span>

            {isAdmin && (
              <small>
                {user.adminType}
              </small>
            )}
          </div>

          <button
            onClick={
              onLogout
            }
            className="icon"
            title="Logout"
            type="button"
          >
            <LogOut
              size={16}
            />
          </button>
        </div>
      </aside>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="main">
        <header className="topbar">
          <div>
            <h2>
              {page}
            </h2>

            
          </div>

          <div className="topbar-right">
            {isApprover && (
              <div className="role-badge approver">
                <Check
                  size={15}
                />

                Approval Admin
              </div>
            )}

            {isIssuer && (
              <div className="role-badge issuer">
                <Boxes
                  size={15}
                />

                Issuance Admin
              </div>
            )}

            {user.role ===
              'EMPLOYEE' && (
              <div className="role-badge employee">
                <UserRound
                  size={15}
                />

                Employee
              </div>
            )}

            <button
              className="icon notification"
              onClick={() =>
                setPage(
                  'Notifications'
                )
              }
              type="button"
            >
              <Bell
                size={20}
              />

              {unread >
                0 && (
                <i>
                  {unread}
                </i>
              )}
            </button>
          </div>
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <section className="content">
          {page ===
            'Dashboard' && (
            <Dashboard
              refresh={
                refresh
              }
              user={
                user
              }
              onRefresh={
                reload
              }
              openRequest={(
                id
              ) => {
                setOpenRequestId(
                  id
                );

                setPage(
                  'Loans'
                );
              }}
            />
          )}

          {page ===
            'Inventory' && (
            <Inventory
              refresh={
                refresh
              }
              admin={
                isAdmin
              }
            />
          )}

          {page ===
            'Loans' && (
            <Loans
              refresh={
                refresh
              }
              onRefresh={
                reload
              }
              user={
                user
              }
              openRequestId={
                openRequestId
              }
              clearOpenRequest={() =>
                setOpenRequestId(
                  null
                )
              }
            />
          )}

          {page ===
            'Locations' && (
            <Locations
              refresh={
                refresh
              }
            />
          )}

          {page ===
            'Reports' && (
            <Reports
              admin={
                isAdmin
              }
            />
          )}

          {page ===
            'Administration' &&
            isAdmin && (
              <Administration
                refresh={
                  refresh
                }
                onRefresh={
                  reload
                }
                user={user}
              />
            )}

          {page ===
            'Notifications' && (
            <Notifications
              data={
                notes
              }
              refresh={
                reload
              }
              openRequest={(
                id
              ) => {
                setOpenRequestId(
                  id
                );

                setPage(
                  'Loans'
                );
              }}
            />
          )}

          {toast && (
            <button
              className="toast"
              onClick={() => {
                if (
                  toast.referenceType ===
                    'LOAN_REQUEST' &&
                  toast.referenceId
                ) {
                  setOpenRequestId(
                    toast.referenceId
                  );

                  setPage(
                    'Loans'
                  );
                }

                setToast(
                  null
                );
              }}
              type="button"
            >
              <Bell
                size={17}
              />

              <span>
                <b>
                  {
                    toast.title
                  }
                </b>

                <small>
                  {
                    toast.message
                  }
                </small>
              </span>
            </button>
          )}
        </section>
      </main>
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  refresh,
  user,
  onRefresh,
  openRequest,
}: {
  refresh: number;
  user: LoginUser;
  onRefresh: () => void;
  openRequest: (
    id: string
  ) => void;
}) {
  const [d, setD] =
    useState<any>(null);

  const [error, setError] =
    useState('');

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const isAdmin =
    user.role ===
    'ADMIN';

  const isApprover =
    isAdmin &&
    user.adminType ===
      'APPROVER';

  const isIssuer =
    isAdmin &&
    user.adminType ===
      'ISSUER';

  useEffect(() => {
    let mounted = true;

    setError('');

    api
      .get('/dashboard')
      .then((r) => {
        if (!mounted) {
          return;
        }

        setD(
          r.data || {}
        );
      })
      .catch((e: any) => {
        console.error(
          'Dashboard loading error:',
          e
        );

        if (!mounted) {
          return;
        }

        setError(
          e.response?.data?.message ||
            'Could not load dashboard data.'
        );
      });

    return () => {
      mounted = false;
    };
  }, [refresh]);

  const approveRequest = async (
    request: any
  ) => {
    if (
      !isApprover ||
      !request?._id
    ) {
      return;
    }

    setProcessingId(
      request._id
    );

    try {
      await api.post(
        `/loans/requests/${request._id}/approve`
      );

      onRefresh();
    } catch (e: any) {
      console.error(
        'Dashboard approve error:',
        e
      );

      alert(
        e.response?.data?.message ||
          'Could not approve request.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const rejectRequest = async (
    request: any
  ) => {
    if (
      !isApprover ||
      !request?._id
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Reject request "${request.requestNumber || 'this request'}"?`
      );

    if (!confirmed) {
      return;
    }

    setProcessingId(
      request._id
    );

    try {
      await api.post(
        `/loans/requests/${request._id}/reject`
      );

      onRefresh();
    } catch (e: any) {
      console.error(
        'Dashboard reject error:',
        e
      );

      alert(
        e.response?.data?.message ||
          'Could not reject request.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const issueRequest = (
    request: any
  ) => {
    if (
      !isIssuer ||
      !request?._id
    ) {
      return;
    }

    openRequest(
      request._id
    );
  };

  if (error) {
    return (
      <div className="error">
        {error}
      </div>
    );
  }

  if (!d) {
    return <Loading />;
  }

  const recentRequests =
    Array.isArray(
      d.recent
    )
      ? d.recent
      : [];

  const showActions =
    isApprover ||
    isIssuer;

  return (
    <>
      <div className="stats">
        {[
          [
            'Equipment',
            d.stats?.equipment ??
              0,
            Boxes,
          ],
          [
            'Available',
            d.stats?.available ??
              0,
            Check,
          ],
          [
            'On Loan',
            d.stats?.onLoan ??
              0,
            ClipboardList,
          ],
          [
            'Pending Requests',
            d.stats?.pending ??
              0,
            Bell,
          ],
          [
            'Active Loans',
            d.stats?.activeLoans ??
              0,
            History,
          ],
          [
            'Overdue',
            d.stats?.overdue ??
              0,
            X,
          ],
        ].map(
          ([
            label,
            value,
            Icon,
          ]: any) => (
            <div
              className="stat"
              key={label}
            >
              <Icon size={18} />

              <div>
                <span>
                  {label}
                </span>

                <strong>
                  {value}
                </strong>
              </div>
            </div>
          )
        )}
      </div>

      <Panel
        title="Recent Requests"
        subtitle={
          isApprover
            ? 'Pending requests can be approved or rejected here.'
            : isIssuer
            ? 'Approved requests can be issued here.'
            : 'Updates automatically when a record changes'
        }
      >
        <Table
          headers={[
            'Request',
            'Requester',
            'Customer',
            'Equipment',
            'Status',
            'Created',
            ...(showActions
              ? ['ACTIONS']
              : []),
          ]}
        >
          {recentRequests.length >
          0 ? (
            recentRequests.map(
              (r: any) => (
                <tr
                  key={r._id}
                >
                  <td>
                    {r.requestNumber ||
                      '—'}
                  </td>

                  <td>
                    {r.requesterSnapshot
                      ?.name ||
                      r.requester ||
                      '—'}
                  </td>

                  <td>
                    {r.customerSnapshot
                      ?.name ||
                      r.customer ||
                      '—'}
                  </td>

                  <td>
                    {r.requestedEquipmentSnapshot
                      ?.material ||
                      r.requestedEquipmentSnapshot
                        ?.name ||
                      r.requestedEquipmentSnapshot
                        ?.serialNumber ||
                      'Not specified'}
                  </td>

                  <td>
                    <Status
                      s={
                        r.status ||
                        'UNKNOWN'
                      }
                    />
                  </td>

                  <td>
                    {r.createdAt
                      ? new Date(
                          r.createdAt
                        ).toLocaleString()
                      : '—'}
                  </td>

                  {showActions && (
                    <td>
                      <div className="row">
                        {isApprover &&
                          r.status ===
                            'PENDING' && (
                            <>
                              <button
                                className="small"
                                type="button"
                                disabled={
                                  processingId ===
                                  r._id
                                }
                                onClick={() =>
                                  approveRequest(
                                    r
                                  )
                                }
                              >
                                <Check
                                  size={
                                    14
                                  }
                                />

                                {processingId ===
                                r._id
                                  ? 'Processing...'
                                  : 'Approve'}
                              </button>

                              <button
                                className="small"
                                type="button"
                                disabled={
                                  processingId ===
                                  r._id
                                }
                                onClick={() =>
                                  rejectRequest(
                                    r
                                  )
                                }
                              >
                                <X
                                  size={
                                    14
                                  }
                                />

                                Reject
                              </button>
                            </>
                          )}

                        {isIssuer &&
                          r.status ===
                            'APPROVED' && (
                            <button
                              className="primary small"
                              type="button"
                              onClick={() =>
                                issueRequest(
                                  r
                                )
                              }
                            >
                              <ClipboardList
                                size={
                                  14
                                }
                              />

                              Issue Instrument
                            </button>
                          )}

                        {((isApprover &&
                          r.status !==
                            'PENDING') ||
                          (isIssuer &&
                            r.status !==
                              'APPROVED')) && (
                          <span>
                            —
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            )
          ) : (
            <tr>
              <td
                colSpan={
                  showActions
                    ? 7
                    : 6
                }
              >
                <div className="empty">
                  No recent requests.
                </div>
              </td>
            </tr>
          )}
        </Table>
      </Panel>

      <Panel
        title="Locations"
        subtitle="Company locations and their fine locations"
      >
        {Array.isArray(
          d.locations
        ) &&
        d.locations.length > 0 ? (
          <div className="location-grid">
            {d.locations.map(
              (
                location: Location
              ) => (
                <div
                  className="location-card"
                  key={
                    location._id
                  }
                >
                  <div className="location-card-head">
                    <div className="location-icon">
                      <MapPin size={18} />
                    </div>

                    <div>
                      <h3>
                        {
                          location.name
                        }
                      </h3>

                      <span>
                        Code:{' '}
                        {
                          location.code
                        }
                      </span>
                    </div>
                  </div>

                  {location.address && (
                    <p className="location-address">
                      {
                        location.address
                      }
                    </p>
                  )}

                  <div className="fine-location-section">
                    <div className="fine-location-title">
                      Fine Locations
                    </div>

                    {location.fineLocations
                      ?.length ? (
                      <div className="fine-location-list">
                        {location.fineLocations.map(
                          (
                            fineLocation
                          ) => (
                            <div
                              className="fine-location-item"
                              key={
                                fineLocation.code
                              }
                            >
                              <span>
                                {
                                  fineLocation.name
                                }
                              </span>

                              <small>
                                {
                                  fineLocation.code
                                }
                              </small>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="empty">
                        No fine locations.
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="empty">
            No locations found.
          </div>
        )}
      </Panel>
    </>
  );
}

/* =========================================================
   INVENTORY
========================================================= */

function Inventory({
  refresh,
  admin,
}: {
  refresh: number;
  admin: boolean;
}) {
  const [items, setItems] =
    useState<Equipment[]>([]);

  const [showModal, setShowModal] =
    useState(false);

  const [editing, setEditing] =
    useState<Equipment | null>(
      null
    );

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [exporting, setExporting] =
    useState(false);

  const loadEquipment =
    async () => {
      try {
        setError('');
        setLoading(true);

        const response =
          await api.get(
            '/equipment'
          );

        const data =
          Array.isArray(
            response.data
          )
            ? response.data
            : Array.isArray(
                response.data
                  ?.equipment
              )
            ? response.data
                .equipment
            : [];

        setItems(data);
      } catch (e: any) {
        console.error(
          'Equipment loading error:',
          e
        );

        setItems([]);

        setError(
          e.response?.data
            ?.message ||
            'Could not load equipment inventory.'
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadEquipment();
  }, [refresh]);

  const openAdd = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (
    equipment: Equipment
  ) => {
    setEditing(equipment);
    setShowModal(true);
  };

  const deleteEquipment =
    async (
      equipment: Equipment
    ) => {
      const confirmed =
        window.confirm(
          `Delete equipment "${equipment.material || 'Unknown'}" (${equipment.serialNumber || 'No serial number'})?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setError('');

        await api.delete(
          `/equipment/${equipment._id}`
        );

        await loadEquipment();
      } catch (e: any) {
        console.error(
          'Delete equipment error:',
          e
        );

        alert(
          e.response?.data
            ?.message ||
            'Could not delete equipment.'
        );
      }
    };

  const exportExcel = () => {
    if (!admin) {
      alert(
        'Only administrators can export equipment data.'
      );

      return;
    }

    if (
      !items ||
      items.length === 0
    ) {
      alert(
        'There is no equipment data to export.'
      );

      return;
    }

    try {
      setExporting(true);

      const headers = [
        'S No',
        'Acquisition year',
        'Material',
        'Serial Number',
        'Model',
        'Description',
        'Acquis.val.',
        'Accum.dep.',
        'Book val.',
        'Currency',
        'Cost Center',
        'Bal.sh.acct APC',
        'Location',
        'Fine Location',
        'LOAN STATUS',
        'OPERATIONAL STATUS',
        'REQUESTER',
        'CUSTOMER',
        'LOAN DATED',
        'RETURN DUE',
      ];

      const rows =
        items.map(
          (item: Equipment) => ({
            'S No':
              item.sNo ?? '',

            'Acquisition year':
              item.acquisitionYear ??
              '',

            Material:
              item.material ?? '',

            'Serial Number':
              item.serialNumber ??
              '',

            Model:
              item.model ?? '',

            Description:
              item.description ??
              '',

            'Acquis.val.':
              item.acquisitionValue ??
              '',

            'Accum.dep.':
              item.accumulatedDepreciation ??
              '',

            'Book val.':
              item.bookValue ??
              '',

            Currency:
              item.currency ?? '',

            'Cost Center':
              item.costCenter ?? '',

            'Bal.sh.acct APC':
              item.balanceSheetAccountAPC ??
              '',

            Location:
              item.location ?? '',

            'Fine Location':
              item.fineLocation ??
              '',

            'LOAN STATUS':
              item.loanStatus ??
              '',

            'OPERATIONAL STATUS':
              item.operationalStatus ??
              '',

            REQUESTER:
              item.requester ?? '',

            CUSTOMER:
              item.customer ?? '',

            'LOAN DATED':
              item.loanDate
                ? formatDateForExcel(
                    item.loanDate
                  )
                : '',

            'RETURN DUE':
              item.returnDue
                ? formatDateForExcel(
                    item.returnDue
                  )
                : '',
          })
        );

      const worksheet =
        XLSX.utils.json_to_sheet(
          rows,
          {
            header: headers,
          }
        );

      worksheet['!cols'] = [
        { wch: 8 },
        { wch: 18 },
        { wch: 22 },
        { wch: 24 },
        { wch: 20 },
        { wch: 40 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 12 },
        { wch: 16 },
        { wch: 20 },
        { wch: 20 },
        { wch: 22 },
        { wch: 20 },
        { wch: 24 },
        { wch: 22 },
        { wch: 22 },
        { wch: 16 },
        { wch: 16 },
      ];

      worksheet[
        '!freeze'
      ] = {
        xSplit: 0,
        ySplit: 1,
      };

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'Equipment Inventory'
      );

      XLSX.writeFile(
        workbook,
        'company-equipment-inventory.xlsx'
      );
    } catch (e) {
      console.error(
        'Excel generation error:',
        e
      );

      alert(
        'Could not create Excel file. Please try again.'
      );
    } finally {
      setExporting(false);
    }
  };

  const saved = async () => {
    setShowModal(false);
    setEditing(null);

    await loadEquipment();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h3>
            Equipment Inventory
          </h3>

          <p>
            Complete equipment master
            data from the company Excel
            structure.
          </p>
        </div>

        {admin && (
          <button
            className="primary"
            onClick={openAdd}
            type="button"
          >
            <Plus size={16} />
            Add Equipment
          </button>
        )}
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <Panel
        title="Equipment Master Data"
        subtitle={`${items.length} equipment records`}
      >
        {loading ? (
          <Loading />
        ) : (
          <Table
            headers={[
              'S No',
              'Acquisition year',
              'Material',
              'Serial Number',
              'Model',
              'Description',
              'Acquis.val.',
              'Accum.dep.',
              'Book val.',
              'Currency',
              'Cost Center',
              'Bal.sh.acct APC',
              'Location',
              'Fine Location',
              'LOAN STATUS',
              'OPERATIONAL STATUS',
              'REQUESTER',
              'CUSTOMER',
              'LOAN DATED',
              'RETURN DUE',
              ...(admin
                ? ['ACTIONS']
                : []),
            ]}
          >
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    admin
                      ? 21
                      : 20
                  }
                >
                  <div className="empty">
                    No equipment
                    records found.
                  </div>
                </td>
              </tr>
            ) : (
              items.map(
                (x: Equipment) => (
                  <tr
                    key={x._id}
                  >
                    <td>
                      {x.sNo ??
                        '—'}
                    </td>

                    <td>
                      {x.acquisitionYear ??
                        '—'}
                    </td>

                    <td>
                      <b>
                        {x.material ||
                          '—'}
                      </b>
                    </td>

                    <td>
                      {x.serialNumber ||
                        '—'}
                    </td>

                    <td>
                      {x.model ||
                        '—'}
                    </td>

                    <td>
                      {x.description ||
                        '—'}
                    </td>

                    <td>
                      {formatMoney(
                        x.acquisitionValue,
                        x.currency
                      )}
                    </td>

                    <td>
                      {formatMoney(
                        x.accumulatedDepreciation,
                        x.currency
                      )}
                    </td>

                    <td>
                      {formatMoney(
                        x.bookValue,
                        x.currency
                      )}
                    </td>

                    <td>
                      {x.currency ||
                        '—'}
                    </td>

                    <td>
                      {x.costCenter ||
                        '—'}
                    </td>

                    <td>
                      {x.balanceSheetAccountAPC ||
                        '—'}
                    </td>

                    <td>
                      {x.location ||
                        '—'}
                    </td>

                    <td>
                      {x.fineLocation ||
                        '—'}
                    </td>

                    <td>
                      <Status
                        s={
                          x.loanStatus ||
                          'AVAILABLE'
                        }
                      />
                    </td>

                    <td>
                      <Status
                        s={
                          x.operationalStatus ||
                          'OPERATIONAL'
                        }
                      />
                    </td>

                    <td>
                      {x.requester ||
                        '—'}
                    </td>

                    <td>
                      {x.customer ||
                        '—'}
                    </td>

                    <td>
                      {formatDate(
                        x.loanDate
                      )}
                    </td>

                    <td>
                      {formatDate(
                        x.returnDue
                      )}
                    </td>

                    {admin && (
                      <td>
                        <div className="row">
                          <button
                            type="button"
                            className="small"
                            onClick={() =>
                              openEdit(
                                x
                              )
                            }
                          >
                            <Pencil
                              size={
                                14
                              }
                            />

                            Edit
                          </button>

                          <button
                            type="button"
                            className="small"
                            onClick={() =>
                              deleteEquipment(
                                x
                              )
                            }
                          >
                            <Trash2
                              size={
                                14
                              }
                            />

                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              )
            )}
          </Table>
        )}
      </Panel>

      {admin && (
        <div className="export-panel">
          <div>
            <b>
              Generate Equipment Excel
            </b>

            <span>
              Export the current
              MongoDB inventory with
              all 20 company columns.
            </span>
          </div>

          <button
            type="button"
            className="primary"
            onClick={
              exportExcel
            }
            disabled={
              exporting ||
              loading ||
              items.length === 0
            }
          >
            <Download
              size={16}
            />

            {exporting
              ? 'Generating...'
              : 'Generate Excel'}
          </button>
        </div>
      )}

      {showModal && (
        <EquipmentModal
          equipment={editing}
          close={() => {
            setShowModal(false);
            setEditing(null);
          }}
          saved={saved}
        />
      )}
    </>
  );
}

/* =========================================================
   EQUIPMENT ADD / EDIT MODAL
========================================================= */

function EquipmentModal({
  equipment,
  close,
  saved,
}: {
  equipment: Equipment | null;
  close: () => void;
  saved: () => void;
}) {
  const isEdit =
    Boolean(equipment);

  const [f, setF] = useState<any>({
    sNo:
      equipment?.sNo ??
      '',

    acquisitionYear:
      equipment?.acquisitionYear ??
      '',

    material:
      equipment?.material ??
      '',

    serialNumber:
      equipment?.serialNumber ??
      '',

    model:
      equipment?.model ??
      '',

    description:
      equipment?.description ??
      '',

    acquisitionValue:
      equipment?.acquisitionValue ??
      '',

    accumulatedDepreciation:
      equipment?.accumulatedDepreciation ??
      '',

    bookValue:
      equipment?.bookValue ??
      '',

    currency:
      equipment?.currency ??
      '',

    costCenter:
      equipment?.costCenter ??
      '',

    balanceSheetAccountAPC:
      equipment?.balanceSheetAccountAPC ??
      '',

    location:
      equipment?.location ??
      '',

    fineLocation:
      equipment?.fineLocation ??
      '',

    loanStatus:
      equipment?.loanStatus ??
      'AVAILABLE',

    operationalStatus:
      equipment?.operationalStatus ??
      'OPERATIONAL',

    requester:
      equipment?.requester ??
      '',

    customer:
      equipment?.customer ??
      '',

    loanDate:
      toInputDate(
        equipment?.loanDate
      ),

    returnDue:
      toInputDate(
        equipment?.returnDue
      ),
  });

  const [error, setError] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const fields = [
    [
      'sNo',
      'S No',
      'number',
    ],
    [
      'acquisitionYear',
      'Acquisition year',
      'number',
    ],
    [
      'material',
      'Material',
      'text',
    ],
    [
      'serialNumber',
      'Serial Number',
      'text',
    ],
    [
      'model',
      'Model',
      'text',
    ],
    [
      'description',
      'Description',
      'text',
    ],
    [
      'acquisitionValue',
      'Acquis.val.',
      'number',
    ],
    [
      'accumulatedDepreciation',
      'Accum.dep.',
      'number',
    ],
    [
      'bookValue',
      'Book val.',
      'number',
    ],
    [
      'currency',
      'Currency',
      'text',
    ],
    [
      'costCenter',
      'Cost Center',
      'text',
    ],
    [
      'balanceSheetAccountAPC',
      'Bal.sh.acct APC',
      'text',
    ],
    [
      'location',
      'Location',
      'text',
    ],
    [
      'fineLocation',
      'Fine Location',
      'text',
    ],
    [
      'requester',
      'REQUESTER',
      'text',
    ],
    [
      'customer',
      'CUSTOMER',
      'text',
    ],
  ];

  const submit = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setError('');

    if (!String(f.material).trim()) {
      setError(
        'Material is required.'
      );
      return;
    }

    if (!String(f.serialNumber).trim()) {
      setError(
        'Serial Number is required.'
      );
      return;
    }

    setSaving(true);

    const payload = {
      ...f,

      material:
        String(
          f.material
        ).trim(),

      serialNumber:
        String(
          f.serialNumber
        ).trim(),

      sNo:
        f.sNo !== ''
          ? Number(f.sNo)
          : null,

      acquisitionYear:
        f.acquisitionYear !== ''
          ? Number(
              f.acquisitionYear
            )
          : null,

      acquisitionValue:
        f.acquisitionValue !== ''
          ? Number(
              f.acquisitionValue
            )
          : null,

      accumulatedDepreciation:
        f.accumulatedDepreciation !== ''
          ? Number(
              f.accumulatedDepreciation
            )
          : null,

      bookValue:
        f.bookValue !== ''
          ? Number(
              f.bookValue
            )
          : null,

      loanDate:
        f.loanDate ||
        null,

      returnDue:
        f.returnDue ||
        null,
    };

    try {
      if (
        isEdit &&
        equipment?._id
      ) {
        await api.put(
          `/equipment/${equipment._id}`,
          payload
        );
      } else {
        await api.post(
          '/equipment',
          payload
        );
      }

      saved();
    } catch (e: any) {
      console.error(
        'Equipment save error:',
        e
      );

      setError(
        e.response?.data?.message ||
          `Could not ${
            isEdit
              ? 'update'
              : 'save'
          } equipment.`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        isEdit
          ? 'Edit Equipment'
          : 'Add Equipment'
      }
      close={close}
    >
      <form
        className="grid-form"
        onSubmit={
          submit
        }
      >
        {fields.map(
          ([
            key,
            label,
            type,
          ]: any) => (
            <label key={key}>
              {label}

              <input
                type={type}
                value={
                  f[key] ??
                  ''
                }
                onChange={(e) =>
                  setF({
                    ...f,
                    [key]:
                      e.target
                        .value,
                  })
                }
                required={
                  key ===
                    'material' ||
                  key ===
                    'serialNumber'
                }
              />
            </label>
          )
        )}

        <label>
          LOAN STATUS

          <select
            value={
              f.loanStatus
            }
            onChange={(e) =>
              setF({
                ...f,
                loanStatus:
                  e.target
                    .value,
              })
            }
          >
            <option value="AVAILABLE">
              AVAILABLE
            </option>

            <option value="ON_LOAN">
              ON LOAN
            </option>

            <option value="MAINTENANCE">
              MAINTENANCE
            </option>

            <option value="RETIRED">
              RETIRED
            </option>
          </select>
        </label>

        <label>
          OPERATIONAL STATUS

          <select
            value={
              f.operationalStatus
            }
            onChange={(e) =>
              setF({
                ...f,
                operationalStatus:
                  e.target
                    .value,
              })
            }
          >
            <option value="OPERATIONAL">
              OPERATIONAL
            </option>

            <option value="NON_OPERATIONAL">
              NON OPERATIONAL
            </option>

            <option value="UNDER_MAINTENANCE">
              UNDER MAINTENANCE
            </option>
          </select>
        </label>

        <label>
          LOAN DATED

          <input
            type="date"
            value={
              f.loanDate ||
              ''
            }
            onChange={(e) =>
              setF({
                ...f,
                loanDate:
                  e.target
                    .value,
              })
            }
          />
        </label>

        <label>
          RETURN DUE

          <input
            type="date"
            value={
              f.returnDue ||
              ''
            }
            onChange={(e) =>
              setF({
                ...f,
                returnDue:
                  e.target
                    .value,
              })
            }
          />
        </label>

        {error && (
          <div className="error span">
            {error}
          </div>
        )}

        <div className="actions span">
          <button
            type="button"
            onClick={close}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary"
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : isEdit
              ? 'Update Equipment'
              : 'Save Equipment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* =========================================================
   LOAN SEARCH HELPERS
========================================================= */

/*
  Converts any object/value into searchable text.

  JSON.stringify is intentionally used here because loan
  records contain nested objects such as:

  requesterSnapshot
  customerSnapshot
  equipmentSnapshot
  request information
  dates
  metadata
*/
function searchableText(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  try {
    return JSON.stringify(
      value
    ).toLowerCase();
  } catch {
    return String(
      value
    ).toLowerCase();
  }
}

/*
  Allows searches such as:

  "Ali EMP-1001"

  Both words must exist somewhere in the
  related loan/request/member/customer/equipment data.
*/
function matchesSearch(
  values: unknown[],
  search: string
): boolean {
  const normalized =
    search
      .trim()
      .toLowerCase();

  if (!normalized) {
    return true;
  }

  const combined =
    values
      .map(
        (value) =>
          searchableText(
            value
          )
      )
      .join(' ');

  const tokens =
    normalized
      .split(/\s+/)
      .filter(Boolean);

  return tokens.every(
    (token) =>
      combined.includes(
        token
      )
  );
}

/* =========================================================
   LOANS
========================================================= */

function Loans({
  refresh,
  onRefresh,
  user,
  openRequestId,
  clearOpenRequest,
}: {
  refresh: number;
  onRefresh: () => void;
  user: LoginUser;
  openRequestId: string | null;
  clearOpenRequest: () => void;
}) {
  const [requests, setRequests] =
    useState<LoanRequest[]>([]);

  const [loans, setLoans] =
    useState<Loan[]>([]);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [equipment, setEquipment] =
    useState<Equipment[]>([]);

  const [adminUsers, setAdminUsers] =
    useState<any[]>([]);

  const [modal, setModal] =
    useState<
      'request' | 'issue' | 'direct-issue' | null
    >(null);

  const [selected, setSelected] =
    useState<LoanRequest | null>(
      null
    );

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  /*
    Search text for the Loans page.
  */
  const [loanSearch, setLoanSearch] =
    useState('');

  const isAdmin =
    user.role === 'ADMIN';

  const isApprover =
    isAdmin &&
    user.adminType ===
      'APPROVER';

  const isIssuer =
    isAdmin &&
    user.adminType ===
      'ISSUER';

  useEffect(() => {
    let mounted = true;

    setError('');
    setLoading(true);

    Promise.all([
      api.get('/loans/requests'),
      api.get('/loans'),
      api.get('/members'),
      api.get('/customers'),
      api.get(
        '/equipment?availableOnly=true'
      ),
    ])
      .then(
        ([
          requestsResponse,
          loansResponse,
          membersResponse,
          customersResponse,
          equipmentResponse,
        ]) => {
          if (!mounted) return;

          setRequests(
            Array.isArray(
              requestsResponse.data
            )
              ? requestsResponse.data
              : requestsResponse.data
                  ?.requests ||
                  []
          );

          setLoans(
            Array.isArray(
              loansResponse.data
            )
              ? loansResponse.data
              : loansResponse.data
                  ?.loans ||
                  []
          );

          if (isAdmin) {
            api.get('/admin/users')
              .then((adminResponse) => {
                if (!mounted) return;

                const adminData =
                  Array.isArray(
                    adminResponse.data
                  )
                    ? adminResponse.data
                    : Array.isArray(
                        adminResponse.data?.users
                      )
                    ? adminResponse.data.users
                    : [];

                setAdminUsers(
                  adminData
                );
              })
              .catch(
                (adminError) => {
                  console.error(
                    'Administrator directory loading error:',
                    adminError
                  );

                  if (mounted) {
                    setAdminUsers(
                      []
                    );
                  }
                }
              );
          } else {
            setAdminUsers([]);
          }

          setMembers(
            Array.isArray(
              membersResponse.data
            )
              ? membersResponse.data
              : membersResponse.data
                  ?.members ||
                  []
          );

          setCustomers(
            Array.isArray(
              customersResponse.data
            )
              ? customersResponse.data
              : customersResponse.data
                  ?.customers ||
                  []
          );

          setEquipment(
            Array.isArray(
              equipmentResponse.data
            )
              ? equipmentResponse.data
              : equipmentResponse.data
                  ?.equipment ||
                  []
          );
        }
      )
      .catch((e: any) => {
        console.error(
          'Loan data loading error:',
          e
        );

        if (!mounted) return;

        setError(
          e.response?.data?.message ||
            'Could not load loan data.'
        );

        setRequests([]);
        setLoans([]);
        setMembers([]);
        setCustomers([]);
        setEquipment([]);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [refresh]);

  /* =======================================================
     OPEN REQUEST FROM NOTIFICATION / DASHBOARD
  ======================================================= */

  useEffect(() => {
    if (!openRequestId) {
      return;
    }

    const request =
      requests.find(
        (x) =>
          x._id ===
          openRequestId
      );

    if (!request) {
      return;
    }

    setSelected(request);

    if (
      request.status ===
        'APPROVED' &&
      isIssuer
    ) {
      setModal('issue');
    }

    clearOpenRequest();
  }, [
    openRequestId,
    requests,
    isIssuer,
    clearOpenRequest,
  ]);

  /*
    Pending workflow records.

    PENDING and APPROVED requests are always
    visible. They are NOT affected by the
    14-day returned-loan rule.
  */
  const pending =
    requests.filter((r) =>
      [
        'PENDING',
        'APPROVED',
      ].includes(
        String(r.status || '').toUpperCase()
      )
    );

  /* =======================================================
     RETURNED LOAN VISIBILITY
  ======================================================= */

  /*
    Loan visibility rule:

    PENDING  -> always visible
    APPROVED -> always visible
    ISSUED   -> always visible

    RETURNED:
      visible for 14 days after returnedAt
      hidden after 14 days

    The database record is NOT deleted.

    We check returnedAt first.
    Older field names are supported as fallback
    so existing records can still work.
  */
  const isLoanVisible = (
    loan: Loan
  ) => {
    const rawLoan =
      loan as any;

    const status =
      String(
        rawLoan.status || ''
      ).toUpperCase();

    /*
      Active/current workflow records
      should always remain visible.
    */
    if (
      status === 'PENDING' ||
      status === 'APPROVED' ||
      status === 'ISSUED'
    ) {
      return true;
    }

    /*
      Only RETURNED loans are automatically
      hidden after 14 days.
    */
    if (
      status === 'RETURNED'
    ) {
      const returnedAt =
        rawLoan.returnedAt ||
        rawLoan.returnDate ||
        rawLoan.returnedDate;

      /*
        If returnedAt does not exist,
        keep the record visible instead
        of hiding it incorrectly.
      */
      if (!returnedAt) {
        return true;
      }

      const returnTime =
        new Date(
          returnedAt
        ).getTime();

      if (
        Number.isNaN(
          returnTime
        )
      ) {
        return true;
      }

      const fourteenDays =
        14 *
        24 *
        60 *
        60 *
        1000;

      const age =
        Date.now() -
        returnTime;

      return (
        age <
        fourteenDays
      );
    }

    /*
      Other statuses remain visible.
      This prevents an unknown/new status
      from disappearing unexpectedly.
    */
    return true;
  };

  /*
    First remove returned loans that are
    older than 14 days.
  */
  const visibleLoans =
    loans.filter(
      isLoanVisible
    );

  /*
    Find the original request associated
    with a loan.

    Different backend versions sometimes use
    requestId or loanRequestId, so both are checked.
  */
  const getRelatedRequest = (
    loan: Loan
  ) => {
    const raw =
      loan as any;

    const requestId =
      raw.requestId ??
      raw.loanRequestId ??
      raw.request?._id ??
      raw.requestId?._id;

    if (!requestId) {
      return undefined;
    }

    return requests.find(
      (request) =>
        String(
          request._id
        ) ===
        String(
          requestId
        )
    );
  };

  /*
    Find the related member.
  */
  const getRelatedMember = (
    loan: Loan,
    request?: LoanRequest
  ) => {
    const raw =
      loan as any;

    const memberId =
      raw.memberId ??
      raw.member?._id ??
      request?.memberId;

    if (!memberId) {
      return undefined;
    }

    return members.find(
      (member) =>
        String(
          member._id
        ) ===
        String(
          memberId
        )
    );
  };

  /*
    Find the related customer.
  */
  const getRelatedCustomer = (
    loan: Loan,
    request?: LoanRequest
  ) => {
    const raw =
      loan as any;

    const customerId =
      raw.customerId ??
      raw.customer?._id ??
      request?.customerId;

    if (!customerId) {
      return undefined;
    }

    return customers.find(
      (customer) =>
        String(
          customer._id
        ) ===
        String(
          customerId
        )
    );
  };

  /*
    Find the related equipment.
  */
  const getRelatedEquipment = (
    loan: Loan,
    request?: LoanRequest
  ) => {
    const raw =
      loan as any;

    const equipmentId =
      raw.equipmentId ??
      raw.equipment?._id ??
      request?.requestedEquipmentId;

    if (!equipmentId) {
      return undefined;
    }

    return equipment.find(
      (item) =>
        String(
          item._id
        ) ===
        String(
          equipmentId
        )
    );
  };

  const getRelatedAdmin = (
    value: any
  ) => {
    if (
      value &&
      typeof value ===
        'object'
    ) {
      return value;
    }

    if (!value) {
      return undefined;
    }

    return adminUsers.find(
      (admin) =>
        String(
          admin._id
        ) ===
        String(
          value
        )
    );
  };

  /*
    Build all searchable information for
    one loan.
  */
  const loanMatchesSearch = (
    loan: Loan
  ) => {
    if (
      !loanSearch.trim()
    ) {
      return true;
    }

    const request =
      getRelatedRequest(
        loan
      );

    const member =
      getRelatedMember(
        loan,
        request
      );

    const customer =
      getRelatedCustomer(
        loan,
        request
      );

    const relatedEquipment =
      getRelatedEquipment(
        loan,
        request
      );

    const rawLoan =
      loan as any;

    const approvedBy =
      getRelatedAdmin(
        rawLoan.approvedBy ??
          request?.approvedBy
      );

    const issuedBy =
      getRelatedAdmin(
        rawLoan.issuedBy ??
          request?.issuedBy
      );

    const requesterSnapshot =
      rawLoan.requesterSnapshot ||
      request?.requesterSnapshot;

    const customerSnapshot =
      rawLoan.customerSnapshot ||
      request?.customerSnapshot;

    const equipmentSnapshot =
      rawLoan.equipmentSnapshot ||
      request?.requestedEquipmentSnapshot;

    return matchesSearch(
      [
        loan,
        request,
        member,
        customer,
        relatedEquipment,
        requesterSnapshot,
        customerSnapshot,
        equipmentSnapshot,

        rawLoan.loanNumber,
        rawLoan.requestNumber,
        rawLoan.status,
        rawLoan.loanDate,
        rawLoan.expectedReturnDate,
        rawLoan.returnedAt,

        request?.requestNumber,
        request?.status,
        request?.reason,
        request?.createdAt,
        request?.approvalMethod,
        request?.approvalBypassReason,

        approvedBy,
        approvedBy?.name,
        approvedBy?.email,
        approvedBy?.department,

        issuedBy,
        issuedBy?.name,
        issuedBy?.email,
        issuedBy?.department,

        member?.name,
        member?.email,
        member?.employeeId,
        member?.department,

        customer?.name,
        customer?.customerCode,

        relatedEquipment?.material,
        relatedEquipment?.serialNumber,
        relatedEquipment?.model,
        relatedEquipment?.description,
        relatedEquipment?.location,
        relatedEquipment?.fineLocation,
        relatedEquipment?.loanStatus,
        relatedEquipment?.operationalStatus,

        requesterSnapshot?.name,
        requesterSnapshot?.email,
        requesterSnapshot?.employeeId,

        customerSnapshot?.name,
        customerSnapshot?.customerCode,

        equipmentSnapshot?.material,
        equipmentSnapshot?.serialNumber,
        equipmentSnapshot?.model,
        equipmentSnapshot?.description,
        equipmentSnapshot?.location,
        equipmentSnapshot?.fineLocation,
      ],
      loanSearch
    );
  };

  /*
    Search pending requests too.
  */
  const requestMatchesSearch = (
    request: LoanRequest
  ) => {
    if (
      !loanSearch.trim()
    ) {
      return true;
    }

    const member =
      members.find(
        (item) =>
          String(
            item._id
          ) ===
          String(
            request.memberId
          )
      );

    const customer =
      customers.find(
        (item) =>
          String(
            item._id
          ) ===
          String(
            request.customerId
          )
      );

    const relatedEquipment =
      equipment.find(
        (item) =>
          String(
            item._id
          ) ===
          String(
            request.requestedEquipmentId
          )
      );

    return matchesSearch(
      [
        request,
        member,
        customer,
        relatedEquipment,

        request.requestNumber,
        request.requester,
        request.status,
        request.reason,
        request.memberId,
        request.customerId,
        request.createdAt,
        request.requestedReturnDate,

        request.requesterSnapshot,
        request.customerSnapshot,
        request.requestedEquipmentSnapshot,

        member?.name,
        member?.email,
        member?.employeeId,
        member?.department,

        customer?.name,
        customer?.customerCode,

        relatedEquipment?.material,
        relatedEquipment?.serialNumber,
        relatedEquipment?.model,
        relatedEquipment?.description,
        relatedEquipment?.location,
        relatedEquipment?.fineLocation,
      ],
      loanSearch
    );
  };

  /*
    IMPORTANT:
    Filter visible loans FIRST,
    then apply search.
  */
  const filteredLoans =
    visibleLoans.filter(
      loanMatchesSearch
    );

  const filteredPending =
    pending.filter(
      requestMatchesSearch
    );

  /* =======================================================
     APPROVE
  ======================================================= */

  const approveRequest = async (
    request: LoanRequest
  ) => {
    if (!isApprover) {
      return;
    }

    setProcessingId(
      request._id
    );

    try {
      await api.post(
        `/loans/requests/${request._id}/approve`
      );

      onRefresh();
    } catch (e: any) {
      console.error(
        'Approve request error:',
        e
      );

      alert(
        e.response?.data?.message ||
          'Could not approve request.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* =======================================================
     REJECT
  ======================================================= */

  const rejectRequest = async (
    request: LoanRequest
  ) => {
    if (!isApprover) {
      return;
    }

    setProcessingId(
      request._id
    );

    try {
      await api.post(
        `/loans/requests/${request._id}/reject`
      );

      onRefresh();
    } catch (e: any) {
      console.error(
        'Reject request error:',
        e
      );

      alert(
        e.response?.data?.message ||
          'Could not reject request.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* =======================================================
     RETURN
  ======================================================= */

  const returnLoan = async (
    loan: Loan
  ) => {
    if (!isAdmin) {
      return;
    }

    setProcessingId(
      loan._id
    );

    try {
      await api.post(
        `/loans/${loan._id}/return`
      );

      onRefresh();
    } catch (e: any) {
      console.error(
        'Return loan error:',
        e
      );

      alert(
        e.response?.data?.message ||
          'Could not return instrument.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* =======================================================
     OPEN ISSUE MODAL
  ======================================================= */

  const openIssueModal = (
    request: LoanRequest
  ) => {
    if (!isIssuer) {
      return;
    }

    setSelected(request);
    setModal('issue');
  };

  /* =======================================================
     ISSUER DIRECT APPROVE + ISSUE
  ======================================================= */

  const directIssueRequest = async (
    request: LoanRequest
  ) => {
    if (
      !isIssuer ||
      request.status !==
        'PENDING'
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Approve and issue ${
          request.requestNumber ||
          'this request'
        } directly?\n\nThe ISSUER will perform both approval and issuance in one operation.`
      );

    if (!confirmed) {
      return;
    }

    setProcessingId(
      request._id
    );

    try {
      await api.post(
        `/loans/requests/${request._id}/direct-issue`
      );

      onRefresh();
    } catch (e: any) {
      console.error(
        'Direct issue error:',
        e
      );

      alert(
        e.response?.data?.message ||
          'Could not approve and issue the request directly.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  /*
    Clear search.
  */
  const clearSearch = () => {
    setLoanSearch('');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h3>
            Loans
          </h3>

          <p>
            Requests, approval, issue instrument,
            returns and history.
          </p>
        </div>

        {!isAdmin && (
          <button
            className="primary"
            onClick={() =>
              setModal(
                'request'
              )
            }
            type="button"
          >
            <Plus size={16} />
            Request Loan
          </button>
        )}
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {/* ===================================================
          LOAN SEARCH
      =================================================== */}

      <div
        className="panel"
        style={{
          marginBottom:
            '18px',
        }}
      >
        <div
          style={{
            display:
              'flex',
            alignItems:
              'center',
            gap: '12px',
            width:
              '100%',
          }}
        >
          <div
            style={{
              position:
                'relative',
              flex:
                '1',
            }}
          >
            <Search
              size={18}
              style={{
                position:
                  'absolute',
                left:
                  '13px',
                top:
                  '50%',
                transform:
                  'translateY(-50%)',
                opacity:
                  0.55,
                pointerEvents:
                  'none',
              }}
            />

            <input
              type="search"
              value={
                loanSearch
              }
              onChange={(
                e
              ) =>
                setLoanSearch(
                  e.target
                    .value
                )
              }
              placeholder="Search loan number, requester, employee ID, customer, equipment, serial number, model, location, status..."
              aria-label="Search loans"
              style={{
                width:
                  '100%',
                padding:
                  '12px 42px',
                boxSizing:
                  'border-box',
              }}
            />

            {loanSearch && (
              <button
                type="button"
                onClick={
                  clearSearch
                }
                title="Clear search"
                aria-label="Clear search"
                style={{
                  position:
                    'absolute',
                  right:
                    '8px',
                  top:
                    '50%',
                  transform:
                    'translateY(-50%)',
                  border:
                    'none',
                  background:
                    'transparent',
                  cursor:
                    'pointer',
                  padding:
                    '6px',
                }}
              >
                <X
                  size={17}
                />
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop:
              '9px',
            display:
              'flex',
            justifyContent:
              'space-between',
            gap:
              '12px',
            flexWrap:
              'wrap',
            fontSize:
              '13px',
            opacity:
              0.75,
          }}
        >
          {loanSearch.trim() && (
            <strong>
              {filteredLoans.length}{' '}
              of{' '}
              {visibleLoans.length}{' '}
              visible loans found
            </strong>
          )}
        </div>
      </div>

      {/* ===================================================
          PENDING REQUESTS
      =================================================== */}

      {(isApprover ||
        isIssuer) &&
        filteredPending.map(
          (r) => (
            <div
              className="request"
              key={r._id}
            >
              <div>
                <b>
                  {r.requestNumber}
                </b>

                <span>
                  {r.requesterSnapshot?.name ||
                    r.requester ||
                    r.memberId}{' '}
                  ·{' '}
                  {r.customerSnapshot?.name ||
                    r.customerId}
                </span>

                <small>
                  {r.createdAt
                    ? new Date(
                        r.createdAt
                      ).toLocaleString()
                    : '—'}
                </small>
              </div>

              <div className="row">
                <Status
                  s={
                    r.status ||
                    'UNKNOWN'
                  }
                />

                {r.status ===
                  'PENDING' &&
                  isApprover && (
                    <>
                      <button
                        disabled={
                          processingId ===
                          r._id
                        }
                        onClick={() =>
                          approveRequest(
                            r
                          )
                        }
                        type="button"
                      >
                        <Check
                          size={14}
                        />

                        {processingId ===
                        r._id
                          ? 'Processing...'
                          : 'Approve'}
                      </button>

                      <button
                        disabled={
                          processingId ===
                          r._id
                        }
                        onClick={() =>
                          rejectRequest(
                            r
                          )
                        }
                        type="button"
                      >
                        <X
                          size={14}
                        />

                        Reject
                      </button>
                    </>
                  )}

                {r.status ===
                  'PENDING' &&
                  isIssuer && (
                    <button
                      className="primary"
                      disabled={
                        processingId ===
                        r._id
                      }
                      onClick={() =>
                        directIssueRequest(
                          r
                        )
                      }
                      type="button"
                    >
                      <Check
                        size={14}
                      />

                      {processingId ===
                      r._id
                        ? 'Processing...'
                        : 'Approve & Issue Directly'}
                    </button>
                  )}

                {r.status ===
                  'APPROVED' &&
                  isIssuer && (
                    <button
                      className="primary"
                      onClick={() =>
                        openIssueModal(
                          r
                        )
                      }
                      type="button"
                    >
                      <ClipboardList
                        size={14}
                      />

                      Issue Instrument
                    </button>
                  )}
              </div>
            </div>
          )
        )}

      {(isApprover ||
        isIssuer) &&
        loanSearch.trim() &&
        filteredPending.length ===
          0 &&
        pending.length > 0 && (
          <div className="empty">
            No pending requests match
            "{loanSearch}".
          </div>
        )}

      {/* ===================================================
          ALL / MY LOANS
      =================================================== */}

      <Panel
        title={
          isAdmin
            ? 'All Loans'
            : 'My Loans'
        }
        subtitle={
          loanSearch.trim()
            ? `Showing ${filteredLoans.length} of ${visibleLoans.length} visible loan record${
                visibleLoans.length ===
                1
                  ? ''
                  : 's'
              }`
            : `${visibleLoans.length} visible loan record${
                visibleLoans.length ===
                1
                  ? ''
                  : 's'
              }`
        }
      >
        {loading ? (
          <Loading />
        ) : (
          <Table
            headers={[
              'Loan',
              'Equipment',
              'Requester',
              'Customer',
              'Loan Date',
              'Expected Return',
              'Approved By',
              'Issued By',
              'Status',
              '',
            ]}
          >
            {filteredLoans.length ===
            0 ? (
              <tr>
                <td colSpan={10}>
                  <div className="empty">
                    {loanSearch.trim()
                      ? `No loans match "${loanSearch}".`
                      : 'No loans found.'}
                  </div>
                </td>
              </tr>
            ) : (
              filteredLoans.map(
                (l) => {
                  const relatedRequest =
                    getRelatedRequest(
                      l
                    );

                  const member =
                    getRelatedMember(
                      l,
                      relatedRequest
                    );

                  const requesterSnapshot =
                    (l as any)
                      .requesterSnapshot ||
                    relatedRequest?.requesterSnapshot;

                  const requesterName =
                    requesterSnapshot?.name ||
                    (l as any)
                      .requester ||
                    member?.name ||
                    '—';

                  const requesterEmployeeId =
                    requesterSnapshot?.employeeId ||
                    member?.employeeId ||
                    '';

                  const requesterEmail =
                    requesterSnapshot?.email ||
                    member?.email ||
                    '';

                  const customer =
                    getRelatedCustomer(
                      l,
                      relatedRequest
                    );

                  const customerName =
                    (l as any)
                      .customerSnapshot
                      ?.name ||
                    customer?.name ||
                    '—';

                  const equipmentSnapshot =
                    (l as any)
                      .equipmentSnapshot;

                  const relatedEquipment =
                    getRelatedEquipment(
                      l,
                      relatedRequest
                    );

                  const equipmentName =
                    equipmentSnapshot?.material ||
                    equipmentSnapshot?.name ||
                    relatedEquipment?.material ||
                    equipmentSnapshot?.serialNumber ||
                    relatedEquipment?.serialNumber ||
                    '—';

                  const equipmentSerial =
                    equipmentSnapshot?.serialNumber ||
                    relatedEquipment?.serialNumber ||
                    '';

                  const rawLoan =
                    l as any;

                  const returnedAt =
                    rawLoan.returnedAt ||
                    rawLoan.returnDate ||
                    rawLoan.returnedDate;

                  return (
                    <tr
                      key={
                        l._id
                      }
                    >
                      <td>
                        <div>
                          <b>
                            {l.loanNumber ||
                              '—'}
                          </b>

                          {rawLoan
                            .requestNumber && (
                            <small
                              style={{
                                display:
                                  'block',
                                marginTop:
                                  '4px',
                                opacity:
                                  0.65,
                              }}
                            >
                              Request:{' '}
                              {
                                rawLoan.requestNumber
                              }
                            </small>
                          )}

                          {relatedRequest
                            ?.requestNumber &&
                            !rawLoan.requestNumber && (
                              <small
                                style={{
                                  display:
                                    'block',
                                  marginTop:
                                    '4px',
                                  opacity:
                                    0.65,
                                }}
                              >
                                Request:{' '}
                                {
                                  relatedRequest.requestNumber
                                }
                              </small>
                            )}
                        </div>
                      </td>

                      <td>
                        <div>
                          <b>
                            {
                              equipmentName
                            }
                          </b>

                          {equipmentSerial && (
                            <small
                              style={{
                                display:
                                  'block',
                                marginTop:
                                  '4px',
                                opacity:
                                  0.7,
                              }}
                            >
                              Serial:{' '}
                              {
                                equipmentSerial
                              }
                            </small>
                          )}
                        </div>
                      </td>

                      <td>
                        <div>
                          <b>
                            {
                              requesterName
                            }
                          </b>

                          {requesterEmployeeId && (
                            <small
                              style={{
                                display:
                                  'block',
                                marginTop:
                                  '4px',
                                opacity:
                                  0.7,
                              }}
                            >
                              ID:{' '}
                              {
                                requesterEmployeeId
                              }
                            </small>
                          )}

                          {requesterEmail && (
                            <small
                              style={{
                                display:
                                  'block',
                                marginTop:
                                  '3px',
                                opacity:
                                  0.7,
                              }}
                            >
                              {
                                requesterEmail
                              }
                            </small>
                          )}

                          {member?.department && (
                            <small
                              style={{
                                display:
                                  'block',
                                marginTop:
                                  '3px',
                                opacity:
                                  0.65,
                              }}
                            >
                              {
                                member.department
                              }
                            </small>
                          )}
                        </div>
                      </td>

                      <td>
                        <div>
                          <b>
                            {
                              customerName
                            }
                          </b>

                          {customer?.customerCode && (
                            <small
                              style={{
                                display:
                                  'block',
                                marginTop:
                                  '4px',
                                opacity:
                                  0.7,
                              }}
                            >
                              {
                                customer.customerCode
                              }
                            </small>
                          )}
                        </div>
                      </td>

                      <td>
                        {formatDate(
                          l.loanDate
                        )}
                      </td>

                      <td>
                        {formatDate(
                          l.expectedReturnDate
                        )}
                      </td>

                      <td>
                        {(() => {
                          const approvedBy =
                            getRelatedAdmin(
                              rawLoan.approvedBy ??
                                relatedRequest?.approvedBy
                            );

                          const approvedByName =
                            approvedBy?.name ||
                            approvedBy?.fullName ||
                            approvedBy?.email ||
                            rawLoan.approvedByName ||
                            (
                              rawLoan.approvedBy &&
                              typeof rawLoan.approvedBy ===
                                'string'
                            )
                              ? rawLoan.approvedBy
                              : '—';

                          const approvedByDepartment =
                            approvedBy?.department;

                          return (
                            <div>
                              <b>
                                {
                                  approvedByName
                                }
                              </b>

                              {approvedByDepartment && (
                                <small
                                  style={{
                                    display:
                                      'block',
                                    marginTop:
                                      '4px',
                                    opacity:
                                      0.7,
                                  }}
                                >
                                  {
                                    approvedByDepartment
                                  }
                                </small>
                              )}

                              {approvedBy?.email && (
                                <small
                                  style={{
                                    display:
                                      'block',
                                    marginTop:
                                      '3px',
                                    opacity:
                                      0.6,
                                  }}
                                >
                                  {
                                    approvedBy.email
                                  }
                                </small>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      <td>
                        {(() => {
                          const issuedBy =
                            getRelatedAdmin(
                              rawLoan.issuedBy
                            );

                          const issuedByName =
                            issuedBy?.name ||
                            issuedBy?.fullName ||
                            issuedBy?.email ||
                            rawLoan.issuedByName ||
                            rawLoan.issuedByEmail ||
                            (
                              rawLoan.issuedBy &&
                              typeof rawLoan.issuedBy ===
                                'string'
                            )
                              ? rawLoan.issuedBy
                              : '—';

                          const issuedByDepartment =
                            issuedBy?.department;

                          return (
                            <div>
                              <b>
                                {l.status ===
                                  'ISSUED' ||
                                l.status ===
                                  'RETURNED'
                                  ? issuedByName
                                  : '—'}
                              </b>

                              {issuedByDepartment && (
                                <small
                                  style={{
                                    display:
                                      'block',
                                    marginTop:
                                      '4px',
                                    opacity:
                                      0.7,
                                  }}
                                >
                                  {
                                    issuedByDepartment
                                  }
                                </small>
                              )}

                              {l.status ===
                                'RETURNED' &&
                                returnedAt && (
                                  <small
                                    style={{
                                      display:
                                        'block',
                                      marginTop:
                                        '4px',
                                      opacity:
                                        0.6,
                                    }}
                                  >
                                    Returned:{' '}
                                    {new Date(
                                      returnedAt
                                    ).toLocaleDateString()}
                                  </small>
                                )}
                            </div>
                          );
                        })()}
                      </td>

                      <td>
                        <Status
                          s={
                            l.status ||
                            'UNKNOWN'
                          }
                        />
                      </td>

                      <td>
                        {isAdmin &&
                          l.status ===
                            'ISSUED' && (
                            <button
                              onClick={() =>
                                returnLoan(
                                  l
                                )
                              }
                              disabled={
                                processingId ===
                                l._id
                              }
                              className="small"
                              type="button"
                            >
                              <RotateCcw
                                size={
                                  14
                                }
                              />

                              {processingId ===
                              l._id
                                ? 'Returning...'
                                : 'Return'}
                            </button>
                          )}
                      </td>
                    </tr>
                  );
                }
              )
            )}
          </Table>
        )}
      </Panel>

      {modal && (
        <LoanModal
          mode={modal}
          request={selected}
          members={members}
          customers={customers}
          equipment={equipment}
          user={user}
          close={() => {
            setModal(null);
            setSelected(null);
          }}
          saved={() => {
            setModal(null);
            setSelected(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}

/* =========================================================
   LOAN MODAL
========================================================= */

function LoanModal({
  mode,
  request,
  members,
  customers,
  equipment,
  user,
  close,
  saved,
}: {
  mode: 'request' | 'issue' | 'direct-issue';
  request: LoanRequest | null;
  members: Member[];
  customers: Customer[];
  equipment: Equipment[];
  user: LoginUser;
  close: () => void;
  saved: () => void;
}) {
  const memberId =
    request?.memberId ||
    members.find(
      (m) =>
        m.employeeId ===
        user.employeeId
    )?._id ||
    '';

  const [f, setF] = useState({
    memberId,

    customerId:
      request?.customerId ||
      '',

    equipmentId:
      request?.requestedEquipmentId ||
      '',

    expectedReturnDate:
      request?.requestedReturnDate
        ?.slice(0, 10) ||
      '',

    reason:
      request?.reason ||
      '',
  });

  const [error, setError] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const selectedCustomer =
    customers.find(
      (customer) =>
        customer._id ===
        f.customerId
    );

  const submit = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setError('');

    if (
      mode ===
      'request'
    ) {
      if (!f.memberId) {
        setError(
          'Requester is required.'
        );
        return;
      }

      if (!f.customerId) {
        setError(
          'Customer is required.'
        );
        return;
      }

      if (!f.equipmentId) {
        setError(
          'Please select equipment.'
        );
        return;
      }

      if (
        !f.expectedReturnDate
      ) {
        setError(
          'Please select expected return date.'
        );
        return;
      }
    }

    if (
      mode ===
      'issue'
    ) {
      if (!request?._id) {
        setError(
          'Request not selected.'
        );
        return;
      }

      if (!f.equipmentId) {
        setError(
          'Please select an available instrument.'
        );
        return;
      }

      if (
        !f.expectedReturnDate
      ) {
        setError(
          'Please select expected return date.'
        );
        return;
      }
    }

    setSaving(true);

    try {
      if (
        mode ===
        'request'
      ) {
        await api.post(
          '/loans/requests',
          {
            memberId:
              f.memberId,

            customerId:
              f.customerId,

            requestedEquipmentId:
              f.equipmentId ||
              null,

            requestedReturnDate:
              f.expectedReturnDate ||
              null,

            reason:
              f.reason.trim(),
          }
        );
      }

      if (
        mode ===
        'issue'
      ) {
        await api.post(
          `/loans/requests/${request?._id}/issue`,
          {
            equipmentId:
              f.equipmentId,

            expectedReturnDate:
              f.expectedReturnDate,
          }
        );
      }

      saved();
    } catch (e: any) {
      console.error(
        'Loan operation error:',
        e
      );

      setError(
        e.response?.data?.message ||
          e.message ||
          'Operation failed.'
      );
    } finally {
      setSaving(false);
    }
  };

  const activeCustomers =
    customers.filter(
      (customer) =>
        customer.isActive !==
        false
    );

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  return (
    <Modal
      title={
        mode ===
        'issue'
          ? 'Issue Instrument'
          : 'Request Loan'
      }
      close={close}
    >
      <form
        className="grid-form"
        onSubmit={
          submit
        }
      >
        {mode ===
          'issue' && (
          <div className="info span">
            <b>
              Request:
            </b>{' '}
            {request?.requestNumber ||
              '—'}

            <br />

            <b>
              Requester:
            </b>{' '}
            {request
              ?.requesterSnapshot
              ?.name ||
              request?.requester ||
              '—'}

            <br />

            <b>
              Customer:
            </b>{' '}
            {request
              ?.customerSnapshot
              ?.name ||
              selectedCustomer?.name ||
              '—'}

            <br />

            <b>
              Status:
            </b>{' '}
            <Status
              s={
                request?.status ||
                'UNKNOWN'
              }
            />
          </div>
        )}

        <label>
          Equipment

          <select
            value={
              f.equipmentId
            }
            onChange={(e) =>
              setF({
                ...f,
                equipmentId:
                  e.target
                    .value,
              })
            }
            required
          >
            <option value="">
              Select equipment
            </option>

            {equipment.map(
              (x: Equipment) => (
                <option
                  key={x._id}
                  value={x._id}
                >
                  {x.material ||
                    'Equipment'}{' '}
                  —{' '}
                  {x.serialNumber ||
                    x.sNo ||
                    'No serial'}
                </option>
              )
            )}
          </select>

          <small>
            Only currently available
            equipment is shown.
          </small>
        </label>

        {mode ===
          'request' && (
          <>
            {user.role !==
            'ADMIN' ? (
              <label>
                Requester

                <input
                  disabled
                  value={
                    members.find(
                      (m) =>
                        m._id ===
                        f.memberId
                    )?.name ||
                    user.name ||
                    ''
                  }
                />
              </label>
            ) : (
              <label>
                Requester

                <select
                  value={
                    f.memberId
                  }
                  onChange={(e) =>
                    setF({
                      ...f,
                      memberId:
                        e.target
                          .value,
                    })
                  }
                  required
                >
                  <option value="">
                    Select requester
                  </option>

                  {members.map(
                    (x) => (
                      <option
                        key={
                          x._id
                        }
                        value={
                          x._id
                        }
                      >
                        {x.name}

                        {x.employeeId
                          ? ` — ${x.employeeId}`
                          : ''}
                      </option>
                    )
                  )}
                </select>
              </label>
            )}

            <label>
              Customer

              <select
                value={
                  f.customerId
                }
                onChange={(e) =>
                  setF({
                    ...f,
                    customerId:
                      e.target
                        .value,
                  })
                }
                required
              >
                <option value="">
                  Select customer
                </option>

                {activeCustomers.map(
                  (
                    customer
                  ) => (
                    <option
                      key={
                        customer._id
                      }
                      value={
                        customer._id
                      }
                    >
                      {
                        customer.name
                      }

                      {customer.customerCode
                        ? ` — ${customer.customerCode}`
                        : ''}
                    </option>
                  )
                )}
              </select>

              {activeCustomers.length ===
                0 && (
                <small className="error-text">
                  No customers are
                  available. Please
                  add customers
                  before requesting
                  a loan.
                </small>
              )}
            </label>

            <label>
              Reason

              <textarea
                value={
                  f.reason
                }
                onChange={(e) =>
                  setF({
                    ...f,
                    reason:
                      e.target
                        .value,
                  })
                }
                placeholder="Optional reason for the loan"
              />
            </label>
          </>
        )}

        {mode ===
          'issue' && (
          <>
            <label>
              Requester

              <input
                disabled
                value={
                  request
                    ?.requesterSnapshot
                    ?.name ||
                  request?.requester ||
                  ''
                }
              />
            </label>

            <label>
              Customer

              <input
                disabled
                value={
                  request
                    ?.customerSnapshot
                    ?.name ||
                  selectedCustomer?.name ||
                  ''
                }
              />
            </label>
          </>
        )}

        <label>
          Loan Date

          <input
            disabled
            value={today}
          />
        </label>

        <label>
          Expected Return Date

          <input
            type="date"
            value={
              f.expectedReturnDate
            }
            required
            min={today}
            onChange={(e) =>
              setF({
                ...f,
                expectedReturnDate:
                  e.target
                    .value,
              })
            }
          />
        </label>

        {error && (
          <div className="error span">
            {error}
          </div>
        )}

        <div className="actions span">
          <button
            type="button"
            onClick={close}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            className="primary"
            type="submit"
            disabled={
              saving ||
              (mode ===
                'request' &&
                activeCustomers.length ===
                  0)
            }
          >
            {saving
              ? mode ===
                'issue'
                ? 'Issuing...'
                : 'Submitting...'
              : mode ===
                'issue'
              ? 'Issue Instrument'
              : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* =========================================================
   LOCATIONS
========================================================= */

function Locations({
  refresh,
}: {
  refresh: number;
}) {
  const [items, setItems] =
    useState<Location[]>([]);

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    setError('');
    setLoading(true);

    api
      .get('/locations')
      .then((r) => {
        if (!mounted) return;

        const data =
          Array.isArray(r.data)
            ? r.data
            : Array.isArray(
                r.data?.locations
              )
            ? r.data.locations
            : [];

        setItems(data);
      })
      .catch((e: any) => {
        console.error(
          'Location loading error:',
          e
        );

        if (mounted) {
          setError(
            e.response?.data
              ?.message ||
              'Could not load locations.'
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [refresh]);

  return (
    <>
      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <Panel
        title="Locations"
        subtitle="Company locations and their fine locations"
      >
        {loading ? (
          <Loading />
        ) : items.length ===
          0 ? (
          <div className="empty">
            No locations found.
          </div>
        ) : (
          <div className="location-grid">
            {items.map(
              (location) => (
                <div
                  className="location-card"
                  key={
                    location._id
                  }
                >
                  <div className="location-card-head">
                    <div className="location-icon">
                      <MapPin
                        size={18}
                      />
                    </div>

                    <div>
                      <h3>
                        {
                          location.name
                        }
                      </h3>

                      <span>
                        Code:{' '}
                        {
                          location.code
                        }
                      </span>
                    </div>
                  </div>

                  {location.address && (
                    <p className="location-address">
                      {
                        location.address
                      }
                    </p>
                  )}

                  <div className="fine-location-section">
                    <div className="fine-location-title">
                      Fine Locations
                    </div>

                    {location
                      .fineLocations
                      ?.length ? (
                      <div className="fine-location-list">
                        {location.fineLocations.map(
                          (
                            fineLocation
                          ) => (
                            <div
                              className="fine-location-item"
                              key={
                                fineLocation.code
                              }
                            >
                              <span>
                                {
                                  fineLocation.name
                                }
                              </span>

                              <small>
                                {
                                  fineLocation.code
                                }
                              </small>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="empty">
                        No fine
                        locations
                        defined.
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Panel>
    </>
  );
}

/* =========================================================
   REPORTS
========================================================= */

function Reports({
  admin,
}: {
  admin: boolean;
}) {
  const [exporting, setExporting] =
    useState<string | null>(
      null
    );

  const exportFile = async (
    path: string,
    name: string
  ) => {
    if (!admin) return;

    try {
      setExporting(name);

      const r = await api.get(
        path,
        {
          responseType: 'blob',
        }
      );

      const url =
        URL.createObjectURL(
          r.data
        );

      const a =
        document.createElement(
          'a'
        );

      a.href = url;
      a.download = name;

      document.body.appendChild(
        a
      );

      a.click();

      a.remove();

      URL.revokeObjectURL(
        url
      );
    } catch (e) {
      console.error(
        'Report export error:',
        e
      );

      alert(
        'Could not export the report.'
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="report-grid">
      <div className="report-card">
        <FileSpreadsheet />

        <h3>
          Loan Report
        </h3>

        <p>
          Current loan records.
        </p>

        <button
          className="primary"
          disabled={
            !admin ||
            exporting ===
              'loan-report.xlsx'
          }
          onClick={() =>
            exportFile(
              '/reports/loans.xlsx',
              'loan-report.xlsx'
            )
          }
          type="button"
        >
          {exporting ===
          'loan-report.xlsx'
            ? 'Generating...'
            : 'Export Excel'}
        </button>
      </div>

      <div className="report-card">
        <Boxes />

        <h3>
          Inventory Report
        </h3>

        <p>
          Current equipment inventory.
        </p>

        <button
          className="primary"
          disabled={
            !admin ||
            exporting ===
              'inventory-report.xlsx'
          }
          onClick={() =>
            exportFile(
              '/reports/inventory.xlsx',
              'inventory-report.xlsx'
            )
          }
          type="button"
        >
          {exporting ===
          'inventory-report.xlsx'
            ? 'Generating...'
            : 'Export Excel'}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   ADMINISTRATION
========================================================= */

function Administration({
  refresh,
  onRefresh,
  user,
}: {
  refresh: number;
  onRefresh: () => void;
  user: LoginUser;
}) {
  const [file, setFile] =
    useState<File | null>(
      null
    );

  const [preview, setPreview] =
    useState<any>(null);

  const [result, setResult] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const requiredColumns = [
    'S No',
    'Acquisition year',
    'Material',
    'Serial Number',
    'Model',
    'Description',
    'Acquis.val.',
    'Accum.dep.',
    'Book val.',
    'Currency',
    'Cost Center',
    'Bal.sh.acct APC',
    'Location',
    'Fine Location',
    'LOAN STATUS',
    'OPERATIONAL STATUS',
    'REQUESTER',
    'CUSTOMER',
    'LOAN DATED',
    'RETURN DUE',
  ];

  const normalizeHeader = (
    value: any
  ) => {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '_'
      )
      .replace(
        /^_+|_+$/g,
        '');
  };

  const getPreviewValue = (
    row: any,
    column: string
  ) => {
    if (
      !row ||
      typeof row !==
        'object'
    ) {
      return '';
    }

    if (
      Object.prototype.hasOwnProperty.call(
        row,
        column
      )
    ) {
      return row[column];
    }

    const target =
      normalizeHeader(
        column
      );

    const matchingKey =
      Object.keys(row).find(
        (key) =>
          normalizeHeader(
            key
          ) === target
      );

    if (
      matchingKey !==
      undefined
    ) {
      return row[
        matchingKey
      ];
    }

    return '';
  };

  const previewRows =
    Array.isArray(
      preview?.preview
    )
      ? preview.preview
      : [];

  const previewErrors =
    Array.isArray(
      preview?.errors
    )
      ? preview.errors
      : [];

  const resultErrors =
    Array.isArray(
      result?.errors
    )
      ? result.errors
      : [];

  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const selected =
      e.target.files?.[0] ||
      null;

    setFile(selected);
    setPreview(null);
    setResult(null);
    setError('');

    if (!selected) {
      return;
    }

    const extension =
      selected.name
        .substring(
          selected.name.lastIndexOf(
            '.'
          )
        )
        .toLowerCase();

    const validExtensions = [
      '.xlsx',
      '.xls',
      '.csv',
    ];

    if (
      !validExtensions.includes(
        extension
      )
    ) {
      setError(
        'Please upload an Excel file (.xlsx, .xls) or CSV file.'
      );

      setFile(null);

      e.target.value = '';
    }
  };

  const previewFile =
    async () => {
      if (!file) {
        setError(
          'Please select a file first.'
        );
        return;
      }

      setLoading(true);
      setError('');
      setResult(null);

      try {
        const formData =
          new FormData();

        formData.append(
          'file',
          file
        );

        const response =
          await api.post(
            '/excel/preview',
            formData
          );

        const data =
          response.data;

        if (
          !data ||
          typeof data !==
            'object'
        ) {
          throw new Error(
            'The server returned an invalid preview response.'
          );
        }

        setPreview(data);
      } catch (e: any) {
        console.error(
          'Excel preview error:',
          e
        );

        setPreview(null);

        setError(
          e.response?.data
            ?.message ||
            e.message ||
            'Could not preview the Excel file.'
        );
      } finally {
        setLoading(false);
      }
    };

  const importFile =
    async () => {
      if (!file) {
        setError(
          'Please select a file first.'
        );
        return;
      }

      setLoading(true);
      setError('');
      setResult(null);

      try {
        const formData =
          new FormData();

        formData.append(
          'file',
          file
        );

        const response =
          await api.post(
            '/excel/import',
            formData
          );

        const data =
          response.data;

        if (
          !data ||
          typeof data !==
            'object'
        ) {
          throw new Error(
            'The server returned an invalid import response.'
          );
        }

        setResult(data);
        setPreview(null);

        onRefresh();
      } catch (e: any) {
        console.error(
          'Excel import error:',
          e
        );

        setError(
          e.response?.data
            ?.message ||
            e.message ||
            'Could not import the Excel file.'
        );
      } finally {
        setLoading(false);
      }
    };

  const downloadTemplate =
    () => {
      try {
        const worksheet =
          XLSX.utils.aoa_to_sheet(
            [requiredColumns]
          );

        worksheet['!cols'] =
          requiredColumns.map(
            (column) => ({
              wch: Math.max(
                column.length +
                  2,
                15
              ),
            })
          );

        const workbook =
          XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          'Equipment Master'
        );

        XLSX.writeFile(
          workbook,
          'equipment-master-template.xlsx'
        );
      } catch (e) {
        console.error(
          'Template generation error:',
          e
        );

        alert(
          'Could not create the Excel template.'
        );
      }
    };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');

    const input =
      document.querySelector(
        'input[data-equipment-master-file="true"]'
      ) as HTMLInputElement | null;

    if (input) {
      input.value = '';
    }
  };

  return (
    <>
      <Panel
        title="Equipment Excel Import"
        subtitle="Upload one master Excel file containing all equipment information."
      >
        <div className="import">
          <div className="info span">
            <b>
              Single Equipment
              Master File
            </b>

            <p>
              Upload one CSV or
              Excel file
              containing all 20
              equipment fields.
              The system
              validates the
              columns, previews
              the records and
              imports them into
              MongoDB.
            </p>
          </div>

          <label>
            Equipment Master
            File

            <input
              data-equipment-master-file="true"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={
                handleFileChange
              }
            />
          </label>

          {file && (
            <div className="selected-file">
              <b>
                Selected file:
              </b>{' '}
              {file.name}

              <small>
                {' '}
                (
                {Math.max(
                  1,
                  Math.round(
                    file.size /
                      1024
                  )
                )}{' '}
                KB)
              </small>
            </div>
          )}

          <div className="row">
            <button
              type="button"
              onClick={
                downloadTemplate
              }
              disabled={loading}
            >
              <Download
                size={16}
              />
              Download Template
            </button>

            <button
              type="button"
              onClick={
                clearFile
              }
              disabled={
                loading ||
                !file
              }
            >
              Clear
            </button>

            <button
              type="button"
              className="primary"
              disabled={
                !file ||
                loading
              }
              onClick={
                previewFile
              }
            >
              <Upload
                size={16}
              />

              {loading
                ? 'Processing...'
                : 'Preview'}
            </button>

            <button
              type="button"
              className="primary"
              disabled={
                !file ||
                loading
              }
              onClick={
                importFile
              }
            >
              <FileSpreadsheet
                size={16}
              />

              {loading
                ? 'Importing...'
                : 'Import Equipment'}
            </button>
          </div>
        </div>

        <div className="hint">
          <b>
            Required Excel
            columns:
          </b>

          <div className="column-list">
            {requiredColumns.map(
              (column) => (
                <span
                  key={
                    column
                  }
                  className="column-chip"
                >
                  {column}
                </span>
              )
            )}
          </div>
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}
      </Panel>

      {preview && (
        <Panel
          title="Excel Preview"
          subtitle={
            preview.totalRows !==
            undefined
              ? `${preview.totalRows} records found`
              : `${previewRows.length} records available for preview`
          }
        >
          <div className="stats">
            <div className="stat">
              <FileSpreadsheet
                size={18}
              />

              <div>
                <span>
                  Total Rows
                </span>

                <strong>
                  {preview.totalRows ??
                    previewRows.length ??
                    0}
                </strong>
              </div>
            </div>

            <div className="stat">
              <Check size={18} />

              <div>
                <span>
                  Valid Rows
                </span>

                <strong>
                  {preview.validRows ??
                    0}
                </strong>
              </div>
            </div>

            <div className="stat">
              <X size={18} />

              <div>
                <span>
                  Invalid Rows
                </span>

                <strong>
                  {preview.invalidRows ??
                    0}
                </strong>
              </div>
            </div>
          </div>

          {previewErrors.length >
            0 && (
            <div className="error">
              <b>
                Validation Errors
              </b>

              <div className="import-errors">
                {previewErrors.map(
                  (
                    item: any,
                    index: number
                  ) => (
                    <div
                      key={
                        index
                      }
                    >
                      Row{' '}
                      {item.rowNumber ??
                        '—'}
                      :{' '}
                      {item.message ||
                        item.error ||
                        'Invalid row'}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {previewRows.length >
          0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {requiredColumns.map(
                      (
                        column
                      ) => (
                        <th
                          key={
                            column
                          }
                        >
                          {
                            column
                          }
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {previewRows.map(
                    (
                      row: any,
                      index: number
                    ) => (
                      <tr
                        key={
                          index
                        }
                      >
                        {requiredColumns.map(
                          (
                            column
                          ) => {
                            const value =
                              getPreviewValue(
                                row,
                                column
                              );

                            return (
                              <td
                                key={
                                  column
                                }
                              >
                                {value ===
                                  undefined ||
                                value ===
                                  null ||
                                value ===
                                  ''
                                  ? '—'
                                  : String(
                                      value
                                    )}
                              </td>
                            );
                          }
                        )}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              No records found
              in the Excel file.
            </div>
          )}
        </Panel>
      )}

      {result && (
        <Panel
          title="Import Completed"
          subtitle="The equipment master data has been processed."
        >
          <div className="stats">
            <div className="stat">
              <FileSpreadsheet
                size={18}
              />

              <div>
                <span>
                  Total Rows
                </span>

                <strong>
                  {result.totalRows ??
                    result.total ??
                    0}
                </strong>
              </div>
            </div>

            <div className="stat">
              <Check size={18} />

              <div>
                <span>
                  Inserted
                </span>

                <strong>
                  {result.inserted ??
                    result.created ??
                    0}
                </strong>
              </div>
            </div>

            <div className="stat">
              <RotateCcw
                size={18}
              />

              <div>
                <span>
                  Updated
                </span>

                <strong>
                  {result.updated ??
                    0}
                </strong>
              </div>
            </div>

            <div className="stat">
              <X size={18} />

              <div>
                <span>
                  Failed
                </span>

                <strong>
                  {result.failed ??
                    result.errorsCount ??
                    0}
                </strong>
              </div>
            </div>
          </div>

          <div className="info">
            <b>
              Status:
            </b>{' '}
            {result.status ||
              'COMPLETED'}

            <br />

            <b>
              File:
            </b>{' '}
            {result.filename ||
              result.fileName ||
              file?.name ||
              '—'}
          </div>

          {resultErrors.length >
            0 && (
            <div className="error">
              <b>
                Rows with errors
              </b>

              <div className="import-errors">
                {resultErrors.map(
                  (
                    item: any,
                    index: number
                  ) => (
                    <div
                      key={
                        index
                      }
                    >
                      Row{' '}
                      {item.rowNumber ??
                        '—'}
                      :{' '}
                      {item.message ||
                        item.error ||
                        'Import error'}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </Panel>
      )}

      <AdminDutyManagement
        refresh={refresh}
        onRefresh={onRefresh}
        user={user}
      />

      <Panel
        title="Audit & Import History"
        subtitle="Equipment import and system actions are retained in MongoDB."
      >
        <AuditList
          refresh={refresh}
        />
      </Panel>
    </>
  );
}

/* =========================================================
   ADMIN DUTY MANAGEMENT
========================================================= */

function AdminDutyManagement({
  refresh,
  onRefresh,
  user,
}: {
  refresh: number;
  onRefresh: () => void;
  user: LoginUser;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [requestedAdminType, setRequestedAdminType] = useState<AdminType>('APPROVER');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isApprover =
    user.role === 'ADMIN' &&
    user.adminType === 'APPROVER';

  const load = async () => {
    try {
      setLoading(true);
      setError('');

      const [usersResponse, requestsResponse] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/duty-requests'),
      ]);

      const usersData =
        Array.isArray(usersResponse.data)
          ? usersResponse.data
          : Array.isArray(usersResponse.data?.users)
          ? usersResponse.data.users
          : [];

      const requestData =
        Array.isArray(requestsResponse.data)
          ? requestsResponse.data
          : Array.isArray(requestsResponse.data?.requests)
          ? requestsResponse.data.requests
          : Array.isArray(requestsResponse.data?.dutyRequests)
          ? requestsResponse.data.dutyRequests
          : [];

      setUsers(usersData);
      setRequests(requestData);
    } catch (e: any) {
      console.error('Admin duty data loading error:', e);
      setError(
        e.response?.data?.message ||
          'Could not load administrative duty information.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refresh]);

  const activeUsers = users.filter(
    (x) => x?.isActive !== false
  );

  const employeeUsers = activeUsers.filter(
    (x) => x.role === 'EMPLOYEE' && !x.adminType
  );

  const activeApprovers = activeUsers.filter(
    (x) => x.role === 'ADMIN' && x.adminType === 'APPROVER'
  );

  const activeIssuers = activeUsers.filter(
    (x) => x.role === 'ADMIN' && x.adminType === 'ISSUER'
  );

  const pendingRequests = requests.filter(
    (x) => x.status === 'PENDING'
  );

  const submitRequest = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!targetUserId) {
      setError('Please select an employee who will receive the administrative duty.');
      return;
    }

    if (reason.trim().length < 3) {
      setError('Please provide a reason for the duty change.');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/admin/duty-requests', {
        targetUserId,
        requestedAdminType,
        reason: reason.trim(),
      });

      setTargetUserId('');
      setRequestedAdminType('APPROVER');
      setReason('');
      setSuccess(
        'Administrative duty change request submitted. The APPROVER administrator must approve it.'
      );
      await load();
      onRefresh();
    } catch (e: any) {
      console.error('Admin duty request error:', e);
      setError(
        e.response?.data?.message ||
          'Could not submit the administrative duty change request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const approveRequest = async (request: any) => {
    if (!request?._id || !isApprover) return;

    setProcessingId(request._id);
    setError('');
    setSuccess('');

    try {
      await api.post(
        `/admin/duty-requests/${request._id}/approve`
      );
      setSuccess('Administrative duty change approved successfully.');
      await load();
      onRefresh();
    } catch (e: any) {
      console.error('Admin duty approval error:', e);
      setError(
        e.response?.data?.message ||
          'Could not approve the duty change request.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const rejectRequest = async (request: any) => {
    if (!request?._id || !isApprover) return;

    const rejectionReason = window.prompt(
      'Enter the reason for rejecting this administrative duty change:',
      ''
    );

    if (rejectionReason === null) return;

    if (rejectionReason.trim().length < 3) {
      alert('Please provide a rejection reason of at least 3 characters.');
      return;
    }

    setProcessingId(request._id);
    setError('');
    setSuccess('');

    try {
      await api.post(
        `/admin/duty-requests/${request._id}/reject`,
        { rejectionReason: rejectionReason.trim() }
      );
      setSuccess('Administrative duty change request rejected.');
      await load();
      onRefresh();
    } catch (e: any) {
      console.error('Admin duty rejection error:', e);
      setError(
        e.response?.data?.message ||
          'Could not reject the duty change request.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const userName = (value: any) =>
    value?.name || value?.email || value?.employeeId || '—';

  const getRequestUser = (
    request: any,
    field: 'targetUser' | 'currentAdminUser'
  ) => {
    const value = request?.[field];

    if (value && typeof value === 'object') return value;

    return users.find(
      (x) => String(x._id) === String(value)
    );
  };

  if (loading) {
    return (
      <Panel
        title="Administrative Duty Management"
        subtitle="Manage multiple APPROVER and ISSUER administrators and their duty changes."
      >
        <Loading />
      </Panel>
    );
  }

  return (
    <Panel
      title="Administrative Duty Management"
      subtitle="Duty changes are requested first and reviewed by an active APPROVER administrator."
    >
      {error && <div className="error">{error}</div>}

      {success && (
        <div className="success">
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <ShieldCheck size={18} />
          <div>
            <span>APPROVER</span>
            <strong>
              {activeApprovers.length > 0
                ? `${activeApprovers.length} active`
                : 'None active'}
            </strong>
          </div>
        </div>

        <div className="stat">
          <Boxes size={18} />
          <div>
            <span>ISSUER</span>
            <strong>
              {activeIssuers.length > 0
                ? `${activeIssuers.length} active`
                : 'None active'}
            </strong>
          </div>
        </div>

        <div className="stat">
          <ClipboardList size={18} />
          <div>
            <span>Pending Changes</span>
            <strong>{pendingRequests.length}</strong>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
          marginBottom: '18px',
        }}
      >
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-head">
            <div>
              <h3>Active APPROVER Administrators</h3>
              <p>Employees currently authorized to approve requests.</p>
            </div>
          </div>
          {activeApprovers.length === 0 ? (
            <div className="empty">No active APPROVER administrator.</div>
          ) : (
            <div className="list">
              {activeApprovers.map((x) => (
                <div className="request" key={x._id}>
                  <div>
                    <b>{userName(x)}</b>
                    <span>{x.department || 'Department not set'}</span>
                    <small>{x.email || '—'}</small>
                  </div>
                  <Status s="APPROVER" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-head">
            <div>
              <h3>Active ISSUER Administrators</h3>
              <p>Employees currently authorized to issue instruments.</p>
            </div>
          </div>
          {activeIssuers.length === 0 ? (
            <div className="empty">No active ISSUER administrator.</div>
          ) : (
            <div className="list">
              {activeIssuers.map((x) => (
                <div className="request" key={x._id}>
                  <div>
                    <b>{userName(x)}</b>
                    <span>{x.department || 'Department not set'}</span>
                    <small>{x.email || '—'}</small>
                  </div>
                  <Status s="ISSUER" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="info">
        <b>Current workflow:</b>{' '}
        An active employee is selected → a duty is requested → an APPROVER reviews it → the employee receives the requested administrative duty. Multiple APPROVER and ISSUER administrators can remain active at the same time. An ISSUER can also approve and issue a pending loan request directly. Existing administrators remain unchanged unless a separate handover or replacement process is used.
      </div>

      <form className="grid-form" onSubmit={submitRequest}>
        <label>
          Employee
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            required
          >
            <option value="">Select employee</option>
            {employeeUsers.map((x) => (
              <option key={x._id} value={x._id}>
                {x.name || 'Employee'}
                {x.employeeId ? ` — ${x.employeeId}` : ''}
                {x.email ? ` — ${x.email}` : ''}
              </option>
            ))}
          </select>
          {employeeUsers.length === 0 && (
            <small>No active employee is currently available for a duty assignment.</small>
          )}
        </label>

        <label>
          Administrative Duty
          <select
            value={requestedAdminType}
            onChange={(e) =>
              setRequestedAdminType(e.target.value as AdminType)
            }
            required
          >
            <option value="APPROVER">
              APPROVER — approve loan and duty requests
            </option>
            <option value="ISSUER">
              ISSUER — issue approved instruments and directly approve + issue pending requests
            </option>
          </select>
        </label>

        <label className="span">
          Reason
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for assigning or transferring this administrative duty"
            minLength={3}
            maxLength={1000}
            required
          />
        </label>

        <div className="actions span">
          <button
            type="submit"
            className="primary"
            disabled={submitting || employeeUsers.length === 0}
          >
            {submitting ? 'Submitting...' : 'Request Duty Change'}
          </button>
        </div>
      </form>

      <div className="panel" style={{ marginTop: '18px' }}>
        <div className="panel-head">
          <div>
            <h3>Duty Change Requests</h3>
            <p>
              Pending requests require APPROVER action. Completed requests remain visible for audit history.
            </p>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="empty">
            No administrative duty change requests found.
          </div>
        ) : (
          <Table
            headers={[
              'Request',
              'Target Employee',
              'Previous Duty Holder',
              'Requested Duty',
              'Reason',
              'Status',
              'Created',
              'Actions',
            ]}
          >
            {requests.map((request) => {
              const target = getRequestUser(request, 'targetUser');
              const currentAdmin = getRequestUser(
                request,
                'currentAdminUser'
              );
              const isPending = request.status === 'PENDING';

              return (
                <tr key={request._id}>
                  <td>
                    <b>
                      {request.requestNumber ||
                        String(request._id).slice(-8)}
                    </b>
                  </td>

                  <td>
                    <div>
                      <b>{userName(target)}</b>
                      {target?.employeeId && (
                        <small
                          style={{
                            display: 'block',
                            marginTop: '3px',
                            opacity: 0.7,
                          }}
                        >
                          {target.employeeId}
                        </small>
                      )}
                    </div>
                  </td>

                  <td>
                    {currentAdmin
                      ? userName(currentAdmin)
                      : 'No current holder'}
                  </td>

                  <td>
                    <Status
                      s={request.requestedAdminType || 'UNKNOWN'}
                    />
                  </td>

                  <td>{request.reason || '—'}</td>

                  <td>
                    <Status s={request.status || 'UNKNOWN'} />
                  </td>

                  <td>
                    {request.createdAt
                      ? new Date(request.createdAt).toLocaleString()
                      : '—'}
                  </td>

                  <td>
                    <div className="row">
                      {isPending && isApprover && (
                        <>
                          <button
                            type="button"
                            className="small primary"
                            disabled={processingId === request._id}
                            onClick={() => approveRequest(request)}
                          >
                            <Check size={14} />
                            Approve
                          </button>

                          <button
                            type="button"
                            className="small"
                            disabled={processingId === request._id}
                            onClick={() => rejectRequest(request)}
                          >
                            <X size={14} />
                            Reject
                          </button>
                        </>
                      )}

                      {isPending && !isApprover && (
                        <span>Awaiting APPROVER</span>
                      )}

                      {!isPending && <span>—</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>
    </Panel>
  );
}

/* =========================================================
   AUDIT LIST
========================================================= */

function AuditList({
  refresh,
}: {
  refresh: number;
}) {
  const [data, setData] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError('');

    api
      .get('/audit-logs')
      .then((r) => {
        if (!mounted) return;

        const rows =
          Array.isArray(r.data)
            ? r.data
            : Array.isArray(
                r.data?.logs
              )
            ? r.data.logs
            : Array.isArray(
                r.data
                  ?.auditLogs
              )
            ? r.data.auditLogs
            : [];

        setData(rows);
      })
      .catch((e: any) => {
        if (!mounted) return;

        console.error(
          'Audit loading error:',
          e
        );

        setData([]);

        setError(
          e.response?.data
            ?.message ||
            'Could not load audit history.'
        );
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [refresh]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="error">
        {error}
      </div>
    );
  }

  if (
    !data ||
    data.length === 0
  ) {
    return (
      <div className="empty">
        No audit history found.
      </div>
    );
  }

  return (
    <Table
      headers={[
        'Action',
        'Entity',
        'Record',
        'User',
        'When',
      ]}
    >
      {data.map((x) => (
        <tr
          key={x._id}
        >
          <td>
            <Status
              s={
                x.action ||
                'UNKNOWN'
              }
            />
          </td>

          <td>
            {x.entityType ||
              x.entity ||
              '—'}
          </td>

          <td>
            {x.entityId ||
              x.recordId ||
              '—'}
          </td>

          <td>
            {x.userName ||
              x.user?.name ||
              x.userId ||
              '—'}
          </td>

          <td>
            {x.createdAt
              ? new Date(
                  x.createdAt
                ).toLocaleString()
              : '—'}
          </td>
        </tr>
      ))}
    </Table>
  );
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function Notifications({
  data,
  refresh,
  openRequest,
}: {
  data: Notification[];
  refresh: () => void;
  openRequest: (
    id: string
  ) => void;
}) {
  const [
    markingAll,
    setMarkingAll,
  ] = useState(false);

  const read = async (
    n: Notification
  ) => {
    try {
      if (!n.isRead) {
        await api.post(
          `/notifications/${n._id}/read`
        );

        refresh();
      }

      if (
        n.referenceType ===
          'LOAN_REQUEST' &&
        n.referenceId
      ) {
        openRequest(
          n.referenceId
        );
      }
    } catch (e) {
      console.error(
        'Notification read error:',
        e
      );
    }
  };

  const markAllRead =
    async () => {
      setMarkingAll(true);

      try {
        await api.post(
          '/notifications/read-all'
        );

        refresh();
      } catch (e) {
        console.error(
          'Mark all notifications error:',
          e
        );
      } finally {
        setMarkingAll(false);
      }
    };

  const unread =
    data.filter(
      (n) => !n.isRead
    ).length;

  return (
    <Panel
      title="Notifications"
      subtitle="Real-time company workflow events"
    >
      {unread > 0 && (
        <div className="row">
          <button
            onClick={
              markAllRead
            }
            disabled={
              markingAll
            }
            type="button"
          >
            {markingAll
              ? 'Updating...'
              : 'Mark all as read'}
          </button>
        </div>
      )}

      {data.length ? (
        data.map((n) => (
          <button
            className={
              n.isRead
                ? 'notification-item'
                : 'notification-item unread'
            }
            key={n._id}
            onClick={() =>
              read(n)
            }
            type="button"
          >
            <Bell size={17} />

            <div>
              <b>
                {n.title}
              </b>

              <p>
                {n.message}
              </p>

              <small>
                {n.createdAt
                  ? new Date(
                      n.createdAt
                    ).toLocaleString()
                  : '—'}
              </small>
            </div>
          </button>
        ))
      ) : (
        <div className="empty">
          No notifications.
        </div>
      )}
    </Panel>
  );
}

/* =========================================================
   SHARED PANEL
========================================================= */

function Panel({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      {title && (
        <div className="panel-head">
          <div>
            <h3>
              {title}
            </h3>

            {subtitle && (
              <p>
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {children}
    </section>
  );
}

/* =========================================================
   TABLE
========================================================= */

function Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map(
              (
                h,
                index
              ) => (
                <th
                  key={`${h}-${index}`}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
}

/* =========================================================
   STATUS
========================================================= */

function Status({
  s,
}: {
  s: string;
}) {
  const value =
    s || 'UNKNOWN';

  return (
    <span
      className={`status ${value
        .toLowerCase()
        .replaceAll(
          ' ',
          '_'
        )}`}
    >
      {value.replaceAll(
        '_',
        ' '
      )}
    </span>
  );
}

/* =========================================================
   MODAL
========================================================= */

function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  return (
    <div className="backdrop">
      <div className="modal">
        <div className="modal-head">
          <h3>
            {title}
          </h3>

          <button
            className="icon"
            onClick={close}
            type="button"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/* =========================================================
   LOADING
========================================================= */

function Loading() {
  return (
    <div className="loading">
      Loading...
    </div>
  );
}

/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(
  value: any
) {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return date.toLocaleDateString();
}

/* =========================================================
   DATE FORMAT FOR EXCEL
========================================================= */

function formatDateForExcel(
  value: any
) {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      date.getDate()
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/* =========================================================
   INPUT DATE
========================================================= */

function toInputDate(
  value: any
) {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date
    .toISOString()
    .slice(0, 10);
}

/* =========================================================
   MONEY FORMAT
========================================================= */

function formatMoney(
  value:
    | number
    | string
    | null
    | undefined,
  currency?: string
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—';
  }

  const number =
    Number(value);

  if (
    Number.isNaN(number)
  ) {
    return '—';
  }

  return `${
    currency || ''
  } ${number.toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`.trim();
}

/* =========================================================
   EXPORT
========================================================= */

export default App;