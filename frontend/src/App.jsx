import { useState, useEffect } from 'react'
import axios from 'axios'
import { GoogleLogin } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { LogOut, Plus, Trash2, Server, ServerOff, ListTodo, LayoutDashboard, CreditCard, BarChart, Crown, CheckCircle2, Shield } from 'lucide-react'

function App() {
  const [message, setMessage] = useState('Connecting to backend...')
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  
  const [todos, setTodos] = useState([])
  const [newTodo, setNewTodo] = useState('')
  
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [isRegistering, setIsRegistering] = useState(false)
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')

  const [isMfaRequired, setIsMfaRequired] = useState(false)
  const [mfaTokenInput, setMfaTokenInput] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [mfaSetupToken, setMfaSetupToken] = useState('')
  const [mfaStatusMsg, setMfaStatusMsg] = useState('')

  // New State for Dashboard
  const [activeTab, setActiveTab] = useState('dashboard')
  const [membershipTier, setMembershipTier] = useState(localStorage.getItem('membership_tier') || 'BASIC')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_your_key_here'

  useEffect(() => {
    // Check backend connection
    axios.get(`${apiUrl}/api/hello/`)
      .then(response => { setMessage(response.data.message) })
      .catch(err => {
        console.error("Error connecting to backend:", err)
        setError("Failed to connect to backend. Is the server running?")
      })

    // Auto login check
    const savedToken = localStorage.getItem('access_token')
    if (savedToken) {
      try {
        const decoded = jwtDecode(savedToken)
        setUser({ name: decoded.name || "Logged In User" })
        fetchTodos(savedToken)
      } catch (e) {
        handleLogout()
      }
    }
  }, [apiUrl])

  const fetchTodos = async (token) => {
    try {
      const res = await axios.get(`${apiUrl}/api/todos/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTodos(res.data)
    } catch (err) {
      console.error("Error fetching todos", err)
      if (err.response?.status === 401) {
        handleLogout()
      }
    }
  }

  const handleAddTodo = async (e) => {
    e.preventDefault()
    if (!newTodo.trim()) return

    // Limit check for Basic tier
    if (membershipTier === 'BASIC' && todos.length >= 5) {
      setError("Basic plan is limited to 5 tasks. Please upgrade to Premium.")
      setActiveTab('pricing')
      return
    }

    const token = localStorage.getItem('access_token')
    try {
      const res = await axios.post(`${apiUrl}/api/todos/`, 
        { title: newTodo },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setTodos([res.data, ...todos])
      setNewTodo('')
      setError('')
    } catch (err) { console.error("Error adding todo", err) }
  }

  const toggleTodo = async (todo) => {
    const token = localStorage.getItem('access_token')
    try {
      const res = await axios.patch(`${apiUrl}/api/todos/${todo.id}/`, 
        { completed: !todo.completed },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setTodos(todos.map(t => t.id === todo.id ? res.data : t))
    } catch (err) { console.error("Error toggling todo", err) }
  }

  const handleDeleteTodo = async (id) => {
    const token = localStorage.getItem('access_token')
    try {
      await axios.delete(`${apiUrl}/api/todos/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTodos(todos.filter(t => t.id !== id))
    } catch (err) { console.error("Error deleting todo", err) }
  }

  const handleNormalLogin = async (e) => {
    e.preventDefault();
    try {
      const payload = { username: loginUsername, password: loginPassword };
      if (isMfaRequired) {
          payload.mfa_token = mfaTokenInput;
      }
      const res = await axios.post(`${apiUrl}/api/token/`, payload);
      const { access, refresh } = res.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      const decoded = jwtDecode(access);
      setUser({ name: decoded.name || loginUsername });
      setIsMfaRequired(false);
      setMfaTokenInput('');
      fetchTodos(access);
    } catch (err) {
      console.error("Normal Login failed:", err);
      if (err.response?.data?.mfa_required) {
          setIsMfaRequired(true);
          setError("MFA Token is required.");
      } else {
          setError("Login failed. Check your credentials.");
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const payload = { username: registerUsername, password: registerPassword, email: registerEmail };
      await axios.post(`${apiUrl}/api/register/`, payload);
      setMessage("Registration successful! Please sign in.");
      setIsRegistering(false);
      setError('');
    } catch (err) {
      console.error("Registration failed:", err);
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { credential } = credentialResponse;
      const res = await axios.post(`${apiUrl}/api/google-login/`, { token: credential })
      const { access, refresh, user: userInfo } = res.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      setUser(userInfo);
      fetchTodos(access);
    } catch (err) {
      console.error("Login failed:", err);
      setError("Login failed. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('membership_tier');
    setUser(null);
    setTodos([]);
    setMembershipTier('BASIC');
  };

  const handleUpgrade = async () => {
    setIsProcessingPayment(true);
    setError("");
    const token = localStorage.getItem('access_token');
    
    try {
      // 1. Create order from backend
      const orderRes = await axios.post(`${apiUrl}/api/accounts/payments/create-order/`, 
        { amount: 500, tier: 'PREMIUM' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const { id: order_id, amount, currency } = orderRes.data;

      // 2. Open Razorpay Checkout
      const options = {
        key: razorpayKey, 
        amount: amount,
        currency: currency,
        name: "Todo App Pro",
        description: "Upgrade to Premium Plan",
        order_id: order_id,
        handler: async function (response) {
          try {
            // 3. Verify payment signature on backend
            await axios.post(`${apiUrl}/api/accounts/payments/verify/`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              tier: 'PREMIUM'
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            // Success! Update local state
            setMembershipTier('PREMIUM');
            localStorage.setItem('membership_tier', 'PREMIUM');
            alert("Successfully upgraded to Premium!");
            setActiveTab('dashboard');
          } catch (verifyErr) {
            console.error("Payment verification failed:", verifyErr);
            setError("Payment verification failed.");
          }
        },
        prefill: {
          name: user?.name || "User",
          email: user?.email || "",
        },
        theme: {
          color: "#8B5CF6"
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        console.error("Payment failed", response.error);
        setError("Payment failed: " + response.error.description);
      });
      rzp.open();

    } catch (err) {
      console.error("Error creating order:", err);
      setError("Failed to initialize payment. Check backend configuration or test keys.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const renderDashboard = () => (
    <div className="tab-content dashboard-tab">
      <div className="dashboard-header">
        <h2>My Tasks</h2>
        {membershipTier === 'BASIC' && (
          <span className="tier-badge basic-badge">Basic Plan ({todos.length}/5 tasks)</span>
        )}
        {membershipTier === 'PREMIUM' && (
          <span className="tier-badge premium-badge"><Crown size={14}/> Premium</span>
        )}
      </div>

      <form className="todo-form" onSubmit={handleAddTodo}>
        <input 
          type="text" 
          className="todo-input"
          value={newTodo} 
          onChange={e => setNewTodo(e.target.value)} 
          placeholder="What needs to be done?"
        />
        <button type="submit" className="add-btn">
          <Plus size={20} /> Add
        </button>
      </form>
      
      {todos.length === 0 ? (
        <div className="empty-state">
          <ListTodo size={48} strokeWidth={1.5} opacity={0.5} />
          <p>You're all caught up! No tasks pending.</p>
        </div>
      ) : (
        <ul className="todo-list">
          {todos.map(todo => (
            <li key={todo.id} className="todo-item">
              <input 
                type="checkbox" 
                className="todo-checkbox"
                checked={todo.completed} 
                onChange={() => toggleTodo(todo)} 
              />
              <span className={`todo-text ${todo.completed ? 'completed' : ''}`}>
                {todo.title}
              </span>
              <button className="delete-btn" onClick={() => handleDeleteTodo(todo.id)} aria-label="Delete todo">
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderPricing = () => (
    <div className="tab-content pricing-tab">
      <div className="pricing-header">
        <h2>Upgrade Your Plan</h2>
        <p>Unlock the full potential of Todo App</p>
      </div>
      
      <div className="pricing-cards">
        <div className="pricing-card basic">
          <h3>Basic</h3>
          <div className="price">Free</div>
          <ul className="features">
            <li><CheckCircle2 size={16}/> Up to 5 Tasks</li>
            <li><CheckCircle2 size={16}/> Standard Theme</li>
            <li className="disabled"><CheckCircle2 size={16}/> Priority Support</li>
            <li className="disabled"><CheckCircle2 size={16}/> Advanced Analytics</li>
          </ul>
          <button className="plan-btn" disabled>Current Plan</button>
        </div>
        
        <div className="pricing-card premium">
          <div className="popular-badge">Most Popular</div>
          <h3>Premium</h3>
          <div className="price">₹500<span>/lifetime</span></div>
          <ul className="features">
            <li><CheckCircle2 size={16}/> Unlimited Tasks</li>
            <li><CheckCircle2 size={16}/> Pro Themes & UI</li>
            <li><CheckCircle2 size={16}/> Priority Support</li>
            <li><CheckCircle2 size={16}/> Advanced Analytics</li>
          </ul>
          {membershipTier === 'PREMIUM' ? (
            <button className="plan-btn active-plan" disabled>Active</button>
          ) : (
            <button className="plan-btn upgrade-btn" onClick={handleUpgrade} disabled={isProcessingPayment}>
              {isProcessingPayment ? "Processing..." : "Upgrade Now"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="tab-content analytics-tab">
      <h2>Analytics Dashboard</h2>
      {membershipTier === 'PREMIUM' ? (
        <div className="analytics-content">
          <div className="stat-grid">
            <div className="stat-card">
              <h3>Total Tasks</h3>
              <div className="stat-value">{todos.length}</div>
            </div>
            <div className="stat-card">
              <h3>Completed</h3>
              <div className="stat-value">{todos.filter(t => t.completed).length}</div>
            </div>
            <div className="stat-card">
              <h3>Completion Rate</h3>
              <div className="stat-value">
                {todos.length > 0 ? Math.round((todos.filter(t => t.completed).length / todos.length) * 100) : 0}%
              </div>
            </div>
          </div>
          <div className="dummy-chart">
            <BarChart size={64} opacity={0.2} />
            <p>Productivity trends available for your account.</p>
          </div>
        </div>
      ) : (
        <div className="premium-locked">
          <Crown size={48} className="lock-icon" />
          <h3>Premium Feature</h3>
          <p>Upgrade to Premium to view advanced productivity analytics and insights.</p>
          <button className="upgrade-link" onClick={() => setActiveTab('pricing')}>View Pricing</button>
        </div>
      )}
    </div>
  );

  const fetchMfaSetup = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await axios.get(`${apiUrl}/api/accounts/mfa/setup/`, { headers: { Authorization: `Bearer ${token}` } });
      setQrCodeUrl(res.data.qr_code);
      setMfaStatusMsg('Scan this QR code with Google Authenticator.');
    } catch (err) {
      if (err.response?.data?.error === "MFA is already enabled.") {
         setMfaStatusMsg("MFA is currently enabled on your account.");
         setQrCodeUrl('');
      } else {
         setError("Failed to fetch MFA setup.");
      }
    }
  };

  useEffect(() => {
     if (activeTab === 'security' && user) {
        fetchMfaSetup();
     }
  }, [activeTab, user]);

  const handleEnableMfa = async () => {
    const token = localStorage.getItem('access_token');
    try {
      await axios.post(`${apiUrl}/api/accounts/mfa/enable/`, { token: mfaSetupToken }, { headers: { Authorization: `Bearer ${token}` } });
      setMfaStatusMsg("MFA successfully enabled!");
      setQrCodeUrl('');
      setMfaSetupToken('');
      alert("MFA Enabled!");
    } catch (err) {
      setError("Invalid MFA Token.");
    }
  };

  const handleDisableMfa = async () => {
    const token = localStorage.getItem('access_token');
    const disableToken = prompt("Enter an MFA code to disable MFA:");
    if (!disableToken) return;
    try {
      await axios.post(`${apiUrl}/api/accounts/mfa/disable/`, { token: disableToken }, { headers: { Authorization: `Bearer ${token}` } });
      setMfaStatusMsg("MFA disabled.");
      alert("MFA Disabled!");
      fetchMfaSetup();
    } catch (err) {
      setError("Failed to disable MFA. Invalid token.");
    }
  };

  const renderSecurity = () => (
    <div className="tab-content">
      <div className="dashboard-header">
        <h2>Account Security</h2>
      </div>
      <div className="glass-panel" style={{textAlign: 'left'}}>
        <h3 style={{marginTop: 0}}>Two-Factor Authentication</h3>
        <p style={{marginBottom: '20px'}}>{mfaStatusMsg}</p>
        
        {qrCodeUrl && (
          <div style={{textAlign: 'center', marginBottom: '20px'}}>
            <img src={qrCodeUrl} alt="MFA QR Code" style={{borderRadius: '8px', padding: '10px', background: 'white'}} />
            <div style={{marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center'}}>
              <input type="text" className="auth-input" style={{width: '200px'}} placeholder="Enter 6-digit code" value={mfaSetupToken} onChange={e => setMfaSetupToken(e.target.value)} />
              <button className="add-btn" onClick={handleEnableMfa}>Enable MFA</button>
            </div>
          </div>
        )}
        
        {!qrCodeUrl && mfaStatusMsg === "MFA is currently enabled on your account." && (
           <button className="add-btn" style={{background: 'var(--danger-color)'}} onClick={handleDisableMfa}>Disable MFA</button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className={`status-toast ${error ? 'error' : 'success'}`}>
        {error ? <ServerOff size={20} /> : <Server size={20} />}
        <span>{error || message}</span>
      </div>

      {!user ? (
        <div className="auth-container">
          <div className="glass-panel">
            <h1>Todo App</h1>
            <p>Organize your day with elegance</p>
            
            {isRegistering ? (
              <form className="auth-form" onSubmit={handleRegister}>
                <input 
                  type="text" 
                  className="auth-input"
                  value={registerUsername}
                  onChange={e => setRegisterUsername(e.target.value)}
                  placeholder="Username"
                  required
                />
                <input 
                  type="email" 
                  className="auth-input"
                  value={registerEmail}
                  onChange={e => setRegisterEmail(e.target.value)}
                  placeholder="Email (optional)"
                />
                <input 
                  type="password" 
                  className="auth-input"
                  value={registerPassword}
                  onChange={e => setRegisterPassword(e.target.value)}
                  placeholder="Password"
                  required
                />
                <button type="submit" className="auth-btn">
                  Register
                </button>
                <button type="button" onClick={() => setIsRegistering(false)} style={{background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', marginTop: '5px'}}>
                  Already have an account? Sign In
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleNormalLogin}>
                <input 
                  type="text" 
                  className="auth-input"
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  placeholder="Username"
                  required
                  disabled={isMfaRequired}
                />
                <input 
                  type="password" 
                  className="auth-input"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Password"
                  required
                  disabled={isMfaRequired}
                />
                {isMfaRequired && (
                  <input 
                    type="text" 
                    className="auth-input"
                    value={mfaTokenInput}
                    onChange={e => setMfaTokenInput(e.target.value)}
                    placeholder="6-digit MFA Code"
                    required
                  />
                )}
                <button type="submit" className="auth-btn">
                  {isMfaRequired ? "Verify & Sign In" : "Sign In"}
                </button>
                {isMfaRequired ? (
                  <button type="button" onClick={() => setIsRegistering(false)} style={{background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', marginTop: '5px'}}>Cancel MFA Login</button>
                ) : (
                  <button type="button" onClick={() => setIsRegistering(true)} style={{background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', marginTop: '5px'}}>Need an account? Register</button>
                )}
              </form>
            )}

            <div className="auth-divider">
              <span>or continue with</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Login Failed')}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="app-layout">
          <aside className="sidebar">
            <div className="sidebar-header">
              <h2>Todo App</h2>
            </div>
            <nav className="sidebar-nav">
              <button 
                className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <LayoutDashboard size={20} /> Dashboard
              </button>
              <button 
                className={`nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                <BarChart size={20} /> Analytics
              </button>
              <button 
                className={`nav-btn ${activeTab === 'pricing' ? 'active' : ''}`}
                onClick={() => setActiveTab('pricing')}
              >
                <CreditCard size={20} /> Pricing
              </button>
              <button 
                className={`nav-btn ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                <Shield size={20} /> Security
              </button>
            </nav>
            <div className="sidebar-footer">
              <div className="user-profile">
                <div className="avatar">{user.name?.charAt(0) || user.email?.charAt(0) || 'U'}</div>
                <div className="user-details">
                  <span className="user-name">{user.first_name || user.name || 'User'}</span>
                  <span className="user-tier">{membershipTier}</span>
                </div>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </aside>
          
          <main className="main-content">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'pricing' && renderPricing()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'security' && renderSecurity()}
          </main>
        </div>
      )}
    </>
  )
}

export default App
