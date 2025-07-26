# Attendance Tracker

A modern web application built with Next.js for tracking employee work hours with Google authentication and comprehensive admin features.

## Features

### 👤 User Functionality
- **Google Authentication**: Secure sign-in and sign-up using Google OAuth
- **Work Session Management**: 
  - Start work: Log current timestamp as start time
  - End work: Log current timestamp as end time
  - One session per day limit
- **Real-time Dashboard**: View current day's work status and history

### 🛠️ Work Logs
- **Automatic Duration Calculation**: Work duration is automatically calculated
- **Daily Tracking**: Each work session includes userId, date, startTime, endTime, and duration
- **Session Status**: Track active and completed work sessions

### 🧑‍💼 Admin Panel
- **Daily Logs**: View all users' attendance for any specific date
- **Monthly Reports**: Comprehensive reports per user including:
  - Total days worked
  - Total hours
  - Average hours per day
- **CSV Export**: Download monthly reports as CSV files
- **User Management**: View all employees and their statistics

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: MongoDB with Mongoose ODM
- **Date Handling**: date-fns
- **Styling**: Tailwind CSS

## Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud)
- Google OAuth credentials

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd attendance
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# MongoDB
MONGODB_URI=mongodb://localhost:27017/attendance
```

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
5. Set Application Type to "Web application"
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Client Secret to your `.env.local` file

### 5. MongoDB Setup

#### Local MongoDB:
```bash
# Install MongoDB locally or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### MongoDB Atlas (Cloud):
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string and add to `MONGODB_URI`

### 6. Generate NextAuth Secret
```bash
openssl rand -base64 32
```
Add the generated string to `NEXTAUTH_SECRET` in your `.env.local` file.

### 7. Run the Application
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

### For Employees
1. Visit the application and sign in with Google
2. Click "Start Work" to begin your work session
3. Click "End Work" when you finish for the day
4. View your work history and current session status

### For Admins
1. Sign in with Google (admin role will be assigned manually in database)
2. Access admin panel from the main dashboard
3. View daily logs for any date
4. Generate monthly reports with statistics
5. Download reports as CSV files

## Database Schema

### User Model
```javascript
{
  email: String (required, unique),
  name: String (required),
  image: String,
  role: String (enum: ['user', 'admin']),
  googleId: String (unique),
  timestamps: true
}
```

### WorkLog Model
```javascript
{
  userId: ObjectId (ref: 'User'),
  date: Date (required),
  startTime: Date (required),
  endTime: Date,
  duration: Number (minutes),
  status: String (enum: ['active', 'completed']),
  timestamps: true
}
```

## API Endpoints

### Authentication
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js authentication

### Work Management
- `POST /api/work/start` - Start work session
- `POST /api/work/end` - End work session
- `GET /api/work/logs` - Get user's work logs

### Admin (Admin only)
- `GET /api/admin/daily-logs` - Get daily logs for all users
- `GET /api/admin/monthly-reports` - Get monthly reports

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms
- Update `NEXTAUTH_URL` to your production URL
- Ensure MongoDB connection is accessible
- Set up Google OAuth redirect URIs for production domain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please open an issue in the repository.
