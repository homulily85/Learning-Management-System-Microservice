import cloudinary from 'cloudinary';
import crypto from 'crypto';
import fs from 'fs/promises';

import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import User from '../models/usermodel.js';
import AppError from '../utils/error.util.js';
import sendEmail from '../utils/sendEmail.js';


const cookieOptions = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
  httpOnly: true,
  secure: false,  
  sameSite: 'Lax', 
};

/**
 * @REGISTER - Đăng ký người dùng mới
 */
export const register = asyncHandler(async (req, res, next) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return next(new AppError('All fields are required', 400));
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new AppError('Email already exists', 409));
  }

  const user = await User.create({
    fullName,
    email,
    password,
    avatar: {
      public_id: email,
      secure_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    },
  });

  if (!user) {
    return next(new AppError('User registration failed, please try again', 400));
  }

  if (req.file) {
    try {
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: 'lms',
        width: 250,
        height: 250,
        gravity: 'faces',
        crop: 'fill',
      });

      if (result) {
        user.avatar.public_id = result.public_id;
        user.avatar.secure_url = result.secure_url;

        await fs.unlink(req.file.path);
      }
    } catch (e) {
      return next(new AppError(e.message || 'File not uploaded, please try again', 500));
    }
  }

  await user.save();

  const token = await user.generateJWTToken();
  user.password = undefined; 

  res.cookie('token', token, cookieOptions);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user,
  });
});

/**
 * @LOGIN - Đăng nhập
 */
export const login = asyncHandler(async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log("1. Đã nhận yêu cầu login cho:", email);

    if (!email || !password) {
      return next(new AppError('Email and password are required', 400));
    }

    console.log("2. Đang tìm user trong DB...");
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
        console.log("3a. Không tìm thấy user!");
        return next(new AppError('Email or password does not match', 401));
    }
    console.log("3b. Đã tìm thấy user, đang so sánh mật khẩu...");

    const isPasswordValid = await user.comparePassword(password);
    console.log("4. Kết quả so sánh mật khẩu:", isPasswordValid);

    if (!isPasswordValid) {
      return next(new AppError('Email or password does not match', 401));
    }

    console.log("5. Đang tạo Token JWT...");
    const token = await user.generateJWTToken();
    console.log("6. Đã tạo xong Token!");

    user.password = undefined;
    res.cookie('token', token, cookieOptions);

    console.log("7. Đang gửi response về cho Frontend...");
    res.status(200).json({
      success: true,
      message: 'User logged in successfully',
      user,
    });

  } catch (e) {
    console.log("LỖI TẠI LOGIN:", e.message);
    return next(new AppError(e.message, 500));
  }
});

/**
 * @LOGOUT - Đăng xuất
 */
export const logout = asyncHandler(async (req, res) => {
  res.cookie('token', null, {
    secure: false,
    maxAge: 0,
    httpOnly: true,
    sameSite: 'Lax'
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully',
  });
});

/**
 * @GET_PROFILE - Lấy thông tin cá nhân
 */
export const getProfile = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'User details fetched successfully',
      user,
    });
  } catch (e) {
    return next(new AppError('Failed to fetch profile', 500));
  }
});

/**
 * @FORGOT_PASSWORD - Gửi mail reset mật khẩu
 */
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Email is required', 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('Email not registered', 404));
  }

  const resetToken = await user.generatePasswordResetToken();
  await user.save();

  const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const subject = 'Reset Password';
  const message = `You can reset your password by clicking <a href="${resetPasswordUrl}" target="_blank">Reset your password</a>. Nếu link không chạy, copy link này: ${resetPasswordUrl}`;

  try {
    await sendEmail(email, subject, message);
    res.status(200).json({
      success: true,
      message: `Reset password token has been sent to ${email}`,
    });
  } catch (e) {
    user.forgotPasswordExpiry = undefined;
    user.forgotPasswordToken = undefined;
    await user.save();
    return next(new AppError(e.message, 500));
  }
});

/**
 * @RESET_PASSWORD - Reset mật khẩu bằng token từ email
 */
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { resetToken } = req.params;
  const { password } = req.body;

  const forgotPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const user = await User.findOne({
    forgotPasswordToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or expired, please try again', 400));
  }

  user.password = password; // Sẽ được tự động hash khi gọi user.save()
  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * @CHANGE_PASSWORD - Đổi mật khẩu khi đang đăng nhập
 */
export const changePassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const { id } = req.user;

  if (!oldPassword || !newPassword) {
    return next(new AppError('All fields are mandatory', 400));
  }

  const user = await User.findById(id).select('+password');
  if (!user) {
    return next(new AppError('User does not exist', 404));
  }

  const isPasswordValid = await user.comparePassword(oldPassword);
  if (!isPasswordValid) {
    return next(new AppError('Invalid old password', 400));
  }

  user.password = newPassword;
  await user.save();
  user.password = undefined;

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * @UPDATE_USER - Cập nhật thông tin và Avatar
 */
export const updateUser = asyncHandler(async (req, res, next) => {
  const { fullName } = req.body;
  const { id } = req.user;

  const user = await User.findById(id);
  if (!user) {
    return next(new AppError('User does not exist', 404));
  }

  if (fullName) {
    user.fullName = fullName;
  }

  if (req.file) {
    if (user.avatar.public_id && !user.avatar.public_id.includes('avatar_drzgxv')) {
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);
    }

    try {
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: 'lms',
        width: 250,
        height: 250,
        gravity: 'faces',
        crop: 'fill',
      });

      if (result) {
        user.avatar.public_id = result.public_id;
        user.avatar.secure_url = result.secure_url;
        await fs.unlink(req.file.path);
      }
    } catch (e) {
      return next(new AppError(e.message || 'File not uploaded, please try again', 500));
    }
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'User details updated successfully',
  });
});