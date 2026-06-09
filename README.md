# 🏨 Hotel Management Website

A modern, responsive hotel booking and management platform built with JavaScript (82.5%) and HTML (17.5%). This full-stack application provides both client-side and server-side functionality for managing hotel reservations, payments, and guest information.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![JavaScript](https://img.shields.io/badge/JavaScript-82.5%25-yellow)
![HTML](https://img.shields.io/badge/HTML-17.5%25-orange)

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Project Status](#project-status)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [Author](#author)
- [License](#license)

## ✨ Features

### User Features
- 🏠 **Homepage** - Welcome page with hotel overview and highlights
- 🛏️ **Room Browsing** - Browse available rooms and services
- 📅 **Booking System** - User-friendly booking interface for reservations
- 💳 **Payment Processing** - Secure payment handling with dedicated payment page
- 📝 **User Authentication** - Register and login functionality with JWT
- 💬 **Contact Form** - Get in touch with hotel management
- 📱 **Responsive Design** - Fully mobile-friendly interface
- 🎨 **Modern UI** - Clean and professional user interface

### Admin Features
- 📊 **Management Dashboard** - View and manage all bookings
- 👥 **Guest Management** - Handle guest information and requests
- 💰 **Payment Management** - Track payment history
- 🔐 **Authentication** - Secure access to admin features with session management

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Semantic markup and page structure
- **CSS3** - Responsive styling and modern layouts
- **JavaScript (Vanilla)** - Interactive features and client-side logic

### Backend
- **Node.js** - Server runtime environment
- **Express.js** - Web framework for API development
- **dotenv** - Environment variable management
- **CORS** - Cross-Origin Resource Sharing for API security

### Additional Tools
- **npm** - Package management
- **JWT** - JSON Web Tokens for authentication

## 📁 Project Structure

```
Hotel-management-website-/
├── client/                          # Frontend code
│   ├── index.html                   # Homepage
│   ├── booking.html                 # Booking page
│   ├── login.html                   # Login page
│   ├── register.html                # Registration page
│   ├── rooms.html                   # Rooms listing page
│   ├── payment.html                 # Payment processing page
│   ├── dashboard.html               # Admin dashboard
│   ├── css/                         # Stylesheets directory
│   └── js/                          # JavaScript files directory
├── server/                          # Backend code
│   ├── server.js                    # Main server entry point
│   ├── .env                         # Environment variables (DO NOT COMMIT)
│   ├── config/                      # Configuration files
│   ├── controllers/                 # Business logic controllers
│   ├── routes/                      # API route definitions
│   │   ├── authRoutes.js           # Authentication endpoints
│   │   ├── roomRoutes.js           # Room management endpoints
│   │   ├── bookingRoutes.js        # Booking endpoints
│   │   └── paymentRoutes.js        # Payment endpoints
│   └── middleware/                  # Express middleware
├── package.json                     # Project dependencies
├── package-lock.json                # Dependency lock file
├── .gitignore                       # Git ignore file
├── LICENSE                          # MIT License
└── README.md                        # This file
```

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14.0.0 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A code editor (VSCode, Sublime Text, etc.)
- A web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mwasgibson/Hotel-management-website-.git
   cd Hotel-management-website-
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `server/` directory with the following configuration:
   ```bash
   NODE_ENV=development
   PORT=3000
   JWT_SECRET=your_jwt_secret_key_here
   SESSION_SECRET=your_session_secret_key_here
   ```

### Running the Application

#### Option 1: Run Frontend Only
```bash
# Open the client-side files directly in your browser
open client/index.html
# or on Windows
start client/index.html
```

#### Option 2: Run Full Stack (Frontend + Backend)
```bash
# Start the Express server
npm start
# or
node server/server.js
```

The server will start on `http://localhost:3000`

Access the application:
- Frontend: `http://localhost:3000` (served through Express)
- API Base URL: `http://localhost:3000/api`

## 📖 Usage

### For Guests
1. Navigate to the homepage (`index.html`)
2. Browse available rooms in the **Rooms** section
3. Use the **Booking** page to make a reservation
4. Proceed to **Payment** page to complete your booking
5. Create an account via **Register** page
6. Login with your credentials via **Login** page
7. Access your **Dashboard** to view bookings

### For Administrators
1. Login to access the management **Dashboard**
2. View and manage all active bookings
3. Handle guest information and payment records
4. Monitor room availability and services
5. Track payment history

## 🔌 API Endpoints

The backend provides the following RESTful API endpoints:

### Authentication Endpoints
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - User login
```

### Room Endpoints
```
GET    /api/rooms              - Get all rooms
GET    /api/rooms/:id          - Get specific room details
```

### Booking Endpoints
```
POST   /api/bookings           - Create new booking
GET    /api/bookings           - Get all bookings
GET    /api/bookings/:id       - Get specific booking details
PUT    /api/bookings/:id       - Update booking
DELETE /api/bookings/:id       - Cancel booking
```

### Payment Endpoints
```
POST   /api/payments           - Process payment
GET    /api/payments/:id       - Get payment details
```

## 🔐 Environment Variables

The application uses the following environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | Secret key for JWT tokens | `your_secret_key_here` |
| `SESSION_SECRET` | Secret key for session management | `your_session_secret_here` |

**Important:** Never commit the `.env` file to version control. Use `.env.example` for reference.

## 📊 Project Status

- ✅ Frontend structure and UI/UX implemented
- ✅ Backend server setup with Express.js
- ✅ Basic routing established
- ✅ Multiple HTML pages (Homepage, Booking, Login, Register, Rooms, Payment, Dashboard)
- ✅ API routes for authentication, rooms, bookings, and payments
- ✅ CORS configuration
- ⏳ Database integration (in progress)
- ⏳ Full API implementation and validation (in progress)
- ⏳ Payment gateway integration (planned)
- ⏳ Admin dashboard functionality (planned)
- ⏳ Email notifications (planned)

## 🎯 Future Enhancements

### Short-term
- [ ] Database connectivity (MongoDB/MySQL)
- [ ] User authentication system with password hashing (bcrypt)
- [ ] Email notifications for bookings
- [ ] Search and filter functionality for rooms
- [ ] Input validation and error handling

### Medium-term
- [ ] Payment gateway integration (Stripe/PayPal)
- [ ] Admin dashboard with analytics
- [ ] Real-time availability updates using WebSockets
- [ ] Review and rating system
- [ ] Email confirmation system

### Long-term
- [ ] Mobile app (iOS/Android)
- [ ] Multi-language support (i18n)
- [ ] Advanced booking management with calendar
- [ ] Integration with property management systems
- [ ] Machine learning for pricing optimization
- [ ] Analytics dashboard
- [ ] Loyalty program

## 🤝 Contributing

Contributions are welcome! To contribute to this project:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure your code follows the project's coding standards and includes appropriate comments.

## 👤 Author

**Gibson Mwangi**
- Software Engineering Student, Kisii University
- GitHub: [@mwasgibson](https://github.com/mwasgibson)
- Email: Contact through GitHub profile

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💡 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check existing documentation
- Contact the project maintainer via GitHub

## 🙏 Acknowledgments

- Thanks to the Node.js and Express.js communities
- Inspired by modern hotel booking platforms like Booking.com and Airbnb
- Built with passion for learning and web development
- Special thanks to all contributors and users

---

**Happy Coding!** 🎉

Last Updated: June 9, 2026
