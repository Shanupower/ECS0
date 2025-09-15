# ECS Receipt Frontend Dashboard

A comprehensive React-based frontend dashboard for the ECS Receipt Portal, fully integrated with the backend API.

## Features

### 🔐 Authentication & Authorization

- **Login System**: Secure authentication with JWT tokens
- **Role-based Access**: Admin and Employee roles with different permissions
- **Session Management**: Persistent login sessions with automatic token refresh

### 📊 Dashboard & Analytics

- **Real-time Statistics**: Live data from API endpoints
- **Interactive Charts**: Category breakdown and daily timeline visualizations
- **Date Range Filtering**: Customizable date ranges for analytics
- **Employee Performance**: Admin view of individual employee statistics

### 🧾 Receipt Management

- **Multi-step Receipt Creation**: Guided workflow for creating receipts
- **Product Categories**: Support for MF, FD, Insurance, and Bonds
- **Investor Lookup**: Searchable investor database integration
- **Receipt Preview**: Real-time preview before saving

### 📈 Transaction History

- **Advanced Filtering**: Filter by date, category, issuer, and employee
- **Pagination**: Efficient handling of large datasets
- **CRUD Operations**: View, edit, delete, and restore receipts
- **Status Tracking**: Active and deleted receipt management

### 👥 User Management (Admin Only)

- **User CRUD**: Create, read, update, and delete users
- **Password Management**: Secure password change functionality
- **Role Assignment**: Assign admin or employee roles
- **Access Control**: Admin-only features and routes

## API Integration

The frontend is fully integrated with the following backend endpoints:

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (optional)

### User Management Endpoints

- `GET /api/users/me` - Get current user profile
- `GET /api/users` - List all users (admin)
- `POST /api/users` - Create new user (admin)
- `PATCH /api/users/:id` - Update user (admin)
- `PATCH /api/users/:id/password` - Change password
- `DELETE /api/users/:id` - Delete user (admin)

### Receipt Endpoints

- `GET /api/receipts` - List receipts with filtering and pagination
- `GET /api/receipts/:id` - Get specific receipt
- `POST /api/receipts` - Create new receipt
- `PATCH /api/receipts/:id` - Update receipt
- `DELETE /api/receipts/:id` - Soft delete receipt
- `POST /api/receipts/:id/restore` - Restore deleted receipt

### Statistics Endpoints

- `GET /api/stats/summary` - Get summary statistics
- `GET /api/stats/by-category` - Get category breakdown
- `GET /api/stats/by-day` - Get daily timeline data

### Utility Endpoints

- `GET /health` - Health check

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://127.0.0.1:8080
VITE_APP_NAME=ECS Receipt Portal
VITE_DEBUG=false
```

### Demo Credentials

- **Admin**: `ADMIN` / `admin123`
- **Employee**: `ECS497` / `pass123`

## Installation & Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Configure Environment**

   ```bash
   cp .env.example .env
   # Edit .env with your API base URL
   ```

3. **Start Development Server**

   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── api.js                 # API service layer
├── App.jsx               # Main app component with routing
├── main.jsx              # Application entry point
├── components/
│   ├── Layout.jsx        # Main layout with navigation
│   ├── Logo.jsx          # ECS logo component
│   ├── MultiStepReceipt.jsx # Receipt creation workflow
│   ├── PrintReceipt.jsx  # Receipt preview/print
│   └── SearchableSelect.jsx # Reusable select component
├── context/
│   └── AuthContext.jsx   # Authentication context
├── pages/
│   ├── DashboardPage.jsx  # Dashboard with statistics
│   ├── LoginPage.jsx     # Login form
│   ├── ReceiptsPage.jsx  # Receipt creation page
│   ├── TransactionsPage.jsx # Transaction history
│   └── UserManagementPage.jsx # User management (admin)
└── data/                 # Static data files
    ├── branches.json
    ├── empdata.json
    ├── insurance_issuers.json
    ├── investors.json
    ├── mf_schemes.json
    └── non_mf_issuers.json
```

## Key Features Implemented

### ✅ Complete API Integration

- All Postman collection endpoints integrated
- Proper error handling and loading states
- Token-based authentication
- Role-based access control

### ✅ Responsive Design

- Mobile-friendly interface
- Tailwind CSS for styling
- Modern UI components
- Accessible design patterns

### ✅ Data Management

- Real-time data fetching
- Efficient state management
- Optimistic updates
- Error boundary handling

### ✅ User Experience

- Intuitive navigation
- Loading indicators
- Success/error feedback
- Form validation

## Backend Requirements

The frontend expects the backend to implement the following features:

1. **JWT Authentication** with proper token validation
2. **Role-based Authorization** (admin/employee roles)
3. **Receipt CRUD Operations** with soft delete functionality
4. **Statistics Aggregation** with filtering capabilities
5. **User Management** for admin users
6. **Pagination Support** for large datasets
7. **Date Range Filtering** for analytics

## Missing Backend Endpoints

If any of the following endpoints are not implemented, they can be added to the backend:

1. **Receipt Update Endpoint**: `PATCH /api/receipts/:id`
2. **Receipt View Endpoint**: `GET /api/receipts/:id`
3. **User Registration**: `POST /api/auth/register` (optional)
4. **Enhanced Statistics**: Additional aggregation endpoints

## Testing

The application includes comprehensive error handling and can be tested with:

1. **Authentication Flow**: Login with different user roles
2. **Receipt Creation**: Complete multi-step workflow
3. **Transaction History**: Filtering and pagination
4. **Dashboard Analytics**: Date range filtering
5. **User Management**: Admin-only features

## Support

For any issues or questions regarding the frontend integration, please refer to the API documentation or contact the development team.
