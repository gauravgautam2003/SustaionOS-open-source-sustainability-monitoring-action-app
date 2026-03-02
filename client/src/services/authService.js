// Auth service with localStorage-based mock authentication

const USERS_KEY = 'sustainos_users';
const CURRENT_USER_KEY = 'sustainos_current_user';

// Get all registered users from localStorage
const getAllUsers = () => {
  const users = localStorage.getItem(USERS_KEY);
  return users ? JSON.parse(users) : [];
};

// Save users to localStorage
const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// Generate a simple JWT-like token
const generateToken = (email) => {
  return btoa(JSON.stringify({ email, iat: Date.now() }));
};

export const login = async (credentials) => {
  const { email, password } = credentials;

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Validation
  if (!email || !password) {
    return {
      success: false,
      message: 'Email and password are required',
    };
  }

  // Find user
  const users = getAllUsers();
  const user = users.find((u) => u.email === email);

  if (!user) {
    return {
      success: false,
      message: 'User not found. Please register first.',
    };
  }

  // Check password (in real app, use bcrypt)
  if (user.password !== password) {
    return {
      success: false,
      message: 'Invalid email or password',
    };
  }

  // Generate token and return user
  const token = generateToken(email);
  const userWithoutPassword = { ...user };
  delete userWithoutPassword.password;

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));

  return {
    success: true,
    message: 'Login successful',
    user: userWithoutPassword,
    token,
  };
};

export const register = async (data) => {
  const { email, password, organizationName } = data;

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Validation
  if (!email || !password || !organizationName) {
    return {
      success: false,
      message: 'All fields are required',
    };
  }

  if (password.length < 6) {
    return {
      success: false,
      message: 'Password must be at least 6 characters',
    };
  }

  // Check if user already exists
  const users = getAllUsers();
  if (users.some((u) => u.email === email)) {
    return {
      success: false,
      message: 'Email already registered',
    };
  }

  // Create new user
  const newUser = {
    id: Date.now().toString(),
    email,
    password, // In real app, hash this with bcrypt
    organizationName,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  // Generate token and return user
  const token = generateToken(email);
  const userWithoutPassword = { ...newUser };
  delete userWithoutPassword.password;

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));

  return {
    success: true,
    message: 'Registration successful',
    user: userWithoutPassword,
    token,
  };
};

export const logout = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem('token');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return user ? JSON.parse(user) : null;
};
