# 🏨 Hotel Management Website

A modern, responsive hotel booking and management platform built with JavaScript, HTML, and CSS. This full-stack application provides both client-side and server-side functionality for managing hotel operations and guest bookings.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![JavaScript](https://img.shields.io/badge/JavaScript-95.2%25-yellow)
![HTML](https://img.shields.io/badge/HTML-4.8%25-orange)

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
- 📝 **User Authentication** - Register and login functionality
- 💬 **Contact Form** - Get in touch with hotel management
- 📱 **Responsive Design** - Fully mobile-friendly interface
- 🎨 **Modern UI** - Clean and professional user interface

### Admin Features
- 📊 **Management Dashboard** - View and manage bookings
- 👥 **Guest Management** - Handle guest information
- 🔐 **Authentication** - Secure access to admin features

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Semantic markup and page structure
- **CSS3** - Responsive styling and modern layouts
- **JavaScript** - Interactive features and client-side logic

### Backend
- **Node.js** - Server runtime environment
- **Express.js** - Web framework for API development

### Additional Tools
- **npm** - Package management

## 📁 Project Structure

```
Hotel-management-website-/
├── client/                          # Frontend code
│   ├── index.html                   # Homepage
│   ├── booking.html                 # Booking page
│   ├── login.html                   # Login page
│   ├── register.html                # Registration page
│   ├── rooms.html                   # Rooms listing
│   ├── css/                         # Stylesheets
│   │   └── [CSS files]
│   └── js/                          # JavaScript files
│       └── [JS scripts]
├── server/                          # Backend code
│   ├── server.js                    # Main server entry point
│   ├── .env                         # Environment variables
│   ├── config/                      # Configuration files
│   ├── controllers/                 # Business logic controllers
│   ├── routes/                      # API route definitions
│   └── middleware/                  # Express middleware
├── package.json                     # Project dependencies
├── package-lock.json                # Dependency lock file
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
   
   Create a `.env` file in the `server/` directory and configure the following:
   ```bash
   PORT=3000
   NODE_ENV=development
   DATABASE_URL=your_database_url
   ```

### Running the Application

#### Option 1: Run Frontend Only
```bash
# Open the client-side files directly in your browser
open client/index.html
```

#### Option 2: Run Full Stack (Frontend + Backend)
```bash
# Start the Express server
npm start
# or
node server/server.js
```

The server will start on `http://localhost:3000` (or your configured PORT)

## 📖 Usage

### For Guests
1. Navigate to the homepage (`index.html`)
2. Browse available rooms in the **Rooms** section
3. Use the **Booking** page to make a reservation
4. Create an account via **Register** page
5. Login with your credentials
6. Submit inquiries via the **Contact Form**

### For Administrators
1. Login to access the management dashboard
2. View and manage all active bookings
3. Handle guest information and requests
4. Monitor room availability and services

## 🔌 API Endpoints

The backend provides the following RESTful API endpoints:

```
GET    /api/rooms              - Get all rooms
GET    /api/rooms/:id          - Get specific room
POST   /api/bookings           - Create new booking
GET    /api/bookings           - Get all bookings
GET    /api/bookings/:id       - Get specific booking
PUT    /api/bookings/:id       - Update booking
DELETE /api/bookings/:id       - Cancel booking
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - User login
POST   /api/contact            - Submit contact form
```

*Note: Complete API documentation will be added in future updates*

## 📊 Project Status

- ✅ Frontend structure and UI/UX implemented
- ✅ Backend server setup
- ✅ Basic routing established
- ⏳ Database integration (in progress)
- ⏳ Full API implementation (in progress)
- ⏳ Payment gateway integration (planned)
- ⏳ Admin dashboard (planned)

## 🎯 Future Enhancements

### Short-term
- [x] Complete API endpoints for bookings
- [ ] User authentication system
- [ ] Email notifications for bookings
- [ ] Search and filter functionality

### Medium-term
- [ ] Payment gateway integration (Stripe/PayPal)
- [ ] Database connectivity (MongoDB/MySQL)
- [ ] Admin dashboard with analytics
- [ ] Real-time availability updates

### Long-term
- [ ] Mobile app (iOS/Android)
- [ ] Multi-language support
- [ ] Advanced booking management
- [ ] Integration with property management systems
- [ ] Machine learning for pricing optimization

## 🤝 Contributing

Contributions are welcome! To contribute to this project:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 👤 Author

**Gibson Mwangi**
- Software Engineering Student, Kisii University
- GitHub: [@mwasgibson](https://github.com/mwasgibson)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💡 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check existing documentation
- Contact the project maintainer

## 🙏 Acknowledgments

- Thanks to the Node.js and Express.js communities
- Inspired by modern hotel booking platforms
- Built with passion for learning and development

---

**Happy Coding!** 🎉
