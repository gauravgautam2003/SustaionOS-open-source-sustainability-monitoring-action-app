# SustainOS - Building Sustainability Management Platform

A comprehensive web application for monitoring, analyzing, and optimizing energy and water consumption across buildings and facilities. SustainOS provides real-time insights, predictive analytics, and actionable recommendations to help organizations achieve their sustainability goals.

## 🌱 Features

### Dashboard & Monitoring
- **Real-time Monitoring**: Live tracking of energy and water consumption metrics
- **Multi-Building Support**: Manage sustainability metrics across multiple facilities
- **Interactive Dashboards**: Visualize key performance indicators (KPIs) with interactive charts
- **Customizable Alerts**: Set thresholds and receive notifications for anomalies

### Analytics & Reporting
- **Energy Analytics**: Detailed energy consumption patterns and trends
- **Water Analytics**: Water usage tracking and optimization insights
- **Sustainability Reports**: Comprehensive sustainability metrics and progress tracking
- **Predictive Analytics**: Anomaly detection using advanced rules engine

### Sensor Management
- **Sensor Integration**: Connect and manage IoT sensors across properties
- **Real-time Data**: Continuous data collection from connected devices
- **Device Management**: Monitor device health and status

### User & Organization Management
- **Authentication**: Secure user authentication and authorization
- **Multi-tenancy**: Separate workspaces for different organizations
- **Role-based Access**: Granular permission controls
- **Profile Management**: User and organization settings

### Alerting System
- **Intelligent Alerts**: Automated detection of consumption anomalies
- **Alert Dashboard**: Centralized alert management interface
- **Customizable Rules**: Define custom alert rules based on organizational needs

## 📋 Tech Stack

### Frontend
- **React 19.2.0** - UI library
- **Vite 7.3.1** - Build tool and dev server
- **React Router 7.13.1** - Client-side routing
- **Tailwind CSS 4.2.1** - Utility-first CSS framework
- **Framer Motion 12.34.3** - Animation library
- **React Icons 5.5.0** - Icon library
- **ESLint** - Code quality and linting

## 📁 Project Structure

```
SustainOS/
├── client/                          # Frontend React application
│   ├── src/
│   │   ├── components/             # Reusable React components
│   │   │   ├── cards/              # Card components (Alerts, Devices, Metrics)
│   │   │   ├── charts/             # Data visualization components
│   │   │   ├── common/             # Shared UI components (Button, Modal, etc.)
│   │   │   └── layout/             # Layout components (Navbar, Footer)
│   │   ├── pages/                  # Page components
│   │   │   ├── auth/               # Authentication pages (Login, Register)
│   │   │   ├── buildings/          # Building management pages
│   │   │   ├── dashboard/          # Dashboard pages (Main, Energy, Water, Alerts)
│   │   │   ├── reports/            # Reporting pages
│   │   │   └── settings/           # Settings pages (Profile, Organization)
│   │   ├── context/                # React Context for state management
│   │   │   ├── AuthContext.jsx     # Authentication state
│   │   │   ├── TenantContext.jsx   # Organization/Tenant state
│   │   │   └── AlertContext.jsx    # Alert management state
│   │   ├── hooks/                  # Custom React hooks
│   │   │   ├── useAuth.js          # Authentication hook
│   │   │   ├── useSensors.js       # Sensor data hook
│   │   │   └── useRealtimeData.js  # Real-time data subscription hook
│   │   ├── services/               # API and business logic services
│   │   │   ├── api.js              # API client configuration
│   │   │   ├── authService.js      # Authentication service
│   │   │   ├── alertService.js     # Alert management service
│   │   │   └── sensorService.js    # Sensor data service
│   │   ├── utils/                  # Utility functions
│   │   │   ├── constants.js        # Application constants
│   │   │   ├── formatters.js       # Data formatting utilities
│   │   │   └── anomalyRules.js     # Anomaly detection rules
│   │   ├── assets/                 # Static assets
│   │   │   ├── icons/
│   │   │   ├── illustrations/
│   │   │   └── images/
│   │   ├── routes/                 # Route configuration
│   │   └── App.jsx, main.jsx       # Application entry points
│   ├── package.json                # Project dependencies
│   ├── vite.config.js              # Vite configuration
│   ├── eslint.config.js            # ESLint configuration
│   └── README.md                   # Client-specific documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16.x or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SustainOS
   ```

2. **Navigate to the client directory**
   ```bash
   cd client
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

### Development Server

Start the development server with hot module replacement:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

Create an optimized production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

### Linting

Lint the codebase to check for code quality issues:

```bash
npm run lint
```

## 🏗️ Architecture Overview

### Frontend Architecture
- **Component-Based**: Modular, reusable React components
- **Context API**: State management for authentication, tenants, and alerts
- **Custom Hooks**: Encapsulated logic for auth, sensors, and real-time data
- **Service Layer**: Centralized API communication and business logic
- **Responsive Design**: Mobile-first approach with Tailwind CSS

### Data Flow
1. Components fetch data through services
2. Services communicate with backend API
3. Context API manages global state (auth, tenant, alerts)
4. Real-time data is handled through custom hooks
5. Components render based on state changes

## 📊 Key Components

### Dashboard
- Energy and water consumption overview
- Real-time metric visualization
- Interactive charts for trend analysis
- Quick access to key information

### Building Management
- List and manage multiple buildings
- Detailed building metrics and status
- Building-specific analytics

### Alerts System
- Real-time anomaly detection
- Centralized alert management
- Customizable alert rules
- Alert history and reporting

### Analytics
- Energy consumption patterns
- Water usage analysis
- Sustainability performance metrics
- Historical trend analysis

## 🔐 Authentication & Security
- Secure user authentication
- JWT-based session management
- Role-based access control (RBAC)
- Multi-tenancy support

## 🔌 API Integration
The application communicates with a backend API for:
- User authentication and authorization
- Sensor data retrieval
- Alert management
- Building and organization data
- Analytics and reporting

API endpoints are configured in `services/api.js`

## 🎨 Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Responsive Design**: Mobile, tablet, and desktop support
- **Dark Mode Support**: Built-in theme switching capabilities
- **Custom Components**: Pre-built UI components with Tailwind classes

## 📈 Performance Optimization
- Code splitting with Vite
- Lazy loading of routes
- Optimized re-renders with React hooks
- Production build optimization

## 🤝 Contributing
1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## 📝 Development Guidelines

### Code Style
- Follow ESLint configuration
- Use consistent naming conventions
- Write meaningful comments for complex logic
- Keep components focused and reusable

### Component Development
- Create components in the appropriate folder
- Use functional components with hooks
- Keep components small and single-responsibility
- Use PropTypes or TypeScript for type safety

### State Management
- Use Context API for global state
- Use hooks for local component state
- Keep state as close to components as possible

## 📞 Support & Documentation
For more detailed information, see:
- [Client Documentation](./client/README.md) - Frontend-specific setup and development
- Backend API documentation (if available)
- Component storybook (if available)

## 📄 License
This project is proprietary and confidential.

## 🎯 Roadmap
- [ ] Advanced analytics with machine learning
- [ ] Mobile app version
- [ ] Integration with smart building systems
- [ ] Carbon footprint tracking
- [ ] Sustainability certification support
- [ ] API for third-party integrations

---

**SustainOS** - Building a more sustainable future through technology 🌍
