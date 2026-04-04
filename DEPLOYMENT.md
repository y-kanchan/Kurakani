# 🚀 Deployment Guide

This guide covers deploying Kurakani to both Render and Vercel.

## 📋 Prerequisites

1. **MongoDB Atlas Account**: For production database
2. **Render Account**: For backend deployment
3. **Vercel Account**: For frontend deployment
4. **GitHub Repository**: Push your code to GitHub

## 🗄️ MongoDB Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (free tier is sufficient)
3. Create a database user
4. Get your connection string
5. Add your IP address to the whitelist (0.0.0.0/0 for cloud deployment)

## 🔧 Environment Variables

### Backend Environment Variables
```
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kurakani
JWT_SECRET=your_cryptographically_secure_secret_key
NODE_ENV=production
CLIENT_URL=https://your-frontend-domain.vercel.app
```

## 🐳 Render Deployment (Backend)

### Option 1: Using render.yaml (Recommended)
1. Push your code to GitHub
2. Go to Render Dashboard
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml`
6. Set environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A secure random string
   - `CLIENT_URL`: Your Vercel frontend URL (after deployment)

### Option 2: Manual Setup
1. Create **Backend Service**:
   - Name: `kurakani-backend`
   - Environment: `Node`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables: As listed above

## 🌐 Vercel Deployment (Frontend)

### Option 1: Using vercel.json (Recommended)
1. Push your code to GitHub
2. Go to Vercel Dashboard
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will detect `vercel.json`
6. Set environment variables if needed

### Option 2: Manual Setup
1. Connect your GitHub repository
2. Set **Framework Preset** to `Vite`
3. Set **Root Directory** to `frontend`
4. Set **Build Command** to `npm run build`
5. Set **Output Directory** to `dist`
6. Add environment variables

## 🔗 Connecting Frontend to Backend

After deploying both services:

1. **Update Render Backend**:
   - Go to your Render backend service
   - Update `CLIENT_URL` environment variable to your Vercel URL
   - Example: `CLIENT_URL=https://your-app.vercel.app`

2. **Update Vercel Frontend**:
   - The `vercel.json` already routes API calls to Render
   - Make sure your Render backend URL is correct in the routes

## 🛠️ Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Ensure `CLIENT_URL` in backend matches your frontend URL
   - Check that environment variables are set correctly

2. **Database Connection**:
   - Verify MongoDB Atlas connection string
   - Check IP whitelist in MongoDB Atlas
   - Ensure database user has correct permissions

3. **Build Failures**:
   - Check that all dependencies are installed
   - Verify build commands are correct
   - Check build logs for specific errors

4. **Socket.io Issues**:
   - Ensure backend is running and accessible
   - Check CORS configuration for Socket.io
   - Verify WebSocket connections are allowed

### Debug Steps

1. **Check Backend Health**:
   ```
   GET https://your-backend.onrender.com/api/health
   ```

2. **Check Frontend Build**:
   - Look at Vercel build logs
   - Ensure `dist` folder is created

3. **Check API Routes**:
   - Test API endpoints directly
   - Check network tab in browser for failed requests

## 📝 Post-Deployment Checklist

- [ ] Backend is running and healthy
- [ ] Frontend builds successfully
- [ ] API routes are accessible
- [ ] Database connection works
- [ ] Socket.io connections work
- [ ] File uploads work
- [ ] WebRTC calls work (requires HTTPS)

## 🔒 Security Notes

1. **Change JWT Secret**: Use a cryptographically secure random string
2. **Use HTTPS**: Both services should use HTTPS in production
3. **MongoDB Security**: Use strong passwords and IP whitelisting
4. **Environment Variables**: Never commit secrets to Git

## 🌟 Production Optimizations

1. **Add CDN**: For static assets and file uploads
2. **Use Redis**: For session management and caching
3. **Add Monitoring**: Error tracking and performance monitoring
4. **Add Rate Limiting**: To prevent abuse
5. **Use S3**: For file storage instead of local filesystem

## 📞 Support

If you encounter issues:
1. Check the logs in both Render and Vercel dashboards
2. Verify all environment variables are set
3. Ensure your MongoDB Atlas cluster is running
4. Test API endpoints individually
