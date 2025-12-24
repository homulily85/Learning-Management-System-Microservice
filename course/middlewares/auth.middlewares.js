import jwt from 'jsonwebtoken'
import User from '../models/usermodel.js'
import AppError from '../utils/error.util.js'
import asyncHandler from '../middlewares/asyncHAndler.middleware.js' // Nên dùng cái này để bắt lỗi async

/**
 * @isLoggedIn
 */
export const isLoggedIn = asyncHandler(async (req, res, next) => {
  const { token } = req.cookies

  if (!token) {
    return next(new AppError('Unauthenticated, please login again', 401))
  }

  // Giải mã token
  const userDetails = await jwt.verify(token, process.env.JWT_SECRET)
  
  // Gán thông tin user vào request để các middleware sau sử dụng
  req.user = userDetails

  next()
})

/**
 * @authorizedRoles
 */
export const authorizedRoles = (...roles) => asyncHandler(async (req, res, next) => {
  const currentUserRole = req.user.role // Model của bạn là 'role' chứ không phải 'roles'

  // Logic ĐÚNG: Nếu role của user KHÔNG nằm trong danh sách roles cho phép
  if (!roles.includes(currentUserRole)) {
    return next(
      new AppError('You do not have permission to access this route', 403),
    )
  }
  next()
})

/**
 * @authorizedSubscriber
 */
export const authorizedSubscriber = asyncHandler(async (req, res, next) => {
  // Lấy ID từ req.user (đã được gán ở bước isLoggedIn)
  const user = await User.findById(req.user.id)
  
  if (!user) {
    return next(new AppError('User not found', 404))
  }

  const subscriptionStatus = user.subscription.status
  const currentUserRole = user.role

  // Nếu KHÔNG PHẢI admin VÀ gói cước KHÔNG PHẢI active thì mới chặn
  if (currentUserRole !== 'ADMIN' && subscriptionStatus !== 'active') {
    return next(new AppError('Please subscribe to access this content', 403))
  }

  // CỰC KỲ QUAN TRỌNG: Phải có next() ở đây để đi tiếp vào Controller
  next()
})