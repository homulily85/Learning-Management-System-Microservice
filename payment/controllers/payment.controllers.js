import crypto from 'crypto'
import asyncHandler from '../middlewares/asyncHAndler.middleware.js'
import Payment from '../models/payment.model.js'
import User from '../models/usermodel.js'
import AppError from '../utils/error.util.js'
// import { razorpay } from '../server.js' // Có thể comment dòng này nếu không muốn lỗi import

/**
 * @ACTIVATE_SUBSCRIPTION
 * Giả lập tạo subscription mà không gọi Razorpay
 */
export const buySubscription = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.user
    const user = await User.findById(id)
    if (!user) {
      return next(new AppError('Unauthorize , please login'))
    }
    if (user.role === 'ADMIN') {
      return next(new AppError(' Admin cannot purchase a subscription', 400))
    }

    // Nếu user đã có subscription rồi
    if (user.subscription.id && user.subscription.status === 'created') {
      res.status(200).json({
        success: true,
        message: 'subscribed successfully',
        subscription_id: user.subscription.id,
      })
    } else {
      // GIẢ LẬP RAZORPAY RESPONSE
      const mockSubscription = {
        id: 'sub_mock_' + Math.random().toString(36).substr(2, 9),
        status: 'created'
      }

      user.subscription.id = mockSubscription.id
      user.subscription.status = mockSubscription.status

      await user.save()
      
      res.status(200).json({
        success: true,
        message: 'Subscribed Sucessfully (Mocked)',
        subscription_id: mockSubscription.id,
      })
    }
  } catch (error) {
    return next(new AppError(error.message, 500))
  }
})

/**
 * @VERIFY_SUBSCRIPTION
 * Giả lập xác thực thanh toán thành công
 */
export const verifySubscription = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.user
    const {
      razorpay_payment_id,
      razorpay_signature,
      razorpay_subscription_id,
    } = req.body

    const user = await User.findById(id)
    if (!user) {
      return next(new AppError('Unauthorize , please login'))
    }

    // BỎ QUA KIỂM TRA CHỮ KÝ (SIGNATURE)
    // Trong thực tế cần crypto, nhưng ở đây ta cho qua luôn để test
    
    await Payment.create({
      razorpay_payment_id: razorpay_payment_id || 'pay_mock_' + Date.now(),
      razorpay_signature: razorpay_signature || 'sig_mock_' + Date.now(),
      razorpay_subscription_id: razorpay_subscription_id || user.subscription.id,
    })

    user.subscription.status = 'active'
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Payment verified Sucessfully (Mocked)',
    })
  } catch (error) {
    return next(new AppError(error.message, 500))
  }
})

/**
 * @CANCEL_SUBSCRIPTION
 * Giả lập hủy subscription
 */
export const cancelSubscription = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.user
    const user = await User.findById(id)

    if (!user) {
      return next(new AppError('Unauthorize , please login'))
    }
    if (user.role === 'ADMIN') {
      return next(new AppError(' Admin cannot purchase a subscription', 400))
    }

    // Bỏ qua bước gọi razorpay.subscriptions.cancel(subscriptionId)
    
    user.subscription.status = 'Inactive'
    await user.save()

    res.status(200).json({
      success: true,
      message: 'UnSubscribed Sucessfully (Mocked)',
    })
  } catch (error) {
    return next(new AppError(error.message, 500))
  }
})

/**
 * @GET_ALL_PAYMENTS
 * Giả lập lấy danh sách thanh toán để vẽ biểu đồ
 */
export const allPayments = asyncHandler(async (req, res, next) => {
  try {
    // Thay vì gọi razorpay.subscriptions.all, ta trả về dữ liệu mẫu
    const mockPayments = {
      items: [
        { start_at: Date.now() / 1000 },
        { start_at: (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000 } // Tháng trước
      ]
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const finalMonths = { January: 0, February: 0, March: 0, April: 0, May: 0, June: 0, July: 0, August: 0, September: 0, October: 0, November: 0, December: 0 }

    const monthlyWisePayments = mockPayments.items.map((payment) => {
      const monthsInNumbers = new Date(payment.start_at * 1000)
      return monthNames[monthsInNumbers.getMonth()]
    })

    monthlyWisePayments.map((month) => {
      if (finalMonths.hasOwnProperty(month)) {
        finalMonths[month] += 1
      }
    })

    const monthlySalesRecord = Object.values(finalMonths)

    res.status(200).json({
      success: true,
      message: 'All payments (Mocked)',
      allPayments: mockPayments,
      finalMonths,
      monthlySalesRecord,
    })
  } catch (error) {
    return next(new AppError(error.message, 500))
  }
})