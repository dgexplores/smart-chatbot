import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const login = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password.'
    });
  }

  try {
    const user = await User.findOne({ email });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or inactive account.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    // Generate Token
    const secret = process.env.JWT_SECRET || 'asep_super_secret_jwt_key_2026';
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      secret,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error: any) {
    console.error(`[Auth Controller] Login error:`, error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not logged in.'
    });
  }

  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found or suspended.'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        lastLogin: user.lastLogin
      }
    });
  } catch (error: any) {
    console.error(`[Auth Controller] getMe error:`, error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};
