
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { User } from '../../models/User.js';
import { Member } from '../../models/Member.js';
import { env } from '../../config/env.js';
import {
  AuthRequest,
  requireAuth,
} from '../../middleware/auth.js';

const router = Router();

/* =========================================================
   VALIDATION
========================================================= */

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email(),

  password: z
    .string()
    .min(1),
});

const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(
        2,
        'Name must be at least 2 characters'
      ),

    email: z
      .string()
      .trim()
      .email(
        'Please enter a valid email address'
      ),

    department: z
      .string()
      .trim()
      .min(
        1,
        'Department is required'
      ),

    password: z
      .string()
      .min(
        6,
        'Password must be at least 6 characters'
      ),

    confirmPassword: z
      .string()
      .min(1),
  })
  .refine(
    (data) =>
      data.password ===
      data.confirmPassword,
    {
      message:
        'Passwords do not match',

      path: [
        'confirmPassword',
      ],
    }
  );

/* =========================================================
   EMPLOYEE ID GENERATOR
========================================================= */

function generateEmployeeId(): string {
  const timestamp =
    Date.now()
      .toString()
      .slice(-6);

  const random =
    Math.floor(
      100 +
        Math.random() *
          900
    );

  return `EMP-${timestamp}-${random}`;
}

/* =========================================================
   POST /api/auth/signup
=========================================================

   Public employee registration.

   IMPORTANT:
   - Signup ALWAYS creates an EMPLOYEE.
   - Client cannot choose ADMIN.
   - Client cannot choose adminType.
   - ADMIN accounts are assigned separately.
   - Department is required.
   - A corresponding Member record is created.
   - Employee is NOT automatically logged in.
========================================================= */

router.post(
  '/signup',
  async (req, res) => {
    let createdUserId:
      string | null = null;

    let createdMemberId:
      string | null = null;

    try {
      /* ---------------------------------------------------
         Validate signup data
      --------------------------------------------------- */

      const parsed =
        signupSchema.safeParse(
          req.body
        );

      if (!parsed.success) {
        return res.status(400).json({
          message:
            parsed.error.issues[0]
              ?.message ||
            'Invalid signup data',
        });
      }

      const {
        name,
        email,
        department,
        password,
      } = parsed.data;

      const normalizedName =
        name.trim();

      const normalizedEmail =
        email
          .toLowerCase()
          .trim();

      const normalizedDepartment =
        department.trim();

      /* ---------------------------------------------------
         Check existing email
      --------------------------------------------------- */

      const existingUser =
        await User.findOne({
          email:
            normalizedEmail,
        });

      if (existingUser) {
        return res.status(409).json({
          message:
            'An account with this email already exists',
        });
      }

      /* ---------------------------------------------------
         Hash password
      --------------------------------------------------- */

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      /* ---------------------------------------------------
         Generate unique employee ID
      --------------------------------------------------- */

      let employeeId =
        generateEmployeeId();

      let employeeIdExists =
        await User.exists({
          employeeId,
        });

      while (
        employeeIdExists
      ) {
        employeeId =
          generateEmployeeId();

        employeeIdExists =
          await User.exists({
            employeeId,
          });
      }

      /* ---------------------------------------------------
         Create employee User
         
         IMPORTANT:
         department MUST be stored here because
         User.ts requires department.
      --------------------------------------------------- */

      const user =
        await User.create({
          employeeId,

          name:
            normalizedName,

          email:
            normalizedEmail,

          department:
            normalizedDepartment,

          passwordHash,

          /*
           * Public signup can ONLY
           * create employees.
           */
          role:
            'EMPLOYEE',

          /*
           * Employees never receive
           * an admin type.
           */
          adminType:
            null,

          isActive:
            true,
        });

      createdUserId =
        user._id.toString();

      /* ---------------------------------------------------
         Create corresponding Member
      --------------------------------------------------- */

      const member =
        await Member.create({
          memberCode:
            employeeId,

          name:
            normalizedName,

          email:
            normalizedEmail,

          department:
            normalizedDepartment,

          employeeId,

          isActive:
            true,
        });

      createdMemberId =
        member._id.toString();

      /* ---------------------------------------------------
         Signup does NOT generate JWT
      --------------------------------------------------- */

      return res.status(201).json({
        message:
          'Employee account created successfully. Please sign in to continue.',

        user: {
          id:
            user._id.toString(),

          employeeId:
            user.employeeId,

          name:
            user.name,

          email:
            user.email,

          department:
            user.department,

          role:
            user.role,

          adminType:
            user.adminType,
        },
      });

    } catch (error: any) {
      console.error(
        'Employee signup error:',
        error
      );

      /* ---------------------------------------------------
         Rollback Member if it was created
      --------------------------------------------------- */

      if (createdMemberId) {
        try {
          await Member.findByIdAndDelete(
            createdMemberId
          );

          console.log(
            `Rolled back employee member: ${createdMemberId}`
          );

        } catch (
          cleanupError
        ) {
          console.error(
            'Could not rollback employee member:',
            cleanupError
          );
        }
      }

      /* ---------------------------------------------------
         Rollback User if Member creation failed
      --------------------------------------------------- */

      if (createdUserId) {
        try {
          await User.findByIdAndDelete(
            createdUserId
          );

          console.log(
            `Rolled back employee user: ${createdUserId}`
          );

        } catch (
          cleanupError
        ) {
          console.error(
            'Could not rollback employee user:',
            cleanupError
          );
        }
      }

      /* ---------------------------------------------------
         MongoDB duplicate key
      --------------------------------------------------- */

      if (
        error?.code ===
        11000
      ) {
        const duplicateField =
          Object.keys(
            error.keyPattern ||
              {}
          )[0];

        if (
          duplicateField ===
          'email'
        ) {
          return res.status(409).json({
            message:
              'An account with this email already exists',
          });
        }

        if (
          duplicateField ===
            'employeeId' ||
          duplicateField ===
            'memberCode'
        ) {
          return res.status(409).json({
            message:
              'Could not generate a unique employee ID. Please try again.',
          });
        }

        return res.status(409).json({
          message:
            'An account with these details already exists',
        });
      }

      /* ---------------------------------------------------
         Zod validation error
      --------------------------------------------------- */

      if (
        error?.name ===
        'ValidationError'
      ) {
        const validationMessages =
          Object.values(
            error.errors || {}
          )
            .map(
              (item: any) =>
                item?.message
            )
            .filter(Boolean);

        return res.status(400).json({
          message:
            validationMessages[0] ||
            'Invalid employee account data',
        });
      }

      return res.status(500).json({
        message:
          'Could not create employee account',
      });
    }
  }
);

/* =========================================================
   POST /api/auth/login
========================================================= */

router.post(
  '/login',
  async (req, res) => {
    try {
      /* ---------------------------------------------------
         Validate login data
      --------------------------------------------------- */

      const parsed =
        loginSchema.safeParse(
          req.body
        );

      if (!parsed.success) {
        return res.status(400).json({
          message:
            'Invalid login data',
        });
      }

      const email =
        parsed.data.email
          .toLowerCase()
          .trim();

      /* ---------------------------------------------------
         Find user

         passwordHash is explicitly selected
         because User.ts uses select: false.
      --------------------------------------------------- */

      const user =
        await User.findOne({
          email,
        }).select(
          '+passwordHash'
        );

      /* ---------------------------------------------------
         Validate account
      --------------------------------------------------- */

      if (
        !user ||
        !user.isActive
      ) {
        return res.status(401).json({
          message:
            'Invalid credentials',
        });
      }

      /* ---------------------------------------------------
         Compare password
      --------------------------------------------------- */

      const passwordValid =
        await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );

      if (!passwordValid) {
        return res.status(401).json({
          message:
            'Invalid credentials',
        });
      }

      /* ---------------------------------------------------
         Validate admin configuration

         ADMIN accounts must have:
         APPROVER
         OR
         ISSUER

         Employees must have:
         adminType = null
      --------------------------------------------------- */

      if (
        user.role ===
          'ADMIN' &&
        ![
          'APPROVER',
          'ISSUER',
        ].includes(
          user.adminType || ''
        )
      ) {
        return res.status(403).json({
          message:
            'Administrator account is not assigned an admin type.',
        });
      }

      /* ---------------------------------------------------
         Generate JWT
      --------------------------------------------------- */

      const token =
        jwt.sign(
          {
            id:
              user._id.toString(),

            name:
              user.name,

            email:
              user.email,

            department:
              user.department,

            role:
              user.role,

            employeeId:
              user.employeeId,

            adminType:
              user.adminType,
          },

          env.jwtSecret,

          {
            expiresIn:
              '8h',
          }
        );

      /* ---------------------------------------------------
         Return safe user information
      --------------------------------------------------- */

      return res.status(200).json({
        token,

        user: {
          id:
            user._id.toString(),

          name:
            user.name,

          employeeId:
            user.employeeId,

          email:
            user.email,

          department:
            user.department,

          role:
            user.role,

          adminType:
            user.adminType,
        },
      });

    } catch (error) {
      console.error(
        'Login error:',
        error
      );

      return res.status(500).json({
        message:
          'Could not log in',
      });
    }
  }
);

/* =========================================================
   GET /api/auth/me
========================================================= */

router.get(
  '/me',
  requireAuth,
  async (
    req: AuthRequest,
    res
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message:
            'Authentication required',
        });
      }

      /*
       * Return the authenticated user's
       * current JWT information.
       *
       * Expected fields:
       * id
       * name
       * email
       * department
       * employeeId
       * role
       * adminType
       */

      return res.status(200).json(
        req.user
      );

    } catch (error) {
      console.error(
        'Get current user error:',
        error
      );

      return res.status(500).json({
        message:
          'Could not load user',
      });
    }
  }
);

export default router;

